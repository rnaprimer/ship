-- Milestone 6: several maps (First Deck, Grand Lobby, Personal Cabin, Swimming
-- Pool, Secret Deck, Second Deck). Players switch maps from the ship's location
-- picker, which drops them at the new map's spawn point. A save on a different
-- map than the last one must therefore be within walking distance of that
-- map's spawn, so map hops can't be used to teleport anywhere.
--
-- This adds an overload (with p_spawn_x / p_spawn_y) and leaves the old
-- nine-argument version for the currently deployed app; a later migration
-- drops it once this release is live.

create function public.save_position(
  p_player_id uuid,
  p_map_id text,
  p_map_version int,
  p_x real,
  p_y real,
  p_direction text,
  p_spawn_x real,
  p_spawn_y real,
  p_max_speed real,
  p_slack real,
  p_min_interval_ms int
)
returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_pos public.player_positions%rowtype;
  v_elapsed double precision;
  v_reach double precision;
begin
  select * into v_pos from public.player_positions where player_id = p_player_id for update;
  if found then
    v_elapsed := extract(epoch from (now() - v_pos.last_saved_at));
    if v_elapsed * 1000 < p_min_interval_ms then return 'TOO_SOON'; end if;
    v_reach := p_max_speed * v_elapsed + p_slack;
    if v_pos.map_id <> p_map_id then
      -- Arrived through the location picker: must have walked from the spawn.
      if sqrt(power(p_x - p_spawn_x, 2) + power(p_y - p_spawn_y, 2)) > v_reach then
        return 'TOO_FAST';
      end if;
    -- Same map and version: no faster than walking. After a map update any walkable spot is fine.
    elsif v_pos.map_version = p_map_version
       and sqrt(power(p_x - v_pos.x, 2) + power(p_y - v_pos.y, 2)) > v_reach then
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

revoke all on function public.save_position(uuid, text, int, real, real, text, real, real, real, real, int) from public, anon, authenticated;
grant execute on function public.save_position(uuid, text, int, real, real, text, real, real, real, real, int) to service_role;
