-- The public RPC runs as the caller. Only its fixed, private operation has
-- permission to delete Auth users. Browser roles cannot read the private schema.
begin;
create or replace function happy_private.delete_my_account(p_expected_uid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  session_id uuid := nullif(auth.jwt()->>'session_id','')::uuid;
begin
  if owner_id is null or session_id is null or owner_id is distinct from p_expected_uid then
    raise exception using errcode='42501', message='Confirmed account does not match the session';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,497299));
  -- A retry with the same signed token can confirm a committed deletion after
  -- the initial HTTP response is lost. It cannot act on a newly registered UID.
  perform 1 from auth.users u where u.id=owner_id for update;
  if found then
    perform 1 from auth.sessions s where s.id=session_id and s.user_id=owner_id
      and (s.not_after is null or s.not_after>clock_timestamp()) for share;
    if not found then
      raise exception using errcode='42501', message='Active session required';
    end if;
    -- Supabase keeps pending PKCE flows outside the user foreign-key cascade.
    delete from auth.flow_state f where f.user_id=owner_id;
    delete from auth.users u where u.id=owner_id;
  end if;
  -- FK cascades removed the owner's app_sync documents of every version,
  -- wrapped data key, identities and sessions in this same transaction.
  return jsonb_build_object('deleted',true,'uid',owner_id);
end;
$$;
revoke all on function happy_private.delete_my_account(uuid) from public, anon, authenticated, service_role;
grant execute on function happy_private.delete_my_account(uuid) to authenticated;

create or replace function public.happy_delete_my_account(p_expected_uid uuid)
returns jsonb language sql security invoker set search_path = ''
begin atomic
  select happy_private.delete_my_account(p_expected_uid);
end;
revoke all on function public.happy_delete_my_account(uuid) from public, anon, authenticated, service_role;
grant execute on function public.happy_delete_my_account(uuid) to authenticated;
commit;
