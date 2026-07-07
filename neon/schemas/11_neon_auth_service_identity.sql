-- =========================================================
-- 11_neon_auth_service_identity.sql
-- =========================================================
-- DELTA migration: ports the auth-service / Neon identity model into
-- the schema. This file contains ONLY what is missing from (or must
-- override in) the existing schema to fix the profiles RLS recursion
-- and drop Supabase as the auth system.
--
-- TARGET MODEL (per decision):
--   • Identity resolved from session variable app.current_profile_id,
--     set per-transaction by the auth-service's withProfileContext —
--     NOT auth.uid() / Supabase.
--   • Single app_backend role performs all DB access.
--   • profiles admin/manager policies no longer call my_permissions
--     (which reads profiles → recursion). They use two SECURITY DEFINER
--     helpers that read only actors / organization_members.
--
-- RECONCILIATION (admin-model choice): the helper functions gate on
-- actors.type literals (SUPER_ADMIN, GENERAL_MANAGER, …) that do NOT
-- exist in the roles table yet, so we seed them. Without this the
-- policies would match zero rows and silently revoke all admin access.
--
-- NOT included (deliberately):
--   • identity_accounts UNIQUE (provider, provider_subject) — already
--     exists as identity_accounts_provider_provider_subject_key.
--   • permissions table lockdown — schema/columns unconfirmed.
--   • The broader Supabase leftovers (auth.users trigger, auth.jwt()
--     in is_jwt_version_current) have been removed as part of the
--     schema-wide Supabase cleanup — no follow-up needed for those.
-- =========================================================


-- ═══════════════════════════════════════════════════════════
-- SECTION 0 — APP_BACKEND ROLE
-- ═══════════════════════════════════════════════════════════
-- Password MUST be injected via Vault at deploy time — never commit a
-- real literal. Re-run safe: CREATE ROLE errors on duplicate, so guard it.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_backend') then
    execute 'create role app_backend with
      login
      password ''CHANGE_ME_VIA_VAULT''
      nosuperuser
      nobypassrls
      nocreatedb
      nocreaterole';
  end if;
end $$;


-- ═══════════════════════════════════════════════════════════
-- SECTION 1 — ROLE RECONCILIATION (missing actor types)
-- ═══════════════════════════════════════════════════════════
-- Seed the actor-type ids the Neon helper functions check against.
-- Existing schema only had: PASSENGER, DRIVER, CONDUCTOR, OWNER,
-- ORGANIZATION, STAGE_OPERATOR, REGULATOR, PLANNER, ADMIN.
insert into roles (id, display_name, description) values
  ('SUPER_ADMIN',        'Super Admin',        'Global platform super-administrator'),
  ('GENERAL_MANAGER',    'General Manager',    'Org general manager'),
  ('FLEET_MANAGER',      'Fleet Manager',      'Org fleet manager'),
  ('OPERATIONS_MANAGER', 'Operations Manager', 'Org operations manager'),
  ('BRANCH_MANAGER',     'Branch Manager',     'Org branch manager'),
  ('ORG_CHAIR',          'Org Chair',          'Org governing-chair role')
on conflict (id) do nothing;


-- ═══════════════════════════════════════════════════════════
-- SECTION 2 — IDENTITY HELPERS (new)
-- ═══════════════════════════════════════════════════════════
-- NOTE: get_current_profile_id() is now defined in 03_functions.sql
-- (session-variable resolver). These two helpers are the additional
-- non-recursive checks required to break the profiles RLS loop.

-- Platform-admin check: reads actors only (never profiles) → no recursion.
CREATE OR REPLACE FUNCTION public.current_user_is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM actors a
    WHERE a.profile_id = public.get_current_profile_id()
      AND a.type IN ('SUPER_ADMIN', 'ADMIN')
      AND a.status = 'active'
  );
$$;

-- Org-manager check: reads actors + organization_members only → no recursion.
CREATE OR REPLACE FUNCTION public.current_user_manages_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM actors caller_actor
    JOIN organization_members caller_om
      ON caller_om.actor_id = caller_actor.id
    JOIN organization_members target_om
      ON target_om.organization_id = caller_om.organization_id
    JOIN actors target_actor
      ON target_actor.id = target_om.actor_id
      AND target_actor.profile_id = target_profile_id
    WHERE caller_actor.profile_id = public.get_current_profile_id()
      AND caller_actor.status = 'active'
      AND caller_actor.type IN (
        'GENERAL_MANAGER', 'FLEET_MANAGER', 'OPERATIONS_MANAGER',
        'BRANCH_MANAGER', 'ORG_CHAIR'
      )
  );
$$;


-- ═══════════════════════════════════════════════════════════
-- SECTION 3 — GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO app_backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.identity_accounts TO app_backend;
GRANT SELECT ON public.actors TO app_backend;
GRANT SELECT ON public.organization_members TO app_backend;
GRANT EXECUTE ON FUNCTION public.get_current_profile_id() TO app_backend;
GRANT EXECUTE ON FUNCTION public.current_user_is_platform_admin() TO app_backend;
GRANT EXECUTE ON FUNCTION public.current_user_manages_profile(uuid) TO app_backend;


-- ═══════════════════════════════════════════════════════════
-- SECTION 4 — ENABLE RLS (idempotent)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_accounts ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════
-- SECTION 5 — IDENTITY_ACCOUNTS POLICY
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS app_backend_full_access ON public.identity_accounts;
CREATE POLICY app_backend_full_access ON public.identity_accounts
  FOR ALL
  TO app_backend
  USING (true)
  WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════
-- SECTION 6 — PROFILES POLICIES (fix recursion)
-- ═══════════════════════════════════════════════════════════
-- Drop the three recursive policies that called my_permissions
-- (which reads profiles → 42P17 infinite loop). The self policies
-- (profiles_select_self / insert_self / update_self) already exist in
-- 06_rls.sql and remain valid now that get_current_profile_id() uses
-- the session variable, so they are left untouched.

DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_org_manager" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

-- Platform admins: full read/write on ANY profile.
CREATE POLICY app_backend_admin_select ON public.profiles
  FOR SELECT
  TO app_backend
  USING (public.current_user_is_platform_admin());

CREATE POLICY app_backend_admin_update ON public.profiles
  FOR UPDATE
  TO app_backend
  USING (public.current_user_is_platform_admin());

-- Org managers: read access to profiles they manage.
CREATE POLICY app_backend_manager_select ON public.profiles
  FOR SELECT
  TO app_backend
  USING (public.current_user_manages_profile(profiles.id));
