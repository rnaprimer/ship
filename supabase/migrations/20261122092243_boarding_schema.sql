-- Milestone 2: boarding schema (PLAN.md §C).
--
-- Security model:
--   * RLS is enabled on every table with NO policies, and anon/authenticated
--     have no table or function privileges. Only the server (service role /
--     secret key) can read or write, and only from server code.
--   * All redemption / issuance logic runs inside these functions, each a
--     single transaction. Hashes are passed in as lowercase hex text.
--   * Plaintext boarding codes and session tokens never reach the database:
--     codes arrive as HMAC-SHA256(pepper, code), sessions as SHA-256(token).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.ships (
  id text primary key,
  name text not null,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  ship_id text not null references public.ships on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  username_normalized text not null,
  character_variant smallint not null check (character_variant between 0 and 5),
  status text not null default 'active' check (status in ('active', 'disabled')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz,
  unique (ship_id, username_normalized),
  check (username_normalized = lower(username))
);

create table public.boarding_invites (
  id uuid primary key default gen_random_uuid(),
  ship_id text not null references public.ships on delete cascade,
  instagram_account_id text not null,
  instagram_user_id text not null,      -- app-scoped IGSID: always pair with the account
  instagram_comment_id text not null,
  instagram_media_id text not null,
  code_hash bytea not null unique,      -- HMAC-SHA256(pepper, normalized code)
  code_ciphertext bytea,                -- AES-GCM; NULL once redeemed/expired/revoked
  status text not null default 'active' check (status in ('active', 'redeemed', 'expired', 'revoked')),
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'delivered', 'unconfirmed', 'failed')),
  delivery_attempts int not null default 0,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  player_id uuid unique references public.players,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instagram_account_id, instagram_comment_id),
  check ((status = 'redeemed') = (player_id is not null and redeemed_at is not null)),
  check (status = 'active' or code_ciphertext is null)
);
create unique index one_active_invite on public.boarding_invites (ship_id, instagram_account_id, instagram_user_id)
  where status = 'active';
create unique index one_player_per_commenter on public.boarding_invites (ship_id, instagram_account_id, instagram_user_id)
  where status = 'redeemed';

create table public.player_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index player_sessions_player_id_idx on public.player_sessions (player_id);

create table public.player_positions (
  player_id uuid primary key references public.players on delete cascade,
  map_id text not null,
  map_version int not null,
  x real not null,
  y real not null,
  direction text not null check (direction in ('up', 'down', 'left', 'right')),
  last_saved_at timestamptz not null default now()
);

create table public.processed_events (
  id bigserial primary key,
  source text not null,
  external_event_id text not null,
  processing_status text not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (source, external_event_id)
);

create table public.rate_limits (
  key text not null,                    -- e.g. '<ship>:ip_fail:<hmac(ip)>' or '<ship>:global:redeem_fail'
  window_start timestamptz not null,
  count int not null,
  primary key (key, window_start)
);

insert into public.ships (id, name) values ('main', 'The Internet Ship');

-- ---------------------------------------------------------------------------
-- Lock down: RLS on, no policies, no grants for client roles.
-- ---------------------------------------------------------------------------

alter table public.ships enable row level security;
alter table public.players enable row level security;
alter table public.boarding_invites enable row level security;
alter table public.player_sessions enable row level security;
alter table public.player_positions enable row level security;
alter table public.processed_events enable row level security;
alter table public.rate_limits enable row level security;

revoke all on public.ships, public.players, public.boarding_invites, public.player_sessions,
  public.player_positions, public.processed_events, public.rate_limits from anon, authenticated;
revoke all on sequence public.processed_events_id_seq from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- True for a 32-byte value encoded as 64 lowercase hex chars.
create function public.is_hex32(p text) returns boolean
language sql immutable set search_path = '' as $$
  select p is not null and p ~ '^[0-9a-f]{64}$'
$$;

-- ---------------------------------------------------------------------------
-- check_invite: read-only status of a code. Never consumes it.
-- ---------------------------------------------------------------------------

create function public.check_invite(p_ship_id text, p_code_hash text)
returns text
language plpgsql stable set search_path = '' as $$
declare
  v_ship_status text;
  v_status text;
  v_expires timestamptz;
begin
  if not public.is_hex32(p_code_hash) then
    return 'INVALID';
  end if;
  select status into v_ship_status from public.ships where id = p_ship_id;
  if v_ship_status is null then return 'INVALID'; end if;
  if v_ship_status <> 'active' then return 'PAUSED'; end if;

  select status, expires_at into v_status, v_expires
  from public.boarding_invites
  where code_hash = decode(p_code_hash, 'hex') and ship_id = p_ship_id;

  if not found then return 'INVALID'; end if;
  if v_status = 'redeemed' then return 'REDEEMED'; end if;
  if v_status = 'revoked' then return 'REVOKED'; end if;
  if v_status = 'expired' or v_expires <= now() then return 'EXPIRED'; end if;
  return 'VALID';
end;
$$;

-- ---------------------------------------------------------------------------
-- redeem_invite: atomically consume a code and create the player, session
-- and spawn position. Concurrent calls for one code serialize on FOR UPDATE.
-- Returns {status: 'OK', player_id, username, character_variant}
--      or {status: 'INVALID'|'REDEEMED'|'REVOKED'|'EXPIRED'|'PAUSED'|'USERNAME_TAKEN'}.
-- ---------------------------------------------------------------------------

create function public.redeem_invite(
  p_ship_id text,
  p_code_hash text,
  p_username text,
  p_character_variant smallint,
  p_session_hash text,
  p_session_expires timestamptz,
  p_map_id text,
  p_map_version int,
  p_spawn_x real,
  p_spawn_y real,
  p_spawn_direction text
)
returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_ship_status text;
  v_invite public.boarding_invites%rowtype;
  v_player_id uuid;
begin
  if not public.is_hex32(p_code_hash) or not public.is_hex32(p_session_hash) then
    return jsonb_build_object('status', 'INVALID');
  end if;

  select status into v_ship_status from public.ships where id = p_ship_id;
  if v_ship_status is null then return jsonb_build_object('status', 'INVALID'); end if;
  if v_ship_status <> 'active' then return jsonb_build_object('status', 'PAUSED'); end if;

  -- 1. Lock the invite row: a second concurrent redemption waits here.
  select * into v_invite
  from public.boarding_invites
  where code_hash = decode(p_code_hash, 'hex') and ship_id = p_ship_id
  for update;

  -- 2. Typed rejections.
  if not found then return jsonb_build_object('status', 'INVALID'); end if;
  if v_invite.status = 'redeemed' then return jsonb_build_object('status', 'REDEEMED'); end if;
  if v_invite.status = 'revoked' then return jsonb_build_object('status', 'REVOKED'); end if;
  if v_invite.status = 'expired' then return jsonb_build_object('status', 'EXPIRED'); end if;
  if v_invite.expires_at <= now() then
    update public.boarding_invites
      set status = 'expired', code_ciphertext = null, updated_at = now()
      where id = v_invite.id;
    return jsonb_build_object('status', 'EXPIRED');
  end if;

  -- 3. Create the player. A taken username rolls back only this block, so
  --    the code stays unused and can be retried with another name.
  begin
    insert into public.players (ship_id, username, username_normalized, character_variant)
    values (p_ship_id, p_username, lower(p_username), p_character_variant)
    returning id into v_player_id;
  exception when unique_violation then
    return jsonb_build_object('status', 'USERNAME_TAKEN');
  end;

  -- 4. Consume the code permanently and drop the recoverable ciphertext.
  update public.boarding_invites
    set status = 'redeemed', player_id = v_player_id, redeemed_at = now(),
        code_ciphertext = null, updated_at = now()
    where id = v_invite.id;

  -- 5. Session (hash only) and spawn position.
  insert into public.player_sessions (player_id, token_hash, expires_at)
  values (v_player_id, decode(p_session_hash, 'hex'), p_session_expires);

  insert into public.player_positions (player_id, map_id, map_version, x, y, direction)
  values (v_player_id, p_map_id, p_map_version, p_spawn_x, p_spawn_y, p_spawn_direction);

  return jsonb_build_object(
    'status', 'OK',
    'player_id', v_player_id,
    'username', p_username,
    'character_variant', p_character_variant
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- issue_invite: one invitation per comment, one active invite and at most
-- one player per commenter per ship. Idempotent on the comment ID.
-- Returns {status: 'issued'|'existing'|'active_elsewhere'|'already_boarded'|'paused'|'comment_used', ...}.
-- 'existing' and 'active_elsewhere' include the stored ciphertext (hex) so the
-- caller can re-send the same code; 'issued' does not (the caller has it).
-- ---------------------------------------------------------------------------

create function public.issue_invite(
  p_ship_id text,
  p_instagram_account_id text,
  p_instagram_user_id text,
  p_instagram_comment_id text,
  p_instagram_media_id text,
  p_code_hash text,
  p_code_ciphertext text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_ship_status text;
  v_invite public.boarding_invites%rowtype;
  v_id uuid;
begin
  if not public.is_hex32(p_code_hash) or p_code_ciphertext is null or p_code_ciphertext !~ '^[0-9a-f]+$' then
    raise exception 'issue_invite: malformed hash or ciphertext' using errcode = '22023';
  end if;

  -- Serialize all issuance for one commenter on one ship.
  perform pg_advisory_xact_lock(
    hashtextextended(p_ship_id || ':' || p_instagram_account_id || ':' || p_instagram_user_id, 0)
  );

  select status into v_ship_status from public.ships where id = p_ship_id;
  if v_ship_status is null then
    raise exception 'issue_invite: unknown ship' using errcode = '22023';
  end if;
  if v_ship_status <> 'active' then return jsonb_build_object('status', 'paused'); end if;

  -- Expire this commenter's stale active invites first.
  update public.boarding_invites
    set status = 'expired', code_ciphertext = null, updated_at = now()
    where ship_id = p_ship_id
      and instagram_account_id = p_instagram_account_id
      and instagram_user_id = p_instagram_user_id
      and status = 'active'
      and expires_at <= now();

  -- Same comment processed again (retry): return what it already produced.
  select * into v_invite
  from public.boarding_invites
  where instagram_account_id = p_instagram_account_id and instagram_comment_id = p_instagram_comment_id;
  if found then
    if v_invite.status = 'active' then
      return jsonb_build_object('status', 'existing', 'invitation_id', v_invite.id,
        'code_ciphertext', encode(v_invite.code_ciphertext, 'hex'), 'expires_at', v_invite.expires_at);
    elsif v_invite.status = 'redeemed' then
      return jsonb_build_object('status', 'already_boarded');
    else
      return jsonb_build_object('status', 'comment_used');
    end if;
  end if;

  if exists (
    select 1 from public.boarding_invites
    where ship_id = p_ship_id and instagram_account_id = p_instagram_account_id
      and instagram_user_id = p_instagram_user_id and status = 'redeemed'
  ) then
    return jsonb_build_object('status', 'already_boarded');
  end if;

  select * into v_invite
  from public.boarding_invites
  where ship_id = p_ship_id and instagram_account_id = p_instagram_account_id
    and instagram_user_id = p_instagram_user_id and status = 'active';
  if found then
    return jsonb_build_object('status', 'active_elsewhere', 'invitation_id', v_invite.id,
      'code_ciphertext', encode(v_invite.code_ciphertext, 'hex'), 'expires_at', v_invite.expires_at);
  end if;

  insert into public.boarding_invites (
    ship_id, instagram_account_id, instagram_user_id, instagram_comment_id, instagram_media_id,
    code_hash, code_ciphertext, expires_at)
  values (
    p_ship_id, p_instagram_account_id, p_instagram_user_id, p_instagram_comment_id, p_instagram_media_id,
    decode(p_code_hash, 'hex'), decode(p_code_ciphertext, 'hex'), p_expires_at)
  returning id into v_id;

  return jsonb_build_object('status', 'issued', 'invitation_id', v_id, 'expires_at', p_expires_at);
end;
$$;

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------

-- Looks up a live session for an active player. Extends expiry (rolling
-- renewal) when it is older than p_renew_before. Returns null if invalid.
create function public.touch_session(
  p_token_hash text,
  p_renew_before timestamptz,
  p_new_expires timestamptz
)
returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_session_id uuid;
  v_expires timestamptz;
  v_last_used timestamptz;
  v_player public.players%rowtype;
  v_pos public.player_positions%rowtype;
  v_renewed boolean := false;
begin
  if not public.is_hex32(p_token_hash) then return null; end if;

  select s.id, s.expires_at, s.last_used_at into v_session_id, v_expires, v_last_used
  from public.player_sessions s
  where s.token_hash = decode(p_token_hash, 'hex') and s.revoked_at is null and s.expires_at > now();
  if not found then return null; end if;

  select p.* into v_player
  from public.players p join public.player_sessions s on s.player_id = p.id
  where s.id = v_session_id;
  if v_player.status <> 'active' then return null; end if;

  if v_expires < p_renew_before then
    v_renewed := true;
    v_expires := p_new_expires;
  end if;
  if v_renewed or v_last_used is null or v_last_used < now() - interval '5 minutes' then
    update public.player_sessions set expires_at = v_expires, last_used_at = now() where id = v_session_id;
    update public.players set last_seen_at = now() where id = v_player.id;
  end if;

  select * into v_pos from public.player_positions where player_id = v_player.id;

  return jsonb_build_object(
    'player_id', v_player.id,
    'ship_id', v_player.ship_id,
    'username', v_player.username,
    'character_variant', v_player.character_variant,
    'renewed', v_renewed,
    'expires_at', v_expires,
    'position', case when v_pos.player_id is null then null else jsonb_build_object(
      'map_id', v_pos.map_id, 'map_version', v_pos.map_version,
      'x', v_pos.x, 'y', v_pos.y, 'direction', v_pos.direction) end
  );
end;
$$;

create function public.revoke_session(p_token_hash text)
returns void
language sql volatile set search_path = '' as $$
  update public.player_sessions set revoked_at = now()
  where token_hash = decode(p_token_hash, 'hex') and revoked_at is null and public.is_hex32(p_token_hash);
$$;

-- ---------------------------------------------------------------------------
-- save_position: the player id comes from the server-side session, never the
-- client. Walkability is checked in the app (walkable.json); here we enforce
-- a minimum interval and a speed limit against the last saved position.
-- Returns 'OK' | 'TOO_SOON' | 'TOO_FAST'.
-- ---------------------------------------------------------------------------

create function public.save_position(
  p_player_id uuid,
  p_map_id text,
  p_map_version int,
  p_x real,
  p_y real,
  p_direction text,
  p_max_speed real,
  p_slack real,
  p_min_interval_ms int
)
returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_pos public.player_positions%rowtype;
  v_elapsed double precision;
begin
  select * into v_pos from public.player_positions where player_id = p_player_id for update;
  if found then
    v_elapsed := extract(epoch from (now() - v_pos.last_saved_at));
    if v_elapsed * 1000 < p_min_interval_ms then return 'TOO_SOON'; end if;
    -- Only compare positions on the same map version; after a map update any walkable spot is fine.
    if v_pos.map_id = p_map_id and v_pos.map_version = p_map_version
       and sqrt(power(p_x - v_pos.x, 2) + power(p_y - v_pos.y, 2)) > p_max_speed * v_elapsed + p_slack then
      return 'TOO_FAST';
    end if;
    update public.player_positions
      set map_id = p_map_id, map_version = p_map_version, x = p_x, y = p_y,
          direction = p_direction, last_saved_at = now()
      where player_id = p_player_id;
  else
    insert into public.player_positions (player_id, map_id, map_version, x, y, direction)
    values (p_player_id, p_map_id, p_map_version, p_x, p_y, p_direction);
  end if;
  return 'OK';
end;
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting (fixed windows).
-- ---------------------------------------------------------------------------

-- Counts one hit and returns true while the window's count is within the limit.
create function public.rate_limit_hit(p_key text, p_window_seconds int, p_limit int)
returns boolean
language plpgsql volatile set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into public.rate_limits (key, window_start, count) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;
  -- Opportunistic cleanup of old windows.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_count <= p_limit;
end;
$$;

-- Current count in the window, without counting a hit.
create function public.rate_limit_count(p_key text, p_window_seconds int)
returns int
language sql stable set search_path = '' as $$
  select coalesce((
    select count from public.rate_limits
    where key = p_key
      and window_start = to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds)
  ), 0)
$$;

-- ---------------------------------------------------------------------------
-- Public, sanitized reads (still only callable by the server).
-- ---------------------------------------------------------------------------

create function public.sample_passengers(p_ship_id text, p_exclude_player uuid, p_limit int)
returns table (username text, character_variant smallint)
language sql volatile set search_path = '' as $$
  select p.username, p.character_variant
  from public.players p
  where p.ship_id = p_ship_id and p.status = 'active' and p.id is distinct from p_exclude_player
  order by random()
  limit least(greatest(p_limit, 0), 30)
$$;

create function public.passenger_count(p_ship_id text)
returns bigint
language sql stable set search_path = '' as $$
  select count(*) from public.players where ship_id = p_ship_id and status = 'active'
$$;

-- ---------------------------------------------------------------------------
-- Function privileges: server role only.
-- ---------------------------------------------------------------------------

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.is_hex32(text)',
    'public.check_invite(text, text)',
    'public.redeem_invite(text, text, text, smallint, text, timestamptz, text, int, real, real, text)',
    'public.issue_invite(text, text, text, text, text, text, text, timestamptz)',
    'public.touch_session(text, timestamptz, timestamptz)',
    'public.revoke_session(text)',
    'public.save_position(uuid, text, int, real, real, text, real, real, int)',
    'public.rate_limit_hit(text, int, int)',
    'public.rate_limit_count(text, int)',
    'public.sample_passengers(text, uuid, int)',
    'public.passenger_count(text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$$;
