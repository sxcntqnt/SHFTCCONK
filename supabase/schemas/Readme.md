# Fresh Database Schema

## Execution Order

Run these files **in sequence** against a fresh Supabase project's SQL editor. Each file depends on the ones before it.

```
00_extensions_domains.sql   ← pgcrypto + domain types
01_tables.sql               ← All 29 tables in FK-dependency order
02_indexes.sql              ← Covering indexes for Index-Only Scans
03_functions.sql            ← All hardened functions (search_path locked)
04_views.sql                ← effective_permissions_raw + my_permissions (double-gate)
05_triggers.sql             ← Lifecycle, audit, version bump, validation, cascade
06_rls.sql                  ← All RLS policies (INSERT paradox fixed)
07_seed.sql                 ← Roles, permissions catalog, federal policy groups
08_privileges.sql           ← REVOKE/GRANT lockdown on all functions + views
09_verify.sql               ← Post-deployment verification queries (run manually)
10_contact.sql              ← contact_requests hardening constraints
```

## After Deployment

1. **Enable JWT Hook**: Supabase Dashboard → Authentication → Hooks → Customize Access Token → `public.custom_access_token_hook`
2. **Run 09_verify.sql** and confirm all tests pass including Query 14 (identity resolution)
3. **Create your first admin**: manually insert an actor with type `ADMIN`, jurisdiction `federal`, and assign the `Platform Admin` policy group
4. **Test the flows**: signup, invite redemption, permission checks, dashboard routing

## Identity Architecture

This schema implements a **canonical identity separation** — the domain profile is decoupled from the Supabase auth credential.

### The Split

| Concept | Table | ID |
|---|---|---|
| Canonical domain identity | `profiles` | `profiles.id` (independent UUID) |
| Auth provider mapping | `identity_accounts` | `provider + provider_subject` |
| Supabase execution identity | `auth.users` | `auth.uid()` |

`auth.uid()` is the Supabase execution identity used for RLS machinery. It is **never** used as a profile primary key. All functions resolve it to a canonical `profile_id` via `get_current_profile_id()`:

```sql
select profile_id
from identity_accounts
where provider = 'supabase'
  and provider_subject = auth.uid()::text;
```

### Why This Matters

- **Profile outlives the auth credential** — deleting or rotating a Supabase auth user does not destroy the domain identity
- **Future provider support** — Google OAuth, M-Pesa, or an internal Dgraph identity can map to the same profile via `identity_accounts`
- **Supabase stays as execution adapter** — JWT, RLS, Realtime, and RPC auth context all continue working unchanged
- **The callback is unaffected** — `bootstrap_session()` resolves the profile internally; the TypeScript frontend never sees `auth.uid()` used as a profile FK

### Signup Flow

```
auth.users INSERT
  → on_auth_user_created trigger
  → handle_new_user()
      ├── profiles.id = gen_random_uuid()        (canonical identity)
      ├── identity_accounts (provider='supabase', provider_subject=auth.users.id)
      └── actors (profile_id=profiles.id, type='PASSENGER')
```

### Resolution Flow (every RLS policy and RPC)

```
auth.uid()  →  identity_accounts  →  profiles.id  →  actors  →  permissions
```

## What's Included

Every security hardening fix from the audit is baked in:

- **Canonical identity separation** — `profiles.id` is independent of `auth.users.id`
- **`identity_accounts` provider mapping** — supports Supabase, internal, OAuth, M-Pesa
- **`get_current_profile_id()`** — single resolution point for all auth→profile lookups
- `SET search_path = public` on all SECURITY DEFINER functions
- `REVOKE EXECUTE FROM public/anon` on all security functions
- JWT-cached actor IDs (O(1) lookup, not table scan)
- Double-gate intersection (permission scope ∩ jurisdiction)
- Instant revocation kill-switch (`permissions_version`)
- INSERT paradox fixed (`current_user_can_in_scope`)
- Resource not found uses `FOUND` (not null check)
- `federal_only` enforced at grant time (trigger)
- Cascading delegation revocation (trigger)
- Failed access logging (`access_denied_log`)
- Covering indexes for Index-Only Scans
- Audit triggers with exception safety
- Generic error messages (no schema leaks)
- `contact_requests` column-level constraints (email format, length limits)
