-- Baseline for an EMPTY test project. On existing Happy projects app_sync
-- already exists. This file intentionally fails if the table is present.
begin;
create table public.app_sync (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  app text not null check (app in ('day','meal','sport')),
  kind text not null check (kind ~ '^[a-z][a-z0-9_]{0,31}$'),
  v smallint not null default 1,
  iv text not null check (char_length(iv) between 16 and 24),
  data text not null check (char_length(data) <= 4000000),
  at bigint not null,
  updated_at timestamptz not null default now(),
  primary key (user_id,app,kind)
);
create function public.app_sync_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.app_sync_touch() from public, anon, authenticated;
create trigger app_sync_touch before update on public.app_sync
for each row execute function public.app_sync_touch();
alter table public.app_sync enable row level security;
revoke all on public.app_sync from public, anon, authenticated;
grant select,insert,update,delete on public.app_sync to authenticated;
create policy own_documents on public.app_sync for all to authenticated
  using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
commit;
