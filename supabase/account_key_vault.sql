-- Private test Supabase only, after account_key.sql. Supabase Vault must be enabled.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Created server-side and encrypted by Vault in this transaction. A duplicate
-- name is an error. Never replace the master when redeploying the function.
do $$
begin
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'base64'),
    'happy_account_wrap_master_v1','Private Happy account key encryption');
end;
$$;

alter table happy_private.account_keys drop constraint account_keys_wrap_version_check;
alter table happy_private.account_keys add constraint account_keys_wrap_version_check
  check (wrap_version in (1,2));

create function public.happy_vault_account_key(p_user uuid, p_session uuid, p_action text,
                                               p_ciphertext text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  entry jsonb;
  master bytea;
  wrapping_key bytea;
  provider constant text := 'supabase-vault:happy_account_wrap_master_v1';
begin
  -- Reuse the session check, single owner lock, opt-in and migration fence.
  entry := public.happy_account_key(p_user,p_session,p_action);
  if entry->>'state' = 'legacy' then return entry; end if;
  if entry->>'state' = 'provision' and p_ciphertext is not null then
    if length(p_ciphertext) <> 80 or p_ciphertext !~ '^[A-Za-z0-9+/]{80}$' then
      raise exception using errcode='22023', message='Invalid key envelope';
    end if;
    entry := public.happy_account_key(p_user,p_session,p_action,p_ciphertext,provider);
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
-- The staging Edge uses the Vault RPC exclusively. The original helper is
-- still called by the owner of the SECURITY DEFINER function above.
revoke execute on function public.happy_account_key(uuid,uuid,text,text,text) from service_role;
commit;
