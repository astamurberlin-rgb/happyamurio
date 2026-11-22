-- Install after the Vault master and wrap_version constraint are in place.
-- Repeatable RPC upgrade. Existing keys, document versions and sessions are retained.
begin;
create or replace function public.happy_vault_account_key(p_user uuid, p_session uuid, p_action text,
                                               p_ciphertext text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  entry jsonb;
  action text := p_action;
  master bytea;
  wrapping_key bytea;
  provider constant text := 'supabase-vault:happy_account_wrap_master_v1';
begin
  -- Reuse the session check, single owner lock, opt-in and migration fence.
  if action = 'begin_empty' then
    -- First acquire the same owner lock as every app_sync writer, validating
    -- the live session before inspecting its documents. This executes again
    -- when the candidate envelope arrives after the initial read.
    perform public.happy_account_key(p_user,p_session,'open');
    if exists (select 1 from public.app_sync where user_id=p_user and v=2) then
      raise exception using errcode='HAP07', message='Legacy key verification required';
    end if;
    action := 'begin';
  end if;
  entry := public.happy_account_key(p_user,p_session,action);
  if entry->>'state' = 'legacy' then return entry; end if;
  if entry->>'state' = 'provision' and p_ciphertext is not null then
    if length(p_ciphertext) <> 80 or p_ciphertext !~ '^[A-Za-z0-9+/]{80}$' then
      raise exception using errcode='22023', message='Invalid key envelope';
    end if;
    entry := public.happy_account_key(p_user,p_session,action,p_ciphertext,provider);
    -- Includes 'new' rows made before the Vault test was installed. The
    -- original provision and version stamp commit together under the same lock.
    update happy_private.account_keys set wrap_version=2 where user_id=p_user;
    entry := entry || jsonb_build_object('wrapVersion',2);
  end if;
  if entry->>'state' <> 'provision' and
     (entry->>'kmsKeyId' is distinct from provider or entry->>'wrapVersion' is distinct from '2') then
    raise exception using errcode='HAP06', message='Different key storage provider';
  end if;
  select decode(s.decrypted_secret,'base64') into strict master
    from vault.decrypted_secrets s where s.name = 'happy_account_wrap_master_v1';
  if octet_length(master) <> 32 then raise exception 'Invalid account key configuration'; end if;
  wrapping_key := extensions.hmac(convert_to('happy/account-key/wrap-v2/dek-v2/'||p_user::text,'UTF8'),
                                  master,'sha256');
  return entry || jsonb_build_object('wrappingKey',encode(wrapping_key,'base64'));
end;
$$;
revoke all on function public.happy_vault_account_key(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.happy_vault_account_key(uuid,uuid,text,text) to service_role;
-- The Edge Function uses the Vault RPC exclusively. The original helper is
-- still called by the owner of the SECURITY DEFINER function above.
revoke execute on function public.happy_account_key(uuid,uuid,text,text,text) from service_role;
commit;
