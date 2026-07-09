# Neon Database Schema — Auth-Service Identity Model

## Execution Order

Run these files **in sequence** against a fresh Neon database (`psql` or any SQL runner). Each file depends on the ones before it.

```
00_extensions_domains.sql        ← pgcrypto + domain types + app_backend role
01_tables.sql                    ← All tables in FK-dependency order
02_indexes.sql                   ← Covering indexes for Index-Only Scans
03_functions.sql                 ← All hardened functions (search_path locked)
04_views.sql                     ← effective_permissions_raw + my_permissions (double-gate)
05_triggers.sql                  ← Lifecycle, audit, version bump, validation, cascade
06_rls.sql                       ← All RLS policies (INSERT paradox fixed, profiles recursion fixed)
07_seed.sql                      ← Roles, permissions catalog, federal policy groups
08_privileges.sql                ← app_backend table/function grants + REVOKE lockdown
09_verify.sql                    ← Post-deployment verification queries (run manually)
10_contact.sql                   ← contact_requests hardening constraints
```

The `app_backend` role is created early (`00_extensions_domains.sql`) because `06_rls.sql`
creates policies scoped `to app_backend` (`stripe_customers`, `contact_requests`,
`identity_accounts`) — the role has to exist before those `CREATE POLICY` statements run.
Its actual table/function grants happen later, in `08_privileges.sql`, once every object it
needs access to has been created.

## After Deployment

1. **Confirm `app.current_profile_id` is set per-transaction** by the auth-service
   (`pg.ts`'s `withProfileContext`) before any query runs. If it's unset, identity resolves
   to `NULL` and every RLS policy collapses to "no access" — this is a hard runtime
   dependency now, not a DB-internal fallback.
2. **Replace the `app_backend` password** (`CHANGE_ME_VIA_VAULT` in
   `00_extensions_domains.sql`) via Vault before deploy.
3. **Run 09_verify.sql** and confirm all tests pass, including Query 14 (identity resolution)
   and Query 14g (`app.current_profile_id` round-trip).
4. **Create your first admin**: manually insert an actor with type `ADMIN` (or `SUPER_ADMIN`),
   jurisdiction `federal`, and assign the `Platform Admin` policy group.
5. **Test the flows**: signup (via auth-service), invite redemption, permission checks,
   dashboard routing.

## Identity Architecture

This schema implements a **canonical identity separation** — the domain profile is decoupled
from the auth-service's execution/session identity.

### The Split

| Concept | Table | ID |
|---|---|---|
| Canonical domain identity | `profiles` | `profiles.id` (independent UUID) |
| Auth provider mapping | `identity_accounts` | `provider + provider_subject` |
| Session identity (per-request) | — | `app.current_profile_id` (session GUC) |

The auth-service validates the caller's opaque session token (`atk_`/`rtk_`, SHA-256 hashed,
Dgraph-backed) and sets the `app.current_profile_id` Postgres session variable once per
transaction, via the `app_backend` role. Every function and RLS policy resolves identity
through `get_current_profile_id()`:

```sql
select current_setting('app.current_profile_id', true)::uuid
```

There is no client JWT, no `auth.uid()`, and no `auth.jwt()` — those are Supabase-specific
and do not exist on Neon. If you see them anywhere in this schema outside of a comment, that's
a bug — the identity model was fully migrated off Supabase (see the merge review for details).

### Why This Matters

- **Profile outlives the auth credential** — rotating or revoking a session token does not
  destroy the domain identity
- **Multi-provider support** — Google OAuth, M-Pesa, or the auth-service's internal
  (`'internal'`) identity can all map to the same profile via `identity_accounts`
- **No client-trusted claims** — authorization is enforced entirely server-side via
  `my_permissions` + the session-resolved `app.current_profile_id`; there's no JWT for a
  client to tamper with
- **Instant revocation** — the auth-service revoking an opaque token takes effect immediately,
  no `exp`-based kill-switch needed

### Signup Flow

```
auth-service validates credentials
  → creates profiles row       (canonical identity, profiles.id = gen_random_uuid())
  → creates identity_accounts row (provider='internal', provider_subject=<auth-service id>)
  → creates actors row         (profile_id=profiles.id, type='PASSENGER')
  → issues atk_/rtk_ session tokens
```

Profile/actor bootstrap on signup is owned entirely by the auth-service (a single
transaction on its side) — there is no Postgres trigger for it, because there is no
`auth.users` table to trigger off of.

### Resolution Flow (every RLS policy and RPC)

```
opaque session token  →  auth-service  →  app.current_profile_id (session GUC)
                                              ↓
                            get_current_profile_id()  →  profiles.id  →  actors  →  permissions
```

## What's Included

Every security hardening fix from the audit is baked in:

- **Canonical identity separation** — `profiles.id` is independent of any auth-provider ID
- **`identity_accounts` provider mapping** — supports internal (auth-service), Google, M-Pesa
- **`get_current_profile_id()`** — single resolution point for all session→profile lookups
- **`app_backend` role (NOBYPASSRLS)** — one explicit, reviewable DB role instead of Supabase's
  `anon`/`authenticated`/`service_role`/`supabase_auth_admin` mix; every table it writes to has
  an explicit policy (it does NOT bypass RLS)
- **Profiles RLS recursion (42P17) fixed** — `current_user_is_platform_admin()` /
  `current_user_manages_profile()` read only `actors`/`organization_members`, never `profiles`
- `SET search_path = public` on all SECURITY DEFINER functions
- `REVOKE EXECUTE FROM public` on all security functions
- Double-gate intersection (permission scope ∩ jurisdiction)
- INSERT paradox fixed (`current_user_can_in_scope`)
- Resource not found uses `FOUND` (not null check)
- `federal_only` enforced at grant time (trigger)
- Cascading delegation revocation (trigger)
- Failed access logging (`access_denied_log`)
- Covering indexes for Index-Only Scans
- Audit triggers with exception safety
- Generic error messages (no schema leaks)
- `contact_requests` column-level constraints (email format, length limits)
- `geofences` RLS (was previously an unprotected table)

## Open Questions (carried over from the merge review)

- Should DB-level **per-activated-actor** scoping be reintroduced via an
  `app.current_actor_id` session GUC, or is "all of a profile's active actors" the intended
  permission surface?
- Who/what assigns the new roles (`SUPER_ADMIN`, `GENERAL_MANAGER`, `FLEET_MANAGER`,
  `OPERATIONS_MANAGER`, `BRANCH_MANAGER`, `ORG_CHAIR`) to actors? Confirm the auth-service /
  onboarding path populates these — until it does, admin/manager access to `profiles` grants
  nobody anything.
- OK to drop `permissions_version` + `bump_permissions_version` in a follow-up (it's vestigial
  now that there's no JWT to gate), or keep it as a future cache-invalidation key?
- Is `stripe_customers` still in scope, or should it actually be dropped (an earlier pass
  described dropping it, but the table and its RLS policies are still present in this schema)?
- Avatar storage: `00_extensions_domains.sql` no longer provisions a Supabase Storage bucket
  (that schema doesn't exist on Neon). `profiles.avatar_url` is still just a text column —
  confirm what object-storage backend (S3/R2/etc.) the app layer now writes avatars to and
  points that column at, since nothing does that provisioning at the DB level anymore.
