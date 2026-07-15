-- =========================================================
-- 09_verify.sql
-- =========================================================
-- Post-deployment verification. Run each query and check the
-- expected result. DO NOT deploy this file — run manually.
--
-- After running: confirm the auth-service is setting
--   app.current_profile_id per-transaction before any query
--   runs (app_backend role/grants: see 00_extensions_domains.sql & 08_privileges.sql).
-- =========================================================


-- ─────────────────────────────────────────────────────────
-- 1. ALL TABLES EXIST
-- ─────────────────────────────────────────────────────────
-- PASS: 28 rows
-- (28 original + identity_accounts, minus stripe_customers which was dropped)

select count(*) as table_count
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and table_name in (
    'roles', 'profiles', 'actors',
    'identity_accounts',
    'organizations', 'branches', 'departments',
    'actor_jurisdictions', 'permissions', 'actor_permissions',
    'policy_groups', 'policy_group_permissions', 'actor_policy_groups',
    'delegated_authority',
    'vehicles', 'bookings', 'stage_assignments',
    'driver_assignments', 'conductor_assignments',
    'fleet_ownership', 'organization_members',
    'compliance_events', 'reconciliation_events',
    'actor_requests', 'invite_tokens', 'audit_logs',
    'access_denied_log',
    'contact_requests'
  );


-- ─────────────────────────────────────────────────────────
-- 2. VIEWS EXIST
-- ─────────────────────────────────────────────────────────
-- PASS: 2 rows

select viewname from pg_views
where schemaname = 'public'
  and viewname in ('effective_permissions_raw', 'my_permissions')
order by viewname;


-- ─────────────────────────────────────────────────────────
-- 3. ALL SECURITY DEFINER FUNCTIONS HAVE search_path
-- ─────────────────────────────────────────────────────────
-- PASS: 0 rows (no unprotected functions)

select p.proname as function_missing_search_path
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
  and pg_get_functiondef(p.oid) not ilike '%set search_path%'
order by p.proname;


-- ─────────────────────────────────────────────────────────
-- 4. NO SECURITY FUNCTIONS EXPOSED TO PUBLIC
-- ─────────────────────────────────────────────────────────
-- PASS: 0 rows
-- (There is no Supabase anon role on Neon — public is the only
-- catch-all principal left to check.)

select p.proname as exposed_function, r.rolname as exposed_to
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public'
  and r.rolname in ('public')
  and has_function_privilege(r.oid, p.oid, 'execute')
  and p.proname in (
    'can_actor_perform', 'can_actor_perform_on_resource',
    'current_user_can', 'current_user_can_in_scope',
    'get_actor_ids_for_user', 'get_cached_actor_ids',
    'get_current_profile_id',
    'scope_covers_resource',
    'log_access_denied', 'bump_permissions_version',
    'bootstrap_session',
    'get_my_effective_permissions', 'redeem_invite',
    'enforce_federal_only', 'enforce_federal_only_in_group',
    'cascade_revoke_delegations', 'log_permission_change',
    'set_updated_at', 'create_default_org_policy_groups',
    'current_user_is_platform_admin', 'current_user_manages_profile'
  )
order by p.proname;


-- ─────────────────────────────────────────────────────────
-- 4b. EVERY POLICY IS EXPLICITLY SCOPED TO app_backend
-- ─────────────────────────────────────────────────────────
-- PASS: 0 rows
-- Postgres defaults a policy with no TO clause to PUBLIC (every
-- role). Not functionally wrong right now (app_backend matches
-- PUBLIC too), but a latent risk: any leftover/reintroduced role
-- (authenticated, anon, etc.) would also match a PUBLIC-scoped
-- policy. Every policy in this schema should list app_backend
-- explicitly in pg_policies.roles.

select schemaname, tablename, policyname, roles
from pg_policies
where schemaname = 'public'
  and not ('app_backend' = any(roles));


-- ─────────────────────────────────────────────────────────
-- 4c. effective_permissions_raw SECURITY_INVOKER — CHECKED, NOT ASSUMED
-- ─────────────────────────────────────────────────────────
-- EXPECTED: reloptions does NOT contain 'security_invoker=true'.
-- This is deliberate (see the comment above the view definition in
-- 04_views.sql) — the view runs as its owner and the actual
-- per-user filter is the explicit actor_id join inside
-- my_permissions, not RLS on the underlying permission tables.
-- If this ever shows security_invoker=true unexpectedly (or someone
-- flips it without reading that comment), re-verify my_permissions
-- still returns correct results for a non-admin actor — it may
-- start silently under-returning if app_backend lacks broad-enough
-- read policies on actor_permissions/policy_group_permissions/
-- delegated_authority once RLS is actually re-evaluated per-caller.

select relname, reloptions
from pg_class
where relname = 'effective_permissions_raw';


-- ─────────────────────────────────────────────────────────
-- 5. RLS ENABLED ON ALL TABLES
-- ─────────────────────────────────────────────────────────
-- PASS: all listed tables show rowsecurity = true

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles', 'identity_accounts', 'actors',
    'organizations', 'branches', 'departments',
    'vehicles', 'bookings', 'stage_assignments',
    'driver_assignments', 'conductor_assignments',
    'fleet_ownership', 'organization_members',
    'compliance_events', 'reconciliation_events',
    'actor_requests', 'invite_tokens', 'audit_logs',
    'access_denied_log', 'permissions', 'geofences',
    'mpesa_customers', 'contact_requests'
  )
order by tablename;


-- ─────────────────────────────────────────────────────────
-- 6. COVERING INDEXES EXIST
-- ─────────────────────────────────────────────────────────
-- PASS: all 9 covering indexes present

select indexname from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_actor_permissions_covering',
    'idx_actor_jurisdictions_covering',
    'idx_permissions_action_covering',
    'idx_actor_policy_groups_covering',
    'idx_policy_group_permissions_covering',
    'idx_delegated_authority_covering',
    'idx_vehicles_scope',
    'idx_bookings_scope',
    'idx_access_denied_monitoring'
  )
order by indexname;


-- ─────────────────────────────────────────────────────────
-- 7. ALL TRIGGERS EXIST
-- ─────────────────────────────────────────────────────────
-- PASS: 12 triggers

select trigger_name, event_object_table, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;


-- ─────────────────────────────────────────────────────────
-- 8. ROLES SEEDED
-- ─────────────────────────────────────────────────────────
-- PASS: 9 rows

select id, display_name from roles order by id;


-- ─────────────────────────────────────────────────────────
-- 9. PERMISSIONS SEEDED
-- ─────────────────────────────────────────────────────────
-- PASS: 30 rows

select action, federal_only from permissions order by action;


-- ─────────────────────────────────────────────────────────
-- 10. FEDERAL POLICY GROUPS SEEDED
-- ─────────────────────────────────────────────────────────
-- PASS: 3 rows (Platform Admin, Regulator, Planner)

select pg.name, pg.organization_id, count(pgp.id) as permission_count
from policy_groups pg
left join policy_group_permissions pgp on pgp.group_id = pg.id
where pg.organization_id is null
group by pg.name, pg.organization_id
order by pg.name;


-- ─────────────────────────────────────────────────────────
-- 11. permissions_version COLUMN EXISTS
-- ─────────────────────────────────────────────────────────
-- PASS: returns 'integer'

select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'permissions_version';


-- ─────────────────────────────────────────────────────────
-- 12. INSERT POLICIES USE current_user_can_in_scope
-- ─────────────────────────────────────────────────────────
-- PASS: vehicles_insert and bookings_insert use _in_scope

select polname, pg_get_expr(polwithcheck, polrelid) as with_check
from pg_policy
where polrelid in ('vehicles'::regclass, 'bookings'::regclass)
  and polname like '%insert%';


-- ─────────────────────────────────────────────────────────
-- 13. FEDERAL-ONLY ENFORCEMENT TEST
-- ─────────────────────────────────────────────────────────
-- PASS: this INSERT should fail with "federal-only" error
-- (Uncomment to test, then rollback)

/*
do $$
declare
  admin_perm_id uuid;
begin
  select id into admin_perm_id from permissions where action = 'admin.full';

  -- This should raise: "Permission is federal-only..."
  insert into actor_permissions (
    actor_id, permission_id, effect, level, scope_id
  ) values (
    gen_random_uuid(),  -- fake actor
    admin_perm_id,
    'allow',
    'org',              -- non-federal scope — should be blocked
    gen_random_uuid()
  );

  raise exception 'TEST FAILED: federal_only enforcement did not fire';
exception
  when others then
    if sqlerrm like '%federal-only%' then
      raise notice 'TEST PASSED: federal_only enforcement working';
    else
      raise;
    end if;
end;
$$;
*/


-- ─────────────────────────────────────────────────────────
-- 14. IDENTITY ACCOUNTS — structure and trigger wiring
-- ─────────────────────────────────────────────────────────

-- 14a. identity_accounts table has expected columns
-- PASS: 5 rows (id, profile_id, provider, provider_subject, created_at)
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'identity_accounts'
order by ordinal_position;

-- 14b. Unique constraint exists on (provider, provider_subject)
-- PASS: 1 row
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'identity_accounts'
  and indexdef ilike '%provider%provider_subject%';

-- 14c. profiles.id has NO foreign key to any auth-provider table
-- PASS: 0 rows
-- (any row here means an old auth-provider FK was not dropped)
select
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema as foreign_schema,
  ccu.table_name as foreign_table
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.table_name = 'profiles'
  and tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_schema <> 'public';

-- 14d. mpesa_customers references profiles, not an auth-provider table
-- (stripe_customers dropped — this replaces it as the billing table check)
-- PASS: 1 row with foreign_table = 'profiles'
select
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name as foreign_table
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.table_name = 'mpesa_customers'
  and tc.constraint_type = 'FOREIGN KEY';

-- 14e. After a test signup via the auth-service: verify identity_accounts
-- was wired correctly. Replace '<provider-subject>' with the actual
-- provider_subject the auth-service created for your test account.
-- PASS: 1 row with provider='internal', profile_id != provider_subject
/*
select
  ia.provider,
  ia.provider_subject   as auth_service_subject,
  ia.profile_id         as canonical_profile_id,
  ia.profile_id::text != ia.provider_subject as ids_are_decoupled
from identity_accounts ia
where ia.provider = 'internal'
  and ia.provider_subject = '<provider-subject>';
*/

-- 14f. get_current_profile_id() function exists
-- PASS: 1 row
select p.proname, p.prosecdef
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_current_profile_id';

-- 14g. app.current_profile_id resolves for the current session
-- PASS (with the GUC set): a UUID matching profiles.id
-- PASS (with the GUC unset): NULL
-- Run with: set local app.current_profile_id = '<a real profiles.id>';
select public.get_current_profile_id();


-- ─────────────────────────────────────────────────────────
-- DEPLOYMENT COMPLETE CHECKLIST
-- ─────────────────────────────────────────────────────────
--
-- After all queries pass:
--
--  [ ] Confirm the auth-service sets app.current_profile_id on the
--      connection (pg.ts's withProfileContext) before any query runs
--      in a request's transaction — this is a hard runtime dependency
--      now, not a DB-internal fallback.
--
--  [ ] Test login flow end-to-end:
--      Sign up via auth-service → profile created → identity_accounts
--      row inserted (provider='internal') → PASSENGER actor created
--      → bootstrap_session returns data → frontend renders correctly
--
--  [ ] Verify identity resolution:
--      set local app.current_profile_id = '<a real profiles.id>';
--      select public.get_current_profile_id();
--      -- must return that same UUID
--
--  [ ] Test invite flow:
--      Create invite_token → sign up with ?invite= param
--      → actor + jurisdiction + policy group created
--
--  [ ] Test permission checks:
--      Vehicle INSERT by org admin → succeeds
--      Vehicle INSERT by passenger → denied
--      Vehicle SELECT by driver in same org → succeeds
--      Vehicle SELECT by driver in different org → denied
--
--  [ ] Verify EXPLAIN ANALYZE on my_permissions shows Index Scans
--      (not Seq Scans) on permission tables
--
--  [ ] Assign a test actor type='ADMIN' (or 'SUPER_ADMIN') and confirm
--      current_user_is_platform_admin() returns true and
--      app_backend_admin_select permits the row (03_functions.sql & 06_rls.sql)
--
--  [ ] Monitor access_denied_log for first 24h after deploy
