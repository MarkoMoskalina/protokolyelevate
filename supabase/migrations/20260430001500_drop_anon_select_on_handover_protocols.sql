-- migration: drop anon_select_protocols policy
-- purpose: remove overly permissive anon SELECT on handover_protocols.
--          this policy allowed ANY unauthenticated request to read ALL
--          protocol data (PII, internal notes, etc.) via the Supabase
--          REST API with just the public anon key.
-- rationale: all public access to protocols goes through our own API routes
--            which use the service_role client (createAdminClient). The anon
--            role does not need direct table access.
-- affected: public.handover_protocols RLS policies (drop only, no alter table)

drop policy if exists "anon_select_protocols" on public.handover_protocols;
