-- migration: create protocol_user_settings
-- purpose: store per-employee preferences for the protokoly app.
--          first use case: pre-saved landlord signature so admins
--          do not have to draw it on every protocol.
-- affected tables: public.protocol_user_settings (new)
-- notes: this is a "protocol_*" table owned by the protokoly project.
--        the shared `profiles` table (owned by the main rental app)
--        is intentionally not modified.

-- 1. table -----------------------------------------------------------

create table public.protocol_user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- storage path inside bucket `protocol-photos`, e.g.
  -- "employee-signatures/<user_id>/<uuid>.png".
  -- nullable so we can create a row before the user uploads anything.
  signature_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.protocol_user_settings is
  'Per-employee preferences for the protokoly.elevatecars.sk app (e.g. saved signature).';
comment on column public.protocol_user_settings.signature_url is
  'Storage path inside the `protocol-photos` bucket pointing to the saved employee signature PNG.';

-- 2. updated_at trigger ---------------------------------------------

-- generic helper that bumps updated_at on every UPDATE.
-- guarded with `if not exists` because other migrations in this
-- project may add the same helper later.
create or replace function public.protocol_user_settings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger protocol_user_settings_updated_at
  before update on public.protocol_user_settings
  for each row
  execute function public.protocol_user_settings_set_updated_at();

-- 3. row level security ---------------------------------------------

alter table public.protocol_user_settings enable row level security;

-- each authenticated user can read only their own row.
create policy "users read own settings"
  on public.protocol_user_settings
  for select
  to authenticated
  using ( (select auth.uid()) = user_id );

-- each authenticated user can insert only a row for themselves.
create policy "users insert own settings"
  on public.protocol_user_settings
  for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

-- each authenticated user can update only their own row.
create policy "users update own settings"
  on public.protocol_user_settings
  for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- explicit no-op delete policy: nobody deletes via the public api.
-- on delete cascade from auth.users handles account deletion.
-- (skipping a delete policy means delete is denied for all roles.)
