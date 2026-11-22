-- Milestone 3: OpenReply reports whether the boarding-code DM went out.
-- Status never downgrades: delivered > unconfirmed > failed > pending, so a
-- later failed re-send (e.g. to another comment) can't hide an earlier delivery.
create function public.record_invite_delivery(
  p_ship_id text,
  p_invitation_id uuid,
  p_outcome text
)
returns boolean
language plpgsql volatile set search_path = '' as $$
declare
  v_current text;
  v_rank_new int;
  v_rank_old int;
begin
  if p_outcome not in ('delivered', 'unconfirmed', 'failed') then
    raise exception 'record_invite_delivery: bad outcome' using errcode = '22023';
  end if;

  select delivery_status into v_current
  from public.boarding_invites
  where id = p_invitation_id and ship_id = p_ship_id
  for update;
  if not found then return false; end if;

  v_rank_new := case p_outcome when 'delivered' then 3 when 'unconfirmed' then 2 else 1 end;
  v_rank_old := case v_current when 'delivered' then 3 when 'unconfirmed' then 2 when 'failed' then 1 else 0 end;

  update public.boarding_invites
    set delivery_attempts = delivery_attempts + 1,
        delivery_status = case when v_rank_new >= v_rank_old then p_outcome else delivery_status end,
        updated_at = now()
    where id = p_invitation_id;
  return true;
end;
$$;

revoke all on function public.record_invite_delivery(text, uuid, text) from public, anon, authenticated;
grant execute on function public.record_invite_delivery(text, uuid, text) to service_role;
