-- Migration: Add cryptographic access token and expiry to handover_protocols
-- Purpose: Strengthen public protocol access with defense-in-depth
--   Layer 1: Random 32-byte URL token (un-guessable) replaces the public id in URLs
--   Layer 2: Existing 6-digit access_code (must still be entered to view)
--   Layer 3: 90-day expiry (link stops working after the rental cycle is long over)
--
-- Affected tables: public.handover_protocols (new columns only)
-- Backwards-compatible: existing rows get a token + 90-day expiry backfilled
--
-- IMPORTANT: This is a NEW PROJECT table (handover_protocols). It does NOT touch
-- any tables owned by the main elevatecars.sk project.

-- =============================================================================
-- 1. add columns
-- =============================================================================

-- access_token: 64 hex chars from gen_random_bytes(32) — 256 bits of entropy
-- not nullable, must be globally unique
alter table public.handover_protocols
  add column if not exists access_token text;

-- access_expires_at: when the public link stops working
-- default is 90 days after creation; admins may extend later
alter table public.handover_protocols
  add column if not exists access_expires_at timestamptz;

-- =============================================================================
-- 2. backfill existing rows
-- =============================================================================

-- pgcrypto lives in the `extensions` schema in Supabase, so we qualify the call.
-- generate a token for any row that doesn't have one yet
-- encode(extensions.gen_random_bytes(32), 'hex') => 64-char URL-safe lowercase hex
update public.handover_protocols
set access_token = encode(extensions.gen_random_bytes(32), 'hex')
where access_token is null;

-- backfill expiry: 90 days after creation date
update public.handover_protocols
set access_expires_at = created_at + interval '90 days'
where access_expires_at is null;

-- =============================================================================
-- 3. enforce constraints
-- =============================================================================

alter table public.handover_protocols
  alter column access_token set not null;

alter table public.handover_protocols
  alter column access_expires_at set not null;

-- defaults for future inserts (server can still override if needed)
alter table public.handover_protocols
  alter column access_token set default encode(extensions.gen_random_bytes(32), 'hex');

alter table public.handover_protocols
  alter column access_expires_at set default (now() + interval '90 days');

-- =============================================================================
-- 4. unique index on token
-- =============================================================================
-- collision probability with 256-bit random is essentially zero, but enforce it
-- so that a buggy backend can never accidentally point one URL to two protocols.

create unique index if not exists handover_protocols_access_token_unique
  on public.handover_protocols (access_token);

-- =============================================================================
-- 5. index on expiry for cleanup queries (optional but cheap)
-- =============================================================================

create index if not exists idx_handover_protocols_access_expires_at
  on public.handover_protocols (access_expires_at);
