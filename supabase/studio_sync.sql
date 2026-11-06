-- Happy studios cloud documents (Color Studio, later Icon Studio).
-- Applied to Supabase project "happyday" (geqziziycpclhnucnsyx) on 06.11.2026
-- as migration "studio_sync_for_studios".
-- Separate from public.app_sync: Day, Meal and Sport data are not stored here,
-- and nothing in this table is read by those apps.

create table public.studio_sync (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  studio text not null check (studio in ('color', 'icon')),
  kind text not null check (kind ~ '^[a-z][a-z0-9_]{0,31}$'),
  rev integer not null default 1 check (rev >= 1),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 3000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, studio, kind)
);

comment on table public.studio_sync is
  'Документы студий Happy (Color Studio, Icon Studio): сохранённые темы и проекты. Отдельно от app_sync: данные Day, Meal и Sport здесь не хранятся. rev растёт на 1 при каждой записи (условная запись).';

alter table public.studio_sync enable row level security;

create policy studio_sync_select_own on public.studio_sync
  for select to authenticated using ((select auth.uid()) = user_id);
create policy studio_sync_insert_own on public.studio_sync
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy studio_sync_update_own on public.studio_sync
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy studio_sync_delete_own on public.studio_sync
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Only own-row read/write through the API; TRUNCATE and the rest would bypass RLS.
revoke all on table public.studio_sync from anon, authenticated;
grant select, insert, update, delete on table public.studio_sync to authenticated;
