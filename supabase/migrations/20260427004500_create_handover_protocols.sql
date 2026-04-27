-- Migration: Create handover_protocols table and protocol storage buckets
-- Purpose: Core table for the protokoly.elevatecars.sk application
-- Affected tables: handover_protocols (new)
-- Storage: protocol-documents, protocol-photos (new buckets)
-- IMPORTANT: This migration only creates NEW objects. It does NOT modify
-- any existing tables (reservations, cars, profiles, etc.)

-- =============================================================================
-- TABLE: handover_protocols
-- =============================================================================

create table if not exists public.handover_protocols (
  id uuid primary key default gen_random_uuid(),

  -- foreign keys to existing tables (read-only from this project's perspective)
  reservation_id uuid references public.reservations(id) on delete set null,
  car_id uuid references public.cars(id) on delete set null,

  -- protocol type: 'handover' = odovzdanie, 'return' = vrátenie
  type text not null check (type in ('handover', 'return')),
  -- for return protocols, link back to the original handover
  handover_protocol_id uuid references public.handover_protocols(id) on delete set null,

  -- customer details (denormalized for PDF generation)
  customer_first_name text not null,
  customer_last_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_id_card_front_url text,
  customer_id_card_back_url text,
  customer_driver_license_url text,

  -- vehicle identification (denormalized)
  car_name text not null,
  car_license_plate text not null,
  reservation_number text,

  -- dates
  protocol_datetime timestamptz not null default now(),
  expected_return_datetime timestamptz,

  -- location
  location text,

  -- vehicle condition
  mileage_km integer not null,
  mileage_photo_url text,
  fuel_level text not null check (fuel_level in ('1/4', '2/4', '3/4', '4/4')),
  fuel_photo_url text,

  -- km allowance (handover only)
  allowed_km integer,

  -- km overage calculation (return only)
  km_exceeded integer,
  km_exceeded_price numeric(10,2),
  extra_km_rate numeric(10,2),

  -- deposit
  deposit_amount numeric(10,2),
  deposit_method text check (deposit_method in ('cash', 'bank_transfer', 'card_hold')),

  -- car photos (array of storage URLs)
  car_photos text[] default '{}',

  -- damages as JSON array: [{"description": "...", "photo_urls": ["url1"]}]
  damages jsonb default '[]',

  -- signature image URLs
  signature_landlord_url text,
  signature_tenant_url text,

  -- admin-only notes (hidden from public view)
  internal_notes text,

  -- generated PDF URL
  pdf_url text,

  -- 6-digit access code for public viewing
  access_code text not null default lpad(floor(random() * 1000000)::text, 6, '0'),

  -- metadata
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- workflow status
  status text not null default 'draft' check (status in ('draft', 'completed'))
);

-- add helpful comment
comment on table public.handover_protocols is
  'Vehicle handover and return protocols for protokoly.elevatecars.sk';

-- =============================================================================
-- INDEXES
-- =============================================================================

create index if not exists idx_handover_protocols_reservation
  on public.handover_protocols(reservation_id);

create index if not exists idx_handover_protocols_car
  on public.handover_protocols(car_id);

create index if not exists idx_handover_protocols_type
  on public.handover_protocols(type);

create index if not exists idx_handover_protocols_status
  on public.handover_protocols(status);

create index if not exists idx_handover_protocols_access_code
  on public.handover_protocols(access_code);

create index if not exists idx_handover_protocols_created_at
  on public.handover_protocols(created_at desc);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.handover_protocols enable row level security;

-- Granular policies for authenticated admins (select, insert, update, delete)

create policy "authenticated_admins_select"
  on public.handover_protocols
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

create policy "authenticated_admins_insert"
  on public.handover_protocols
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

create policy "authenticated_admins_update"
  on public.handover_protocols
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

create policy "authenticated_admins_delete"
  on public.handover_protocols
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

-- Policy: anon users can SELECT (for public view via access code)
-- The application layer filters by access_code in the API route
create policy "anon_select_protocols"
  on public.handover_protocols
  for select
  to anon
  using (true);

-- =============================================================================
-- TRIGGER: auto-update updated_at
-- Uses the existing handle_updated_at() function from the main project.
-- DO NOT recreate the function — it already exists and is used by 14+ tables.
-- =============================================================================

create trigger set_handover_protocols_updated_at
  before update on public.handover_protocols
  for each row
  execute function public.handle_updated_at();

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- Bucket for generated PDF protocol documents
insert into storage.buckets (id, name, public, file_size_limit)
values ('protocol-documents', 'protocol-documents', false, 10485760)
on conflict (id) do nothing;

-- Bucket for protocol photos (car photos, damage photos, ID cards, signatures)
insert into storage.buckets (id, name, public, file_size_limit)
values ('protocol-photos', 'protocol-photos', false, 10485760)
on conflict (id) do nothing;

-- =============================================================================
-- STORAGE RLS POLICIES
-- =============================================================================

-- protocol-documents: authenticated admins can upload and read
create policy "admins_upload_protocol_documents"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'protocol-documents'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

create policy "admins_read_protocol_documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'protocol-documents'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

-- protocol-photos: authenticated admins can upload, read, and delete
create policy "admins_upload_protocol_photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'protocol-photos'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

create policy "admins_read_protocol_photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'protocol-photos'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

create policy "admins_delete_protocol_photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'protocol-photos'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );
