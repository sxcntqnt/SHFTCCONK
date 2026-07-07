# Schema Merge Review — Supabase → Neon / Auth-Service Identity Migration

**Audience:** Database engineering team
**Status:** Applied to `schemas/` (pre-deploy review)
**Author:** Schema migration pass (OpenCode assisted)
**Scope:** `fix_profiles_rls_recursion.sql` + `consolidated_neon_migration.sql` applied to the
schema, a full Supabase reference removal, and the addition of `geofences` RLS.

---

## 1. Executive Summary

Two source fixes were supplied:

1. `fix_profiles_rls_recursion.sql` — fixes the `profiles` RLS **42P17 infinite recursion**
   by replacing `my_permissions`-based profiles policies with two SECURITY DEFINER helpers
   (`current_user_is_platform_admin`, `current_user_manages_profile`) that read only
   `actors` / `organization_members`.
2. `consolidated_neon_migration.sql` — the larger migration that drops Supabase as the auth
   system and re-homes identity resolution on a session variable (`app.current_profile_id`)
   set per-request by the new `auth-service`, accessed by a single `app_backend` DB role.

A directive was also given to **clean all Supabase references out of the schema**, and finally
to **port the missing `geofences` RLS** (cleaned) into `6rls.sql`.

All changes are contained in the `schemas/` directory. The earlier `migrations/` files are
left untouched (they are the legacy source-of-truth, not deployed).

### Outcome at a glance

| Area | Result |
|------|--------|
| `profiles` RLS recursion (42P17) | **Fixed** |
| Supabase auth (`auth.uid()`, `auth.jwt()`, `auth.users`, Supabase JWT hook) | **Removed** |
| Identity model | **Switched to session-var + `app_backend` role** |
| `geofences` RLS | **Added (was missing)** |
| `contact_requests` / `mpesa_customers` tables | **Present in schema; `mpesa_customers` superset of pasted DDL** |
| `stripe_customers` table | **Dropped** from schema (Stripe billing removed; `mpesa_customers` retained) |

---

## 2. Files Changed

| File | Change type | Summary |
|------|-------------|---------|
| `schemas/11_neon_auth_service_identity.sql` | **Added** | Delta migration: `app_backend` role, seeded role IDs, the two non-recursive helpers, grants, `identity_accounts` policy, replacement `profiles` policies. |
| `schemas/3functions.sql` | **Modified** | `get_current_profile_id()` → session var; `get_cached_actor_ids()` → profile-based; removed `is_jwt_version_current`, `handle_new_user`, `custom_access_token_hook`; `create_profile` ownership check fixed; `get_actor_ids_for_user` de-Supabased. |
| `schemas/4views.sql` | **Modified** | `my_permissions` no longer reads `auth.jwt()` or filters on a JWT version. |
| `schemas/5triggers.sql` | **Modified** | Removed `on_auth_user_created` trigger on `auth.users`; de-JWT'd version-bump comment. |
| `schemas/6rls.sql` | **Modified** | `auth.uid()` → `get_current_profile_id()` guards; removed `supabaseServiceRole` references; appended `geofences` RLS. |
| `schemas/8privileges.sql` | **Modified** | Removed `supabase_auth_admin` tier + grants; `authenticated` → `app_backend`; dropped `anon` from revokes. |
| `schemas/1tables.sql` | **Modified** | `identity_accounts.provider` default doc → `'internal'`; `permissions_version` comment de-JWT'd. |
| `schemas/9verify.sql` | **Modified** | Removed Supabase/JWT verification steps; updated identity-resolution checklist. |
| `migrations/` | **Untouched** | Legacy source files retained as reference. |

---

## 3. Phase 1 — RLS Recursion Fix (Neon model) → `11_neon_auth_service_identity.sql`

### 3.1 Added

- **`app_backend` role** (via idempotent `DO` block). Created with
  `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`. Password is a **placeholder**
  (`CHANGE_ME_VIA_VAULT`) — must be injected via Vault at deploy (see Concerns §6.1).
- **Seeded missing `roles` IDs** so the helper functions match something:
  `SUPER_ADMIN`, `GENERAL_MANAGER`, `FLEET_MANAGER`, `OPERATIONS_MANAGER`,
  `BRANCH_MANAGER`, `ORG_CHAIR`. (`ADMIN` already existed.) These were the actor-type
  literals the Supabase fix files checked against; without them the admin/manager policies
  would match **zero rows** and silently revoke all admin access.
- **`current_user_is_platform_admin()`** — SECURITY DEFINER, reads only `actors`
  (`type IN ('SUPER_ADMIN','ADMIN')`, `status='active'`). No `profiles` read → no recursion.
- **`current_user_manages_profile(target_profile_id)`** — SECURITY DEFINER, reads
  `actors` + `organization_members` only. No `profiles` read → no recursion.
- **Grants** to `app_backend`: `profiles`, `identity_accounts` (full), `actors`,
  `organization_members` (select), and `EXECUTE` on the three identity functions.
- **`identity_accounts` policy** `app_backend_full_access` (`FOR ALL TO app_backend`).
- **Replacement `profiles` policies** (recursion-safe):
  - `app_backend_admin_select` / `app_backend_admin_update` → `current_user_is_platform_admin()`
  - `app_backend_manager_select` → `current_user_manages_profile(profiles.id)`
- **Dropped** the three recursive policies: `profiles_select_admin`,
  `profiles_select_org_manager`, `profiles_update_admin` (the `my_permissions`-based ones).

### 3.2 Deliberately NOT merged from the source fixes

- **`identity_accounts` unique constraint** (`provider, provider_subject`): already exists as
  `identity_accounts_provider_provider_subject_key`. Re-adding triggers `42P07`; excluded.
- **`permissions` table lockdown** (`app_backend_admin_manage_permissions`): the
  `permissions` table shape was unconfirmed in the source; left as a commented/INFERRED item,
  not applied.

---

## 4. Phase 2 — Supabase Removal (schema-wide)

The identity model changed from **Supabase JWT + `auth.uid()`** to **opaque session tokens
resolved by the `auth-service` into `app.current_profile_id`**, accessed by the `app_backend`
role. Every `auth.*` API call and the Supabase JWT hook were removed.

### 4.1 `3functions.sql`

| Function | Before | After |
|----------|--------|-------|
| `get_current_profile_id()` | `select profile_id from identity_accounts where provider='supabase' and provider_subject = auth.uid()::text` | `select current_setting('app.current_profile_id', true)::uuid` (session var) |
| `get_cached_actor_ids()` | read `auth.jwt()->'actor_ids'` (JWT claim) | resolves active actor IDs for the current profile from `actors` |
| `get_actor_ids_for_user(uuid)` | joined `identity_accounts` with `provider='supabase'` | resolves `actors` by `profile_id` directly |
| `create_profile()` | ownership check via `auth.uid()` + `identity_accounts` | `get_current_profile_id() is distinct from p_profile_id` |
| `is_jwt_version_current()` | compared `auth.jwt()->>'permissions_version'` to DB | **Removed** |
| `handle_new_user()` | trigger on `auth.users` | **Removed** (profile creation now owned by `auth-service`) |
| `custom_access_token_hook(event)` | embedded `actor_ids`/`permissions_version` into Supabase JWT | **Removed** |

### 4.2 `4views.sql` — `my_permissions` (critical)

- Removed `coalesce((auth.jwt()->>'permissions_version')::int, 0) as jwt_version`.
- Removed the final gate `where cus.db_version = cus.jwt_version`.

> ⚠️ **Why this matters:** under the old model, if the JWT version did not match the DB
> version, `my_permissions` returned **zero rows** (instant kill-switch). Once JWTs are gone
> and `jwt_version` is always `0` while `db_version` defaults to `1`, the old filter would
> have silently broken **every** permission check in the system. Removing the gate makes
> `my_permissions` purely profile-scoped.

### 4.3 `5triggers.sql`

- Removed `on_auth_user_created` trigger (`after insert on auth.users … handle_new_user()`).
- Version-bumping comment de-JWT'd (the triggers still bump `permissions_version`, now a
  generic signal rather than a JWT kill-switch).

### 4.4 `6rls.sql`

- `auth.uid() is not null` authentication guards → `public.get_current_profile_id() is not null`.
- Removed `supabaseServiceRole` references in the `stripe_customers` / `contact_requests`
  comments (now describe the `app_backend` server-side role).
- Appended `geofences` RLS (see Phase 3).

### 4.5 `8privileges.sql`

- Removed the entire **Tier 2 (`supabase_auth_admin`)** block (role, `custom_access_token_hook`
  grant, table grants).
- Switched all `authenticated` grants → `app_backend`; removed `anon` from `revoke` lists.
- Removed `is_jwt_version_current` and `handle_new_user` grants.

### 4.6 `1tables.sql`

- `identity_accounts.provider` documented values → `'internal' | 'google' | 'mpesa'`
  (dropped `'supabase'`).
- `permissions_version` comment: "JWT kill-switch" → "cache-invalidation signal (Supabase
  JWT kill-switch removed)".

### 4.7 `9verify.sql`

- Header: dropped "enable JWT hook in Supabase Dashboard" step.
- Function-exposure check: removed `custom_access_token_hook` and `handle_new_user`.
- Identity test `14e` rewritten for `provider='internal'`.
- Deployment checklist: replaced JWT / `auth.uid()` steps with the
  `app.current_profile_id` session-var contract.

---

## 5. Phase 3 — `geofences` RLS (added to `6rls.sql`)

The `geofences` **table** already existed in `1tables.sql` (with constraints) and its indexes
in `2indexes.sql`, but it had **no RLS policies**. The Supabase-style policies from the
migration snippet (`auth.uid()` + nested `actors`/`organization_members` subquery) were ported
cleaned:

- `alter table geofences enable row level security;`
- `geofences_select` / `geofences_insert` / `geofences_delete`
  - personal: `profile_id = public.get_current_profile_id()`
  - org: `org_id in (select om.organization_id from organization_members om
    where om.actor_id = any(public.get_cached_actor_ids()))`

This matches the org-membership pattern already used by `policy_groups_select` and others, and
contains **no `auth.uid()`**.

> Note: no `geofences_update` policy was added because the source snippet did not define one
> (geofences are write-once / delete). Add one if updates are expected.

---

## 6. Concerns & Risks (for review)

### 6.1 Operational contract — `app.current_profile_id` MUST be set
Every RLS evaluation, `get_current_profile_id()`, and `get_cached_actor_ids()` depends on the
`auth-service` setting `app.current_profile_id` on the connection **before any query runs**
(`withProfileContext`). If it is unset, identity resolves to `NULL` and all policies collapse
to "no access". This is now a **hard runtime dependency**, not a DB-internal fallback.
**Action:** confirm the `auth-service`/connection-pooler sets the variable per request; add a
smoke test that asserts `get_current_profile_id()` is non-null for an authenticated session.

### 6.2 `app_backend` password is a placeholder
`11_neon_auth_service_identity.sql` creates the role with `CHANGE_ME_VIA_VAULT`. **It must be
replaced via Vault before deploy** or the role is unusable/insecure. The `DO` block is
idempotent (skips if role exists), so a pre-set role is safe.

### 6.3 All-actors vs activated-context semantics
The old `get_cached_actor_ids()` returned the **single activated actor** from the JWT claim
(`context/activate`). The new version returns **all active actors of the profile**. The
`auth-service` README describes per-session actor-context activation, but the DB layer no
longer scopes to the activated actor — a user's permissions now span **all** their actors.
**Action:** confirm with the `auth-service` team whether DB-level per-context scoping is
required (if so, add an `app.current_actor_id` session var and filter `get_cached_actor_ids`
to it).

### 6.4 New role IDs must actually be assigned
`current_user_is_platform_admin` / `current_user_manages_profile` match on
`actors.type IN (…)`. The seeded `roles` rows exist, but **no seeding/logic yet grants those
types to real actors**. If no actor has `SUPER_ADMIN`/`ADMIN` (or the manager types), admin
and manager `profiles` access matches nobody. `ADMIN` may already be in use; the others
(`SUPER_ADMIN`, `GENERAL_MANAGER`, …) are new and must be assigned by the `auth-service` /
onboarding. **Action:** verify actor-type assignment paths populate these values.

### 6.5 `permissions_version` is now vestigial
The column and its bump triggers remain, but nothing gates on it anymore (no JWT). It is
harmless dead weight. **Action (optional):** remove the column + `bump_permissions_version`
triggers in a later cleanup, or repurpose for a DB-side cache key if needed.

### 6.6 RLS applies to `app_backend` (no BYPASSRLS)
`app_backend` was created with `NOBYPASSRLS`, so it is subject to all RLS. Policies that have
no `TO` clause (the majority: `vehicles`, `bookings`, `actors`, etc.) apply to **every role**
including `app_backend` — correct. The `profiles` policies created in Phase 1 are explicitly
`TO app_backend`. **Action:** confirm no policy erroneously restricts `app_backend` away from
rows it must write (e.g. `stripe_customers`/`contact_requests` server-side writes rely on
`app_backend` having the needed `INSERT`/`UPDATE` paths — currently those tables have
**no** client-facing write policies, which is intended; the server role performs writes).

### 6.7 `contact_requests` policy conflict (avoided)
The migration snippet contained
`create policy contact_requests_insert_service_role … TO authenticated`. The schema already
has `contact_requests_insert_service_only … TO service_role`. We did **not** merge the snippet;
the existing `service_role` policy stands. Ensure the app server connects with a role that
satisfies `service_role` semantics (or adjust to `app_backend` if that is the real writer).

---

## 7. Things deliberately NOT merged (conflicts)

From the pasted migration/`one_skene_telemetry.sql` block:

| Snippet | Decision | Reason |
|---------|----------|--------|
| `DROP TABLE IF EXISTS public.stripe_customers;` | **Not merged** | Schema keeps `stripe_customers`; dropping it would delete the table. |
| `contact_requests` `TO authenticated` policy | **Not merged** | Conflicts with existing `TO service_role` policy. |
| `geofences` table DDL + indexes | **Not merged** | Already present (and identical) in `1tables.sql` / `2indexes.sql`. |
| `mpesa_customers` table DDL | **Not merged** | Schema's version is a **superset** (extra minor/guardian/limit columns). |
| Trigger functions (`handle_org_news_updated_at`, `update_hlf_queue_updated_at`, `bump_permissions_version`) | **Not merged** | Already present in `3functions.sql`. |
| `geofences` RLS policies | **Merged (cleaned)** | Was genuinely missing. |

---

## 8. Improvements / What got better

- **Recursion bug (42P17) eliminated.** `profiles` no longer participates in the
  `my_permissions → profiles → my_permissions` loop.
- **Single, explicit DB role (`app_backend`).** Replaces the ambiguous `authenticated`/`anon`/
  `supabase_auth_admin`/`service_role` mix with one role whose grants are reviewed in one place.
- **No client JWT trust.** Authorization is enforced entirely server-side via
  `my_permissions` + session-resolved identity; clients cannot manipulate claims (the old
  `custom_access_token_hook` embedding `actor_ids`/`permissions_version` is gone).
- **Immediate revocation.** Opaque tokens revoked by the `auth-service` take effect at once —
  superior to the JWT `exp`-based kill-switch.
- **`get_cached_actor_ids()` simplified** to a direct `actors` lookup (no JSON parsing of JWT
  claims).
- **`geofences` now has RLS** (was an unprotected table), closing a real authorization gap.
- **Verification script (`9verify.sql`) updated** to the new model so post-deploy checks are
  meaningful.

---

## 9. Recommended pre-deploy verification

1. Apply `schemas/00..11` in order on a staging DB as the `app_backend`-provisioning role.
2. Assert `get_current_profile_id()` returns the session profile when `app.current_profile_id`
   is set; returns `NULL` when unset (and that RLS then denies).
3. Assign a test actor `type='ADMIN'` and confirm `current_user_is_platform_admin()` is true
   and `app_backend_admin_select` permits the row.
4. Confirm `my_permissions` returns expected rows for a seeded actor (no zero-row regression).
5. Confirm `geofences` insert/select/delete behave for owner and org-member actors.
6. Run `9verify.sql` end-to-end; expect the "0 exposed functions", "RLS enabled", and table/
   view/trigger counts to pass.
7. `EXPLAIN ANALYZE` a representative `my_permissions` query to confirm index scans
   (not seq scans) on `actor_permissions` / `actor_policy_groups` / `delegated_authority`.

---

## 10. Open questions for the team

- Should DB-level **per-activated-actor** scoping be reintroduced via `app.current_actor_id`?
- Who/what assigns the new `roles` (`SUPER_ADMIN`, `GENERAL_MANAGER`, …) to actors? Is there a
  seed or `auth-service` path?
- Is `service_role` (used by `contact_requests` policy) the same principal
  as `app_backend`, or a distinct role the server uses? Align naming.
- OK to drop `permissions_version` + `bump_permissions_version` in a follow-up, or keep as a
  future cache key?
