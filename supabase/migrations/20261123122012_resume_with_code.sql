-- Owner decision (2026-11-23): a redeemed boarding code also works as that
-- player's sign-in key, so they can get back aboard on any browser or device.
-- It never creates a second player. Only the code's HMAC is stored, as before.
--
-- Returns {status: 'OK', username, character_variant}
--      or {status: 'INVALID'|'NOT_BOARDED'|'DISABLED'}.
--   NOT_BOARDED: the code is valid but unused (or expired/revoked before use),
--   so there is no character to return to; the caller should use redeem.
create function public.resume_with_code(
  p_ship_id text,
  p_code_hash text,
  p_session_hash text,
  p_session_expires timestamptz
)
returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_status text;
  v_player public.players%rowtype;
begin
  if not public.is_hex32(p_code_hash) or not public.is_hex32(p_session_hash) then
    return jsonb_build_object('status', 'INVALID');
  end if;

  select i.status into v_status
  from public.boarding_invites i
  where i.code_hash = decode(p_code_hash, 'hex') and i.ship_id = p_ship_id;
  if not found then return jsonb_build_object('status', 'INVALID'); end if;
  if v_status <> 'redeemed' then return jsonb_build_object('status', 'NOT_BOARDED'); end if;

  select p.* into v_player
  from public.players p
  join public.boarding_invites i on i.player_id = p.id
  where i.code_hash = decode(p_code_hash, 'hex') and i.ship_id = p_ship_id;
  if v_player.status <> 'active' then return jsonb_build_object('status', 'DISABLED'); end if;

  insert into public.player_sessions (player_id, token_hash, expires_at)
  values (v_player.id, decode(p_session_hash, 'hex'), p_session_expires);
  update public.players set last_seen_at = now() where id = v_player.id;

  return jsonb_build_object(
    'status', 'OK',
    'username', v_player.username,
    'character_variant', v_player.character_variant
  );
end;
$$;

revoke all on function public.resume_with_code(text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.resume_with_code(text, text, text, timestamptz) to service_role;
