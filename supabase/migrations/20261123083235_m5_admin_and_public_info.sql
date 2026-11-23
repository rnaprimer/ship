-- Milestone 5: public ship info for the landing page, and the admin panel.
-- Same security model as before: RLS on, no client-role grants, functions
-- executable by the server role only. Admin functions never return
-- Instagram identifiers or code material.

create table public.admin_audit (
  id bigserial primary key,
  ship_id text not null references public.ships on delete cascade,
  actor_email text not null,
  action text not null,
  target text,
  created_at timestamptz not null default now()
);
create index admin_audit_ship_created_idx on public.admin_audit (ship_id, created_at desc);
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;
revoke all on sequence public.admin_audit_id_seq from anon, authenticated;

-- Landing page: name, whether boarding is open, passengers aboard.
create function public.ship_public_info(p_ship_id text)
returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'name', s.name,
    'boarding_open', s.status = 'active',
    'passengers', (select count(*) from public.players p where p.ship_id = s.id and p.status = 'active')
  )
  from public.ships s where s.id = p_ship_id
$$;

create function public.admin_overview(p_ship_id text)
returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'ship_status', (select status from public.ships where id = p_ship_id),
    'players_active', (select count(*) from public.players where ship_id = p_ship_id and status = 'active'),
    'players_disabled', (select count(*) from public.players where ship_id = p_ship_id and status = 'disabled'),
    'invites_active', (select count(*) from public.boarding_invites where ship_id = p_ship_id and status = 'active' and expires_at > now()),
    'invites_redeemed', (select count(*) from public.boarding_invites where ship_id = p_ship_id and status = 'redeemed'),
    'invites_expired', (select count(*) from public.boarding_invites where ship_id = p_ship_id
                          and (status = 'expired' or (status = 'active' and expires_at <= now()))),
    'invites_revoked', (select count(*) from public.boarding_invites where ship_id = p_ship_id and status = 'revoked'),
    'delivery_failed', (select count(*) from public.boarding_invites where ship_id = p_ship_id and delivery_status = 'failed'),
    'delivery_unconfirmed', (select count(*) from public.boarding_invites where ship_id = p_ship_id and delivery_status = 'unconfirmed'),
    'delivery_pending', (select count(*) from public.boarding_invites where ship_id = p_ship_id and delivery_status = 'pending' and status = 'active')
  )
$$;

create function public.admin_list_invites(p_ship_id text, p_filter text, p_limit int)
returns table (
  id uuid, status text, delivery_status text, delivery_attempts int,
  created_at timestamptz, expires_at timestamptz, redeemed_at timestamptz, username text
)
language sql stable set search_path = '' as $$
  select i.id,
         case when i.status = 'active' and i.expires_at <= now() then 'expired' else i.status end,
         i.delivery_status, i.delivery_attempts, i.created_at, i.expires_at, i.redeemed_at, p.username
  from public.boarding_invites i
  left join public.players p on p.id = i.player_id
  where i.ship_id = p_ship_id
    and (
      p_filter = 'all'
      or (p_filter = 'active' and i.status = 'active' and i.expires_at > now())
      or (p_filter = 'expired' and (i.status = 'expired' or (i.status = 'active' and i.expires_at <= now())))
      or (p_filter in ('redeemed', 'revoked') and i.status = p_filter)
      or (p_filter = 'delivery_problems' and i.delivery_status in ('failed', 'unconfirmed'))
    )
  order by i.created_at desc
  limit least(greatest(p_limit, 1), 200)
$$;

create function public.admin_search_players(p_ship_id text, p_query text, p_limit int)
returns table (
  id uuid, username text, status text, character_variant smallint,
  joined_at timestamptz, last_seen_at timestamptz
)
language sql stable set search_path = '' as $$
  select p.id, p.username, p.status, p.character_variant, p.joined_at, p.last_seen_at
  from public.players p
  where p.ship_id = p_ship_id
    and (coalesce(p_query, '') = ''
         or p.username_normalized like '%' || replace(replace(replace(lower(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%')
  order by p.joined_at desc
  limit least(greatest(p_limit, 1), 200)
$$;

-- Disable (or re-enable) a player. Disabling also revokes every session, so
-- they are signed out at once, and hides them from the passenger list.
create function public.admin_set_player_status(p_ship_id text, p_player_id uuid, p_status text, p_actor text)
returns boolean
language plpgsql volatile set search_path = '' as $$
declare v_username text;
begin
  if p_status not in ('active', 'disabled') then
    raise exception 'admin_set_player_status: bad status' using errcode = '22023';
  end if;
  update public.players set status = p_status
    where id = p_player_id and ship_id = p_ship_id
    returning username into v_username;
  if not found then return false; end if;
  if p_status = 'disabled' then
    update public.player_sessions set revoked_at = now()
      where player_id = p_player_id and revoked_at is null;
  end if;
  insert into public.admin_audit (ship_id, actor_email, action, target)
    values (p_ship_id, p_actor, 'player_' || p_status, v_username);
  return true;
end;
$$;

-- Revoke an unused invitation: it can never be redeemed or re-sent.
create function public.admin_revoke_invite(p_ship_id text, p_invitation_id uuid, p_actor text)
returns text
language plpgsql volatile set search_path = '' as $$
declare v_status text;
begin
  select status into v_status from public.boarding_invites
    where id = p_invitation_id and ship_id = p_ship_id for update;
  if not found then return 'NOT_FOUND'; end if;
  if v_status <> 'active' then return 'NOT_ACTIVE'; end if;
  update public.boarding_invites
    set status = 'revoked', code_ciphertext = null, updated_at = now()
    where id = p_invitation_id;
  insert into public.admin_audit (ship_id, actor_email, action, target)
    values (p_ship_id, p_actor, 'invite_revoked', p_invitation_id::text);
  return 'REVOKED';
end;
$$;

-- Pause or resume boarding (issue and redeem both refuse while paused).
create function public.admin_set_ship_status(p_ship_id text, p_status text, p_actor text)
returns boolean
language plpgsql volatile set search_path = '' as $$
begin
  if p_status not in ('active', 'paused') then
    raise exception 'admin_set_ship_status: bad status' using errcode = '22023';
  end if;
  update public.ships set status = p_status, updated_at = now() where id = p_ship_id;
  if not found then return false; end if;
  insert into public.admin_audit (ship_id, actor_email, action, target)
    values (p_ship_id, p_actor, 'boarding_' || case p_status when 'active' then 'resumed' else 'paused' end, p_ship_id);
  return true;
end;
$$;

create function public.admin_recent_audit(p_ship_id text, p_limit int)
returns table (actor_email text, action text, target text, created_at timestamptz)
language sql stable set search_path = '' as $$
  select actor_email, action, target, created_at from public.admin_audit
  where ship_id = p_ship_id order by created_at desc limit least(greatest(p_limit, 1), 100)
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.ship_public_info(text)',
    'public.admin_overview(text)',
    'public.admin_list_invites(text, text, int)',
    'public.admin_search_players(text, text, int)',
    'public.admin_set_player_status(text, uuid, text, text)',
    'public.admin_revoke_invite(text, uuid, text)',
    'public.admin_set_ship_status(text, text, text)',
    'public.admin_recent_audit(text, int)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$$;
