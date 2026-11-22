-- One-time setup after account_key.sql. Keep the existing master on projects
-- already running the Vault broker. Install/update account_key_vault_api.sql separately.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Created server-side and encrypted by Vault in this transaction. A duplicate
-- name is an error. Never replace the master when redeploying the function.
do $$
begin
  -- Changing providers must keep existing DEKs recoverable. The previous
  -- provider needs a separate rewrap plan if it has ever enrolled an account.
  if exists (select 1 from happy_private.account_keys where ciphertext is not null) then
    raise exception using errcode='HAP06', message='Existing account keys require their original provider';
  end if;
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'base64'),
    'happy_account_wrap_master_v1','Private Happy account key encryption');
end;
$$;

alter table happy_private.account_keys drop constraint account_keys_wrap_version_check;
alter table happy_private.account_keys add constraint account_keys_wrap_version_check
  check (wrap_version in (1,2));

commit;
