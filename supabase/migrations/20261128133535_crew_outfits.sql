-- Crew outfits (owner decision 2026-11-28): a cosmetic crew role, outfit
-- colour and hat per passenger, visible to everyone. Ranges match
-- src/game/outfits.ts (ROLES 10, OUTFIT_COLORS 5, HATS 10).

alter table public.players
  add column crew_role smallint check (crew_role between 0 and 9),
  add column outfit_color smallint not null default 0 check (outfit_color between 0 and 4),
  add column hat smallint not null default 0 check (hat between 0 and 9);

-- Changes a player's look. The player id comes from the server's session
-- lookup, never from the request body.
-- Returns 'OK' | 'INVALID' | 'NOT_FOUND'.
create function public.set_outfit(
  p_player_id uuid,
  p_character_variant smallint,
  p_crew_role smallint,
  p_outfit_color smallint,
  p_hat smallint
)
returns text
language plpgsql volatile set search_path = '' as $$
begin
  if p_character_variant is null or p_character_variant not between 0 and 5
     or (p_crew_role is not null and p_crew_role not between 0 and 9)
     or p_outfit_color is null or p_outfit_color not between 0 and 4
     or p_hat is null or p_hat not between 0 and 9 then
    return 'INVALID';
  end if;

  update public.players
  set character_variant = p_character_variant,
      crew_role = p_crew_role,
      outfit_color = p_outfit_color,
      hat = p_hat
  where id = p_player_id and status = 'active';
  if not found then return 'NOT_FOUND'; end if;
  return 'OK';
end;
$$;

revoke all on function public.set_outfit(uuid, smallint, smallint, smallint, smallint) from public, anon, authenticated;
grant execute on function public.set_outfit(uuid, smallint, smallint, smallint, smallint) to service_role;

-- The session lookup now also returns the outfit.
create or replace function public.touch_session(
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
    'crew_role', v_player.crew_role,
    'outfit_color', v_player.outfit_color,
    'hat', v_player.hat,
    'renewed', v_renewed,
    'expires_at', v_expires,
    'position', case when v_pos.player_id is null then null else jsonb_build_object(
      'map_id', v_pos.map_id, 'map_version', v_pos.map_version,
      'x', v_pos.x, 'y', v_pos.y, 'direction', v_pos.direction) end
  );
end;
$$;

-- Other passengers' looks now include their outfit.
drop function public.sample_passengers(text, uuid, int);
create function public.sample_passengers(p_ship_id text, p_exclude_player uuid, p_limit int)
returns table (username text, character_variant smallint, crew_role smallint, outfit_color smallint, hat smallint)
language sql volatile set search_path = '' as $$
  select p.username, p.character_variant, p.crew_role, p.outfit_color, p.hat
  from public.players p
  where p.ship_id = p_ship_id and p.status = 'active' and p.id is distinct from p_exclude_player
  order by random()
  limit least(greatest(p_limit, 0), 30)
$$;

revoke all on function public.sample_passengers(text, uuid, int) from public, anon, authenticated;
grant execute on function public.sample_passengers(text, uuid, int) to service_role;
