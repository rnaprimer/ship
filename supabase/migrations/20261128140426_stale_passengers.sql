-- Stale passengers (owner decision 2026-11-28): the passenger list says
-- whether each passenger has been on the ship recently. Players who are
-- playing refresh last_seen_at at least every few minutes (session use and
-- position saves), so anyone not seen for 10 minutes is shown as stale:
-- standing still with a "stale" tag. Active passengers come first.
drop function public.sample_passengers(text, uuid, int);
create function public.sample_passengers(p_ship_id text, p_exclude_player uuid, p_limit int)
returns table (username text, character_variant smallint, crew_role smallint, outfit_color smallint, hat smallint, active boolean)
language sql volatile set search_path = '' as $$
  select p.username, p.character_variant, p.crew_role, p.outfit_color, p.hat,
         coalesce(p.last_seen_at > now() - interval '10 minutes', false) as active
  from public.players p
  where p.ship_id = p_ship_id and p.status = 'active' and p.id is distinct from p_exclude_player
  order by active desc, random()
  limit least(greatest(p_limit, 0), 30)
$$;

revoke all on function public.sample_passengers(text, uuid, int) from public, anon, authenticated;
grant execute on function public.sample_passengers(text, uuid, int) to service_role;
