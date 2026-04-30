-- Migration: Allow nullable mileage_km and fuel_level for draft protocols
-- Purpose: Support "predpripravené" (draft) handover protocols where the staff prepares
--          the protocol in advance (customer info, car, dates) but fills mileage and
--          fuel level only when the customer arrives.
-- Affected tables: handover_protocols (alter columns)
-- Affected columns:
--   - mileage_km: NOT NULL -> NULL
--   - fuel_level: NOT NULL check -> NULL allowed, check still applies when set
--
-- Backwards compatibility:
--   - All existing rows have these columns populated (status='completed').
--   - Application layer enforces NOT NULL when status='completed' (validateForm).

-- =============================================================================
-- 1) mileage_km -> nullable
-- =============================================================================

alter table public.handover_protocols
  alter column mileage_km drop not null;

-- =============================================================================
-- 2) fuel_level -> nullable (keep value check, just allow null)
-- =============================================================================

alter table public.handover_protocols
  alter column fuel_level drop not null;

-- The original check constraint `fuel_level in ('1/4', '2/4', '3/4', '4/4')`
-- automatically allows NULL (CHECK constraints are satisfied when the value is NULL),
-- so we don't need to recreate it.
