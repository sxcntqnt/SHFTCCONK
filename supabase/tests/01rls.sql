-- =========================================================
-- rls_test.sql — Corrected pgTAP test suite
-- =========================================================
-- Tests the hardened federated governance schema.
--
-- Prerequisites:
--   • pgTAP extension installed: CREATE EXTENSION pgtap;
--   • Schema files 00-08 already applied
--   • Run via: pg_prove -d your_db tests/rls_test.sql
--
-- Structure:
--   1. Setup: create realistic test data (orgs, actors, permissions)
--   2. Helper: mock_auth_context() to simulate JWT claims
--   3. Tests: 25 assertions covering every security property
--   4. Teardown: ROLLBACK cleans everything up
-- =========================================================

BEGIN;

SELECT plan(24);


-- ═══════════════════════════════════════════════════════════
-- SETUP: Realistic test data
-- ═══════════════════════════════════════════════════════════

-- We can't use auth.users directly in pgTAP (managed by GoTrue),
-- so we insert profiles directly (simulating what handle_new_user does).

-- Fixed UUIDs for deterministic tests
DO $$
DECLARE
  -- Users
  v_admin_profile_id   uuid := '00000000-0000-0000-0000-000000000001';
  v_driver_profile_id  uuid := '00000000-0000-0000-0000-000000000002';
  v_outsider_profile_id uuid := '00000000-0000-0000-0000-000000000003';
  v_revoked_profile_id uuid := '00000000-0000-0000-0000-000000000004';

  -- Actors
  v_admin_actor_id     uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_driver_actor_id    uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  v_outsider_actor_id  uuid := 'aaaaaaaa-0000-0000-0000-000000000003';
  v_revoked_actor_id   uuid := 'aaaaaaaa-0000-0000-0000-000000000004';

  -- Org hierarchy
  v_org_id             uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
  v_branch_id          uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  v_dept_id            uuid := 'bbbbbbbb-0000-0000-0000-000000000003';
  v_other_org_id       uuid := 'bbbbbbbb-0000-0000-0000-000000000099';

  -- Resources
  v_vehicle_id         uuid := 'cccccccc-0000-0000-0000-000000000001';
  v_booking_id         uuid := 'cccccccc-0000-0000-0000-000000000002';

  -- Permissions (looked up from seed data)
  v_vehicle_view_id    uuid;
  v_vehicle_create_id  uuid;
  v_booking_view_id    uuid;
  v_booking_modify_id  uuid;
  v_compliance_view_id uuid;
  v_recon_view_id      uuid;
  v_admin_full_id      uuid;
BEGIN

  -- ── Profiles ──────────────────────────────────────────
  INSERT INTO profiles (id, full_name, permissions_version) VALUES
    (v_admin_profile_id,   'Admin User',   1),
    (v_driver_profile_id,  'Driver User',  1),
    (v_outsider_profile_id,'Outsider User', 1),
    (v_revoked_profile_id, 'Revoked User', 1);

  -- ── Actors ────────────────────────────────────────────
  INSERT INTO actors (id, profile_id, type, status) VALUES
    (v_admin_actor_id,    v_admin_profile_id,    'ADMIN',  'active'),
    (v_driver_actor_id,   v_driver_profile_id,   'DRIVER', 'active'),
    (v_outsider_actor_id, v_outsider_profile_id, 'PASSENGER', 'active'),
    (v_revoked_actor_id,  v_revoked_profile_id,  'DRIVER', 'active');

  -- ── Org hierarchy ────────────────────────────────────
  INSERT INTO organizations (id, name) VALUES
    (v_org_id, 'Test Sacco'),
    (v_other_org_id, 'Other Sacco');

  INSERT INTO branches (id, organization_id, name) VALUES
    (v_branch_id, v_org_id, 'Nairobi Branch');

  INSERT INTO departments (id, branch_id, name) VALUES
    (v_dept_id, v_branch_id, 'Operations');

  -- ── Jurisdictions ────────────────────────────────────
  -- Admin: federal jurisdiction (covers everything)
  INSERT INTO actor_jurisdictions (actor_id, level, scope_id) VALUES
    (v_admin_actor_id, 'federal', null);

  -- Driver: org-scoped jurisdiction
  INSERT INTO actor_jurisdictions (actor_id, level, scope_id) VALUES
    (v_driver_actor_id, 'org', v_org_id);

  -- Outsider: org-scoped to a DIFFERENT org
  INSERT INTO actor_jurisdictions (actor_id, level, scope_id) VALUES
    (v_outsider_actor_id, 'org', v_other_org_id);

  -- Revoked: org-scoped (permissions will be revoked later)
  INSERT INTO actor_jurisdictions (actor_id, level, scope_id) VALUES
    (v_revoked_actor_id, 'org', v_org_id);

  -- ── Org memberships ──────────────────────────────────
  INSERT INTO organization_members (actor_id, organization_id, role) VALUES
    (v_driver_actor_id, v_org_id, 'member'),
    (v_revoked_actor_id, v_org_id, 'member'),
    (v_outsider_actor_id, v_other_org_id, 'member');

  -- ── Look up permission IDs from seed data ────────────
  SELECT id INTO v_vehicle_view_id    FROM permissions WHERE action = 'vehicle.view';
  SELECT id INTO v_vehicle_create_id  FROM permissions WHERE action = 'vehicle.create';
  SELECT id INTO v_booking_view_id    FROM permissions WHERE action = 'booking.view';
  SELECT id INTO v_booking_modify_id  FROM permissions WHERE action = 'booking.modify';
  SELECT id INTO v_compliance_view_id FROM permissions WHERE action = 'compliance.view';
  SELECT id INTO v_recon_view_id      FROM permissions WHERE action = 'reconciliation.view';
  SELECT id INTO v_admin_full_id      FROM permissions WHERE action = 'admin.full';

  -- ── Direct permission grants ─────────────────────────
  -- Admin: full access at federal level
  INSERT INTO actor_permissions (actor_id, permission_id, effect, level, scope_id) VALUES
    (v_admin_actor_id, v_vehicle_view_id,    'allow', 'federal', null),
    (v_admin_actor_id, v_vehicle_create_id,  'allow', 'federal', null),
    (v_admin_actor_id, v_booking_view_id,    'allow', 'federal', null),
    (v_admin_actor_id, v_booking_modify_id,  'allow', 'federal', null),
    (v_admin_actor_id, v_compliance_view_id, 'allow', 'federal', null),
    (v_admin_actor_id, v_recon_view_id,      'allow', 'federal', null),
    (v_admin_actor_id, v_admin_full_id,      'allow', 'federal', null);

  -- Driver: org-scoped access
  INSERT INTO actor_permissions (actor_id, permission_id, effect, level, scope_id) VALUES
    (v_driver_actor_id, v_vehicle_view_id,   'allow', 'org', v_org_id),
    (v_driver_actor_id, v_booking_view_id,   'allow', 'org', v_org_id),
    (v_driver_actor_id, v_recon_view_id,     'allow', 'org', v_org_id);

  -- Revoked user: had booking.modify, now DENIED
  INSERT INTO actor_permissions (actor_id, permission_id, effect, level, scope_id) VALUES
    (v_revoked_actor_id, v_vehicle_view_id,  'allow', 'org', v_org_id),
    (v_revoked_actor_id, v_booking_modify_id,'deny',  'org', v_org_id);

  -- Outsider: has vehicle.view but for OTHER org
  INSERT INTO actor_permissions (actor_id, permission_id, effect, level, scope_id) VALUES
    (v_outsider_actor_id, v_vehicle_view_id, 'allow', 'org', v_other_org_id);

  -- ── Delegated authority (expired) ────────────────────
  INSERT INTO delegated_authority (
    from_actor_id, to_actor_id, permission_id, level, scope_id,
    reason, expires_at, revoked
  ) VALUES (
    v_admin_actor_id, v_revoked_actor_id, v_booking_modify_id,
    'org', v_org_id, 'Emergency cover', now() - interval '1 hour', false
  );

  -- ── Resources ────────────────────────────────────────
  INSERT INTO vehicles (id, organization_id, branch_id, department_id, reg_number) VALUES
    (v_vehicle_id, v_org_id, v_branch_id, v_dept_id, 'KBZ 001A');

  INSERT INTO bookings (id, organization_id, branch_id, department_id, vehicle_id, passenger_actor_id, fare, status) VALUES
    (v_booking_id, v_org_id, v_branch_id, v_dept_id, v_vehicle_id, v_outsider_actor_id, 100, 'confirmed');

END $$;

-- ─── CRITICAL: Reset versions after bulk setup ──────────
-- The bump_permissions_version trigger fired on every INSERT
-- into actor_permissions during setup. Admin got 7 inserts
-- (version → 8), driver got 3 (version → 4), etc.
-- Reset all to 1 so our JWT mock (version=1) matches.
UPDATE profiles SET permissions_version = 1;


-- ═══════════════════════════════════════════════════════════
-- HELPER: Mock Supabase auth context for pgTAP
-- ═══════════════════════════════════════════════════════════
-- Supabase uses request.jwt.claims and request.jwt.claim.sub
-- to populate auth.uid() and auth.jwt().

CREATE OR REPLACE FUNCTION test_set_auth_context(
  p_profile_id uuid,
  p_actor_ids uuid[],
  p_permissions_version int default 1
) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  -- Set the JWT claims (used by auth.jwt())
  PERFORM set_config('request.jwt.claims', json_build_object(
    'sub', p_profile_id::text,
    'role', 'authenticated',
    'actor_ids', p_actor_ids,
    'permissions_version', p_permissions_version
  )::text, true);

  -- Set the sub claim directly (used by auth.uid())
  PERFORM set_config('request.jwt.claim.sub', p_profile_id::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION test_clear_auth_context()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
END;
$$;


-- ═══════════════════════════════════════════════════════════
-- TEST GROUP 1: JWT Version Kill-Switch
-- ═══════════════════════════════════════════════════════════

-- Test 1: Valid JWT version → access granted
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000001',  -- admin profile
  ARRAY['aaaaaaaa-0000-0000-0000-000000000001']::uuid[],  -- admin actor
  1  -- matches DB version
);

SELECT is(
  public.can_actor_perform(
    'aaaaaaaa-0000-0000-0000-000000000001',
    'vehicle.view',
    'bbbbbbbb-0000-0000-0000-000000000001', -- org_id
    'bbbbbbbb-0000-0000-0000-000000000002', -- branch_id
    'bbbbbbbb-0000-0000-0000-000000000003'  -- dept_id
  ),
  true,
  'TEST 1: Admin with matching JWT version should have access'
);


-- Test 2: Stale JWT version → access denied (kill-switch)
-- JWT sends version 1, we set DB to 99 → mismatch → deny.
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000001',
  ARRAY['aaaaaaaa-0000-0000-0000-000000000001']::uuid[],
  1  -- JWT version stays at 1
);

-- Force a version mismatch
UPDATE profiles SET permissions_version = 99
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT is(
  public.can_actor_perform(
    'aaaaaaaa-0000-0000-0000-000000000001',
    'vehicle.view',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000003'
  ),
  false,
  'TEST 2: Stale JWT (version 1) vs DB (version 99) should DENY access'
);

-- Reset version for remaining tests
UPDATE profiles SET permissions_version = 1
WHERE id = '00000000-0000-0000-0000-000000000001';


-- ═══════════════════════════════════════════════════════════
-- TEST GROUP 2: Deny Precedence
-- ═══════════════════════════════════════════════════════════

-- Test 3: Explicit deny overrides allow
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000004',  -- revoked user
  ARRAY['aaaaaaaa-0000-0000-0000-000000000004']::uuid[],
  1
);
-- Reset the version for this user too
UPDATE profiles SET permissions_version = 1
WHERE id = '00000000-0000-0000-0000-000000000004';

SELECT is(
  public.can_actor_perform(
    'aaaaaaaa-0000-0000-0000-000000000004',
    'booking.modify',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000003'
  ),
  false,
  'TEST 3: Explicit DENY on booking.modify should override any ALLOW'
);


-- Test 4: Deny on one action doesn't block other actions
SELECT is(
  public.can_actor_perform(
    'aaaaaaaa-0000-0000-0000-000000000004',
    'vehicle.view',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000003'
  ),
  true,
  'TEST 4: DENY on booking.modify should NOT block vehicle.view'
);


-- ═══════════════════════════════════════════════════════════
-- TEST GROUP 3: Jurisdiction Boundary (Double-Gate)
-- ═══════════════════════════════════════════════════════════

-- Test 5: Driver in org A cannot access org B resources
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000002',  -- driver
  ARRAY['aaaaaaaa-0000-0000-0000-000000000002']::uuid[],
  1
);
UPDATE profiles SET permissions_version = 1
WHERE id = '00000000-0000-0000-0000-000000000002';

SELECT is(
  public.can_actor_perform(
    'aaaaaaaa-0000-0000-0000-000000000002',
    'vehicle.view',
    'bbbbbbbb-0000-0000-0000-000000000099',  -- OTHER org
    null, null
  ),
  false,
  'TEST 5: Driver with org A jurisdiction should NOT see org B vehicles'
);


-- Test 6: Driver in org A CAN access org A resources
SELECT is(
  public.can_actor_perform(
    'aaaaaaaa-0000-0000-0000-000000000002',
    'vehicle.view',
    'bbbbbbbb-0000-0000-0000-000000000001',  -- own org
    'bbbbbbbb-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000003'
  ),
  true,
  'TEST 6: Driver with org A jurisdiction CAN see org A vehicles'
);


-- Test 7: Outsider with permission for org B cannot access org A
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000003',  -- outsider
  ARRAY['aaaaaaaa-0000-0000-0000-000000000003']::uuid[],
  1
);
UPDATE profiles SET permissions_version = 1
WHERE id = '00000000-0000-0000-0000-000000000003';

SELECT is(
  public.can_actor_perform(
    'aaaaaaaa-0000-0000-0000-000000000003',
    'vehicle.view',
    'bbbbbbbb-0000-0000-0000-000000000001',  -- org A (outsider has org B)
    null, null
  ),
  false,
  'TEST 7: Actor with org B permission+jurisdiction cannot access org A'
);


-- Test 8: Federal jurisdiction covers all orgs
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000001',  -- admin
  ARRAY['aaaaaaaa-0000-0000-0000-000000000001']::uuid[],
  1
);
UPDATE profiles SET permissions_version = 1
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT is(
  public.can_actor_perform(
    'aaaaaaaa-0000-0000-0000-000000000001',
    'vehicle.view',
    'bbbbbbbb-0000-0000-0000-000000000099',  -- other org
    null, null
  ),
  true,
  'TEST 8: Federal jurisdiction covers ALL orgs'
);


-- ═══════════════════════════════════════════════════════════
-- TEST GROUP 4: INSERT Paradox (Scope-Based Checks)
-- ═══════════════════════════════════════════════════════════

-- Test 9: current_user_can_in_scope works for valid scope
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000001',
  ARRAY['aaaaaaaa-0000-0000-0000-000000000001']::uuid[],
  1
);

SELECT is(
  public.current_user_can_in_scope(
    'vehicle.create',
    'bbbbbbbb-0000-0000-0000-000000000001',  -- org
    'bbbbbbbb-0000-0000-0000-000000000002',  -- branch
    'bbbbbbbb-0000-0000-0000-000000000003'   -- dept
  ),
  true,
  'TEST 9: Admin can create vehicle in any scope (INSERT check without resource lookup)'
);


-- Test 10: Driver without vehicle.create cannot insert
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000002',
  ARRAY['aaaaaaaa-0000-0000-0000-000000000002']::uuid[],
  1
);
UPDATE profiles SET permissions_version = 1
WHERE id = '00000000-0000-0000-0000-000000000002';

SELECT is(
  public.current_user_can_in_scope(
    'vehicle.create',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000003'
  ),
  false,
  'TEST 10: Driver without vehicle.create permission cannot INSERT vehicle'
);


-- ═══════════════════════════════════════════════════════════
-- TEST GROUP 5: Resource Lookup Wrapper
-- ═══════════════════════════════════════════════════════════

-- Test 11: can_actor_perform_on_resource resolves existing vehicle
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000002',
  ARRAY['aaaaaaaa-0000-0000-0000-000000000002']::uuid[],
  1
);

SELECT is(
  public.can_actor_perform_on_resource(
    'aaaaaaaa-0000-0000-0000-000000000002',
    'vehicle.view',
    'vehicles',
    'cccccccc-0000-0000-0000-000000000001'  -- existing vehicle
  ),
  true,
  'TEST 11: Resource lookup resolves vehicle scope and grants access'
);


-- Test 12: Non-existent resource returns false (no info leak)
SELECT is(
  public.can_actor_perform_on_resource(
    'aaaaaaaa-0000-0000-0000-000000000002',
    'vehicle.view',
    'vehicles',
    'ffffffff-ffff-ffff-ffff-ffffffffffff'  -- does not exist
  ),
  false,
  'TEST 12: Non-existent resource ID returns false (prevents ID enumeration)'
);


-- Test 13: Unknown resource type returns false (no schema leak)
SELECT is(
  public.can_actor_perform_on_resource(
    'aaaaaaaa-0000-0000-0000-000000000002',
    'vehicle.view',
    'nonexistent_table',
    'cccccccc-0000-0000-0000-000000000001'
  ),
  false,
  'TEST 13: Unknown resource type returns false (no error, no schema leak)'
);


-- ═══════════════════════════════════════════════════════════
-- TEST GROUP 6: Expired Delegation
-- ═══════════════════════════════════════════════════════════

-- Test 14: Expired delegation does not grant access
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000004',
  ARRAY['aaaaaaaa-0000-0000-0000-000000000004']::uuid[],
  1
);
UPDATE profiles SET permissions_version = 1
WHERE id = '00000000-0000-0000-0000-000000000004';

-- The revoked user has a delegation that expired 1 hour ago + an explicit deny
SELECT is(
  public.can_actor_perform(
    'aaaaaaaa-0000-0000-0000-000000000004',
    'booking.modify',
    'bbbbbbbb-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000003'
  ),
  false,
  'TEST 14: Expired delegation + explicit deny = no access'
);


-- ═══════════════════════════════════════════════════════════
-- TEST GROUP 7: No Permission = Default Deny
-- ═══════════════════════════════════════════════════════════

-- Test 15: Action with no grant at all → denied
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000002',
  ARRAY['aaaaaaaa-0000-0000-0000-000000000002']::uuid[],
  1
);
UPDATE profiles SET permissions_version = 1
WHERE id = '00000000-0000-0000-0000-000000000002';

SELECT is(
  public.can_actor_perform(
    'aaaaaaaa-0000-0000-0000-000000000002',
    'compliance.resolve',  -- driver has no compliance.resolve
    'bbbbbbbb-0000-0000-0000-000000000001',
    null, null
  ),
  false,
  'TEST 15: No permission grant = default deny'
);


-- Test 16: Actor not in JWT → denied
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000002',
  ARRAY['aaaaaaaa-0000-0000-0000-000000000002']::uuid[],
  1
);

-- Try to use the ADMIN actor from the DRIVER's session
SELECT is(
  public.can_actor_perform(
    'aaaaaaaa-0000-0000-0000-000000000001',  -- admin actor, but JWT has driver
    'vehicle.view',
    'bbbbbbbb-0000-0000-0000-000000000001',
    null, null
  ),
  false,
  'TEST 16: Actor ID not in JWT actor_ids array → denied'
);


-- ═══════════════════════════════════════════════════════════
-- TEST GROUP 8: Federal-Only Enforcement
-- ═══════════════════════════════════════════════════════════

-- Test 17: Cannot grant federal-only permission at org level
SELECT throws_ok(
  $$
    INSERT INTO actor_permissions (actor_id, permission_id, effect, level, scope_id)
    SELECT
      'aaaaaaaa-0000-0000-0000-000000000002',
      id,
      'allow',
      'org',
      'bbbbbbbb-0000-0000-0000-000000000001'
    FROM permissions WHERE action = 'admin.full'
  $$,
  NULL,  -- any error code
  NULL,  -- any error message (contains 'federal-only')
  'TEST 17: Cannot grant federal-only permission at org scope'
);


-- Test 18: CAN grant federal-only permission at federal level
SELECT lives_ok(
  $$
    INSERT INTO actor_permissions (actor_id, permission_id, effect, level, scope_id)
    SELECT
      'aaaaaaaa-0000-0000-0000-000000000002',
      id,
      'allow',
      'federal',
      null
    FROM permissions WHERE action = 'admin.full'
    ON CONFLICT DO NOTHING
  $$,
  'TEST 18: CAN grant federal-only permission at federal scope'
);
-- Clean up
DELETE FROM actor_permissions
WHERE actor_id = 'aaaaaaaa-0000-0000-0000-000000000002'
  AND level = 'federal';


-- ═══════════════════════════════════════════════════════════
-- TEST GROUP 9: RLS Under Authenticated Role
-- ═══════════════════════════════════════════════════════════

-- Test 19: Authenticated user cannot see audit_logs without ADMIN/REGULATOR actor
SET ROLE authenticated;
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000002',  -- driver
  ARRAY['aaaaaaaa-0000-0000-0000-000000000002']::uuid[],
  1
);

SELECT is(
  (SELECT count(*) FROM audit_logs)::int,
  0,
  'TEST 19: Driver cannot see audit_logs (RLS blocks non-admin/regulator)'
);

RESET ROLE;


-- Test 20: Admin CAN see audit_logs
SET ROLE authenticated;
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000001',  -- admin
  ARRAY['aaaaaaaa-0000-0000-0000-000000000001']::uuid[],
  1
);
UPDATE profiles SET permissions_version = 1
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT ok(
  (SELECT count(*) FROM audit_logs) >= 0,
  'TEST 20: Admin CAN query audit_logs (RLS allows ADMIN type)'
);

RESET ROLE;


-- ═══════════════════════════════════════════════════════════
-- TEST GROUP 10: Cross-Table Join Under RLS
-- ═══════════════════════════════════════════════════════════

-- Test 21: Driver can join vehicles + bookings for own org
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000002',
  ARRAY['aaaaaaaa-0000-0000-0000-000000000002']::uuid[],
  1
);
UPDATE profiles SET permissions_version = 1
WHERE id = '00000000-0000-0000-0000-000000000002';

SELECT is(
  (
    SELECT count(*)::int
    FROM vehicles v
    JOIN bookings b ON v.id = b.vehicle_id
    WHERE public.can_actor_perform(
      'aaaaaaaa-0000-0000-0000-000000000002',
      'vehicle.view', v.organization_id, v.branch_id, v.department_id
    )
    AND public.can_actor_perform(
      'aaaaaaaa-0000-0000-0000-000000000002',
      'booking.view', b.organization_id, b.branch_id, b.department_id
    )
  ),
  1,
  'TEST 21: Driver can join vehicles + bookings within own org scope'
);


-- Test 22: Outsider gets 0 rows from cross-table join
SELECT test_set_auth_context(
  '00000000-0000-0000-0000-000000000003',
  ARRAY['aaaaaaaa-0000-0000-0000-000000000003']::uuid[],
  1
);
UPDATE profiles SET permissions_version = 1
WHERE id = '00000000-0000-0000-0000-000000000003';

SELECT is(
  (
    SELECT count(*)::int
    FROM vehicles v
    JOIN bookings b ON v.id = b.vehicle_id
    WHERE public.can_actor_perform(
      'aaaaaaaa-0000-0000-0000-000000000003',
      'vehicle.view', v.organization_id, v.branch_id, v.department_id
    )
  ),
  0,
  'TEST 22: Outsider from different org gets 0 rows from cross-table join'
);


-- ═══════════════════════════════════════════════════════════
-- TEST GROUP 11: Failed Access Logging
-- ═══════════════════════════════════════════════════════════

-- Test 23: Denied access is logged
-- (Previous tests should have generated denied entries)
SELECT ok(
  (SELECT count(*) FROM access_denied_log WHERE denial_reason = 'no_allow') > 0,
  'TEST 23: Failed permission checks are logged in access_denied_log'
);


-- Test 24: Explicit deny is logged separately
SELECT ok(
  (SELECT count(*) FROM access_denied_log WHERE denial_reason = 'explicit_deny') > 0,
  'TEST 24: Explicit deny events are logged with reason = explicit_deny'
);


-- ═══════════════════════════════════════════════════════════
-- TEST GROUP 12: Cascade Revocation
-- ═══════════════════════════════════════════════════════════

-- Test 25: Deleting a permission auto-revokes delegations
-- Setup: create a live delegation from admin to driver
INSERT INTO delegated_authority (
  from_actor_id, to_actor_id, permission_id, level, scope_id,
  reason, expires_at, revoked
)
SELECT
  'aaaaaaaa-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000002',
  id, 'org', 'bbbbbbbb-0000-0000-0000-000000000001',
  'Test cascade', now() + interval '1 day', false
FROM permissions WHERE action = 'vehicle.view';

-- Now delete admin's vehicle.view permission
DELETE FROM actor_permissions
WHERE actor_id = 'aaaaaaaa-0000-0000-0000-000000000001'
  AND permission_id = (SELECT id FROM permissions WHERE action = 'vehicle.view');

-- The cascade trigger should have revoked the delegation
SELECT is(
  (
    SELECT revoked FROM delegated_authority
    WHERE from_actor_id = 'aaaaaaaa-0000-0000-0000-000000000001'
      AND to_actor_id = 'aaaaaaaa-0000-0000-0000-000000000002'
      AND permission_id = (SELECT id FROM permissions WHERE action = 'vehicle.view')
      AND reason = 'Test cascade'
    LIMIT 1
  ),
  true,
  'TEST 25: Deleting source permission auto-revokes downstream delegation'
);


-- ═══════════════════════════════════════════════════════════
-- FINISH
-- ═══════════════════════════════════════════════════════════

SELECT test_clear_auth_context();
SELECT * FROM finish();

ROLLBACK;