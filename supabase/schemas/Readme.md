# Fresh Database Schema

## Execution Order

Run these files **in sequence** against a fresh Supabase project's SQL editor. Each file depends on the ones before it.

```
00_extensions_domains.sql   ← pgcrypto + domain types
01_tables.sql               ← All 28 tables in FK-dependency order
02_indexes.sql              ← Covering indexes for Index-Only Scans
03_functions.sql            ← All hardened functions (search_path locked)
04_views.sql                ← effective_permissions_raw + my_permissions (double-gate)
05_triggers.sql             ← Lifecycle, audit, version bump, validation, cascade
06_rls.sql                  ← All RLS policies (INSERT paradox fixed)
07_seed.sql                 ← Roles, permissions catalog, federal policy groups
08_privileges.sql           ← REVOKE/GRANT lockdown on all functions + views
09_verify.sql               ← Post-deployment verification queries (run manually)
```

## After Deployment

1. **Enable JWT Hook**: Supabase Dashboard → Authentication → Hooks → Customize Access Token → `public.custom_access_token_hook`
2. **Run 09_verify.sql** and confirm all tests pass
3. **Create your first admin**: manually insert an actor with type `ADMIN`, jurisdiction `federal`, and assign the `Platform Admin` policy group
4. **Test the flows**: signup, invite redemption, permission checks, dashboard routing

## What's Included

Every security hardening fix from the audit is baked in:

- `SET search_path = public` on all SECURITY DEFINER functions
- `REVOKE EXECUTE FROM public/anon` on all security functions
- JWT-cached actor IDs (O(1) lookup, not table scan)
- Double-gate intersection (permission scope ∩ jurisdiction)
- Instant revocation kill-switch (permissions_version)
- INSERT paradox fixed (current_user_can_in_scope)
- Resource not found uses FOUND (not null check)
- federal_only enforced at grant time (trigger)
- Cascading delegation revocation (trigger)
- Failed access logging (access_denied_log)
- Covering indexes for Index-Only Scans
- Audit triggers with exception safety
- Generic error messages (no schema leaks)