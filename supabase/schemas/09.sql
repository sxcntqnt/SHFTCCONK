-- =========================================================
-- 09_verify.sql
-- =========================================================
-- Post-deployment verification. Run each query and check the
-- expected result. DO NOT deploy this file — run manually.
--
-- After running: enable the JWT hook in Supabase Dashboard
--   Authentication → Hooks → Customize Access Token
--   → public.custom_access_token_hook
-- =========================================================


-- ─────────────────────────────────────────────────────────
-- 1. ALL TABLES EXIST
-- ─────────────────────────────────────────────────────────
-- PASS: 27 rows

select count(*) as table_count
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and table_name in (
    'roles', 'profiles', 'actors',
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
    'stripe_customers', 'contact_requests'
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
-- 4. NO SECURITY FUNCTIONS EXPOSED TO PUBLIC/ANON
-- ─────────────────────────────────────────────────────────
-- PASS: 0 rows

select p.proname as exposed_function, r.rolname as exposed_to
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public'
  and r.rolname in ('anon')
  and has_function_privilege(r.oid, p.oid, 'execute')
  and p.proname in (
    'can_actor_perform', 'can_actor_perform_on_resource',
    'current_user_can', 'current_user_can_in_scope',
    'get_actor_ids_for_user', 'get_cached_actor_ids',
    'scope_covers_resource', 'custom_access_token_hook',
    'log_access_denied', 'bump_permissions_version',
    'handle_new_user', 'bootstrap_session',
    'get_my_effective_permissions', 'redeem_invite',
    'enforce_federal_only', 'enforce_federal_only_in_group',
    'cascade_revoke_delegations', 'log_permission_change',
    'set_updated_at', 'create_default_org_policy_groups'
  )
order by p.proname;


-- ─────────────────────────────────────────────────────────
-- 5. RLS ENABLED ON ALL TABLES
-- ─────────────────────────────────────────────────────────
-- PASS: all listed tables show rowsecurity = true

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles', 'actors', 'organizations', 'branches', 'departments',
    'vehicles', 'bookings', 'stage_assignments',
    'driver_assignments', 'conductor_assignments',
    'fleet_ownership', 'organization_members',
    'compliance_events', 'reconciliation_events',
    'actor_requests', 'invite_tokens', 'audit_logs',
    'access_denied_log', 'stripe_customers', 'contact_requests'
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
-- DEPLOYMENT COMPLETE CHECKLIST
-- ─────────────────────────────────────────────────────────
--
-- After all queries pass:
--
--  [ ] Enable JWT hook in Supabase Dashboard
--      Authentication → Hooks → Customize Access Token
--      → public.custom_access_token_hook
--
--  [ ] Test login flow end-to-end:
--      Sign up → profile created → PASSENGER actor created
--      → bootstrap_session returns data → frontend renders
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
--  [ ] Monitor access_denied_log for first 24h after deploy