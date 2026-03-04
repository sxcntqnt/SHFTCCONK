# CI Test Infrastructure — Directory Map

## Repo Structure

```
your-repo/
├── .github/
│   └── workflows/
│       └── rls-tests.yml          ← GitHub Actions workflow
│
└── supabase/
    ├── ci/
    │   ├── 00_mock_supabase.sql   ← Mock auth schema, roles, JWT stubs
    │   └── 01_test_bootstrap.sql  ← Insert auth.users for FK constraints
    │
    ├── schema/
    │   ├── 00_extensions_domains.sql
    │   ├── 01_tables.sql
    │   ├── 02_indexes.sql
    │   ├── 03_functions.sql
    │   ├── 04_views.sql
    │   ├── 05_triggers.sql
    │   ├── 06_rls.sql
    │   ├── 07_seed.sql
    │   └── 08_privileges.sql
    │
    └── test/
        └── rls_test.sql           ← 24 pgTAP assertions
```

## CI Execution Order

```
 ┌─────────────────────────────────────────────────────────┐
 │  1. Install Postgres 16 + pgTAP + pg_prove              │
 │     (from PGDG apt repo on ubuntu runner)               │
 │                                                          │
 │  2. Start Postgres, create test_federated DB             │
 │                                                          │
 │  3. Apply: ci/00_mock_supabase.sql                       │
 │     Creates: auth schema, auth.users, auth.uid(),        │
 │     auth.jwt(), storage stubs, anon/authenticated roles  │
 │                                                          │
 │  4. Apply: schema/00 → 08 (in order)                     │
 │     Full production schema with all hardening             │
 │                                                          │
 │  5. Verify: table count, function safety, seed data      │
 │     Fails fast if schema is broken                       │
 │                                                          │
 │  6. Apply: ci/01_test_bootstrap.sql                      │
 │     Inserts auth.users rows so test profiles don't       │
 │     violate FK constraints                               │
 │                                                          │
 │  7. Run: pg_prove test/rls_test.sql                      │
 │     24 assertions across 12 test groups                  │
 │                                                          │
 │  8. On failure: dump diagnostics                         │
 │     RLS policies, function safety, denied log, versions  │
 └─────────────────────────────────────────────────────────┘
```

## What the workflow tests

| Group | Tests | Security property |
|---|---|---|
| JWT Kill-Switch | 1-2 | Version mismatch = instant deny |
| Deny Precedence | 3-4 | Explicit deny overrides allow; doesn't bleed |
| Jurisdiction Boundary | 5-8 | Org isolation; federal covers all |
| INSERT Paradox | 9-10 | Scope-based check without resource lookup |
| Resource Lookup | 11-13 | FOUND check; no ID enumeration; no schema leak |
| Expired Delegation | 14 | Past expires_at = denied |
| Default Deny | 15-16 | No grant = denied; wrong actor in JWT = denied |
| Federal-Only | 17-18 | Can't grant admin.full at org scope |
| RLS Under Role | 19-20 | Driver blocked from audit_logs; admin allowed |
| Cross-Table Join | 21-22 | Correct scope filtering across tables |
| Failed Access Log | 23-24 | Denials recorded with reason |
| Cascade Revocation | (within 24) | Source deletion revokes downstream |

## Why the original test file was broken

See `tests/00_analysis.sql` for the full breakdown. Summary:

1. **Invalid UUIDs** — `'actor-uuid'` is not a UUID
2. **No auth mocking** — `auth.uid()` returns NULL in pgTAP
3. **No test data** — empty DB denies everything trivially
4. **No FK setup** — profiles FK→auth.users would block inserts
5. **Superuser context** — RLS tests need `SET ROLE authenticated`
6. **No version accounting** — triggers bump version during setup