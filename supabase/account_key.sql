-- Install as one transaction on a Happy project with Auth and public.app_sync.
begin;
-- Fail and retry the transaction if installing triggers would stall live writers.
set local lock_timeout = '2s';
create schema if not exists happy_private;
revoke all on schema happy_private from public, anon, authenticated;

create table happy_private.account_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state text not null check (state in ('new','migrating','active')),
  key_version integer not null default 2 check (key_version = 2),
  wrap_version integer not null default 1 check (wrap_version = 1),
  kms_key_id text,
  ciphertext text,
  consent_at timestamptz,
  check ((state = 'new' and ciphertext is null and kms_key_id is null)
      or (state <> 'new' and length(ciphertext) > 0 and length(kms_key_id) > 0
          and ciphertext is not null and kms_key_id is not null))
);
alter table happy_private.account_keys enable row level security;
revoke all on happy_private.account_keys from public, anon, authenticated;

-- Snapshot eligibility at creation. An old user's later metadata edits, linked
-- Google identity or empty cloud journal cannot silently opt them into escrow.
create function happy_private.mark_new_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_app_meta_data->>'provider' = 'google'
     or (new.raw_app_meta_data->>'provider' = 'email'
         and new.raw_user_meta_data->>'happy_key_mode' = 'managed-v1') then
    insert into happy_private.account_keys(user_id,state) values (new.id,'new');
  end if;
  return new;
end;
$$;
create trigger happy_key_new_account after insert on auth.users
for each row execute function happy_private.mark_new_account();

-- The archived v1 documents have separate names and older readers.
create function happy_private.archive_row(a text,k text,v integer) returns boolean
language sql immutable strict set search_path = '' as $$
  select v = 1 and (a,k) in (('day','journal'),('day','link'),('meal','journal'),
    ('meal','link'),('meal','counters'),('meal','supplements'),('sport','journal'),
    ('sport','link'),('sport','measurements'));
$$;

create function happy_private.guard_sync_key() returns trigger
language plpgsql security definer set search_path = '' as $$
declare current_state text;
begin
  if auth.uid() is not null and auth.uid() <> new.user_id then
    raise exception using errcode='42501', message='Owner mismatch';
  end if;
  if happy_private.archive_row(new.app,new.kind,new.v) then return new; end if;
  -- Serialize with begin/finish, including insertion into a previously empty account.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 497299));
  select state into current_state from happy_private.account_keys where user_id = new.user_id;
  if current_state in ('active','migrating') and new.v is distinct from 3 then
    raise exception using errcode='HAP01', message='Managed account key required';
  elsif new.v = 3 and (current_state is null or current_state = 'new') then
    raise exception using errcode='HAP02', message='Account key is not initialized';
  elsif current_state = 'new' and new.v is distinct from 3 then
    -- A previous release was first to write, using the password-derived key.
    delete from happy_private.account_keys where user_id = new.user_id;
  end if;
  return new;
end;
$$;
create trigger happy_sync_key before insert or update on public.app_sync
for each row execute function happy_private.guard_sync_key();

-- Only the Edge Function may call this RPC. The verified Auth user and the
-- signed JWT session_id both have to identify the same live session.
create function public.happy_account_key(p_user uuid, p_session uuid, p_action text,
    p_ciphertext text default null, p_kms_key_id text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare account happy_private.account_keys;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 497299));
  if not exists (select 1 from auth.sessions s where s.id = p_session and s.user_id = p_user
                 and (s.not_after is null or s.not_after > clock_timestamp())) then
    raise exception using errcode='HAP03', message='Session expired';
  end if;
  if p_action is null or p_action not in ('open','begin','finish') then
    raise exception using errcode='22023', message='Invalid action';
  end if;
  select * into account from happy_private.account_keys where user_id = p_user;
  if account.ciphertext is null then
    if p_action = 'finish' then raise exception using errcode='HAP04', message='Migration has not started'; end if;
    if account.state is null and p_action = 'open' then return jsonb_build_object('state','legacy'); end if;
    if exists (select 1 from public.app_sync d where d.user_id = p_user and d.v is distinct from 2
         and not coalesce(happy_private.archive_row(d.app,d.kind,d.v),false)) then
      raise exception using errcode='HAP05', message='Unsupported cloud document version';
    end if;
    if p_ciphertext is null then return jsonb_build_object('state','provision'); end if;
    insert into happy_private.account_keys(user_id,state,ciphertext,kms_key_id,consent_at)
      values(p_user, case when account.state='new' then 'active' else 'migrating' end,
             p_ciphertext,p_kms_key_id,case when p_action='begin' then now() end)
      on conflict(user_id) do update set state=excluded.state, ciphertext=excluded.ciphertext,
             kms_key_id=excluded.kms_key_id,consent_at=excluded.consent_at
      returning * into account;
  elsif p_action = 'finish' and account.state = 'migrating' then
    if exists (select 1 from public.app_sync d where d.user_id = p_user and d.v is distinct from 3
         and not coalesce(happy_private.archive_row(d.app,d.kind,d.v),false)) then
      raise exception using errcode='HAP04', message='Migration has pending documents';
    end if;
    update happy_private.account_keys set state='active' where user_id=p_user returning * into account;
  end if;
  return jsonb_build_object('state',account.state,'keyVersion',account.key_version,
    'wrapVersion',account.wrap_version,'ciphertext',account.ciphertext,'kmsKeyId',account.kms_key_id);
end;
$$;
revoke all on function public.happy_account_key(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.happy_account_key(uuid,uuid,text,text,text) to service_role;
revoke all on function happy_private.mark_new_account(), happy_private.archive_row(text,text,integer),
  happy_private.guard_sync_key() from public, anon, authenticated;
commit;
