# Federated Governance Schema — Review & Improvements

## Executive Summary

Your progression from a flat profiles/stripe schema → stage-operator RLS → federated governance is architecturally sound. The federated model (Document 2) introduces the right abstractions: actor-based identity, scoped jurisdictions, atomic permissions, policy groups, and delegated authority.

However, the original implementation had several critical bugs and missing pieces that would cause authorization failures in production. This review documents every issue found and provides production-ready replacements.

---

## Critical Issues Fixed

### 1. `can_actor_perform` — Jurisdiction Loop Was Decorative
**Severity: Critical**

The original function iterated over `actor_jurisdictions` with a `FOR actor_jur IN ...` loop, but the permission checks inside the loop never referenced `actor_jur`. This means:
- The loop body ran N times (once per jurisdiction) but did the **same check** each time
- An actor with permissions but **no jurisdiction** over a resource could still be granted access
- The function was O(N × M) for no reason

**Fix:** The improved version requires that BOTH the permission scope AND the actor's jurisdiction cover the resource, using a single pass with JOINs.

### 2. Missing Table Definitions
**Severity: Critical**

Document 2 referenced `vehicles` and `bookings` in `can_actor_perform` but only had `ALTER TABLE` statements — no `CREATE TABLE`. The `bookings` table was never defined anywhere.

**Fix:** Added complete `vehicles` and `bookings` table definitions with all jurisdiction columns.

### 3. Deny Override Could Be Bypassed
**Severity: Critical**

The deny check was inside the jurisdiction loop. If an actor had:
- Jurisdiction A with a `deny` on `vehicle.view`
- Jurisdiction B with an `allow` on `vehicle.view`

The function could return `true` if it processed Jurisdiction B first (before hitting the deny in Jurisdiction A).

**Fix:** Deny is now checked **globally** before any allow checks. If a deny exists at any scope covering the resource, the function returns `false` immediately.

---

## High Severity Issues

### 4. Missing Foreign Key Constraints
- `driver_assignments.vehicle_id` → no FK to `vehicles`
- `conductor_assignments.vehicle_id` → no FK to `vehicles`
- `fleet_ownership.vehicle_id` → no FK to `vehicles`
- `organization_members.organization_id` → no FK to `organizations`
- `invite_tokens.created_by` → no FK to `profiles`

### 5. No Indexes on Permission Lookup Paths
`can_actor_perform` joins across `actor_permissions`, `actor_policy_groups`, `delegated_authority`, `actor_jurisdictions`, and `permissions` — all without indexes. At scale, RLS policies calling this function on every row would cause full table scans.

**Added indexes:**
- `idx_actor_permissions_lookup(actor_id, effect)`
- `idx_actor_policy_groups_actor(actor_id)`
- `idx_delegated_authority_to(to_actor_id)`
- `idx_permissions_action(action)`
- `idx_actor_jurisdictions_actor(actor_id)`

---

## Medium & Low Severity Issues

- **No uniqueness constraints on permission grants** — same permission could be assigned to an actor multiple times
- **Delegation had no mandatory expiry** — `expires_at` was nullable, allowing permanent delegations (defeats the purpose)
- **No `revoked` flag on delegation** — only way to revoke was to delete the row (losing audit trail)
- **`reconciliation_events.variance` manually set** — changed to a `GENERATED ALWAYS AS` stored column
- **`actor_requests.status` unchecked** — added CHECK constraint for `pending/approved/rejected`
- **Missing `updated_at` trigger on profiles**

---

## Architecture Decisions Preserved

The improved schema keeps all the strong design decisions from the original:

1. **Actor-based identity** — one user, many personas
2. **Scoped jurisdictions** — federal / org / branch / department
3. **Atomic permissions** — no hardcoded role-based access
4. **Policy groups** — convenience bundles without losing granularity
5. **Deny overrides allow** — prevents escalation
6. **Delegated authority** — temporary emergency powers
7. **DB-level enforcement** — RLS ensures no bypass via direct SQL

---

## Files Delivered

| File | Purpose |
|------|---------|
| `01_improved_schema.sql` | Complete improved schema (run on fresh DB) |
| `02_rls_and_functions.sql` | Permission functions + RLS policies + triggers |
| `03_migration.sql` | Migrate from current (Doc 1) → federated |
| `federated_architecture.jsx` | Interactive architecture diagram |

---

## Migration Notes

The migration (`03_migration.sql`) is designed to be:
- **Non-breaking in Phase 1** — only adds new tables
- **Backfill in Phase 2** — converts existing stage operators and org admins to the new permission model
- **Atomic** — wrapped in a transaction
- **Verifiable** — includes post-migration queries to validate

Run `03_migration.sql` first, then `02_rls_and_functions.sql` to apply the new policies. Test on staging before production.




