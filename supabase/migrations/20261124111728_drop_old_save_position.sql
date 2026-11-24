-- Milestone 6 is live and calls save_position with spawn arguments; drop the
-- pre-multi-map overload, which didn't check map hops against the spawn.
drop function if exists public.save_position(uuid, text, int, real, real, text, real, real, int);
