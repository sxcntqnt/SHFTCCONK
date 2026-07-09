-- =========================================================
-- 08_privileges.sql
-- =========================================================
-- Privilege lockdown. Must run LAST (after all functions,
-- views, triggers, and seed data exist).
--
-- Principle: revoke everything from public, then grant only
-- what the app_backend role actually needs.
--
-- NEON MIGRATION: There is a single application DB role now —
-- app_backend — used by the auth-service for every request, with
-- identity resolved per transaction via the app.current_profile_id
-- session GUC. The old Supabase role tiers (anon / authenticated /
-- supabase_auth_admin / service_role) do not exist on Neon; granting
-- to them here would fail with "role does not exist".
--
-- Two tiers:
--   1. Callable by app_backend (RLS helpers, RPCs)
--   2. Not callable at all (triggers, internal helpers)
-- =========================================================


-- ═══════════════════════════════════════════════════════════
-- SECTION 0: APP_BACKEND ROLE GRANTS
-- ═══════════════════════════════════════════════════════════
-- The role itself is created in 00_extensions_domains.sql (must
-- exist before 06_rls.sql's `to app_backend` policies can be
-- created). Table grants for the profiles-recursion-fix helper
-- functions and the identity/actor resolution path
-- (03_functions.sql, 06_rls.sql) go here, after those objects exist.

grant select, insert, update, delete on public.profiles to app_backend;
grant select, insert, update, delete on public.identity_accounts to app_backend;
grant select on public.actors to app_backend;
grant select on public.organization_members to app_backend;
grant execute on function public.current_user_is_platform_admin() to app_backend;
grant execute on function public.current_user_manages_profile(uuid) to app_backend;


-- ═══════════════════════════════════════════════════════════
-- TIER 1: APP_BACKEND
-- ═══════════════════════════════════════════════════════════
-- These functions are called by RLS policies (which run as
-- app_backend, since it is NOBYPASSRLS) or directly via RPC.

-- Permission engine
revoke execute on function public.can_actor_perform from public;
grant execute on function public.can_actor_perform to app_backend;

revoke execute on function public.can_actor_perform_on_resource from public;
grant execute on function public.can_actor_perform_on_resource to app_backend;

revoke execute on function public.current_user_can from public;
grant execute on function public.current_user_can to app_backend;

revoke execute on function public.current_user_can_in_scope from public;
grant execute on function public.current_user_can_in_scope to app_backend;

-- Helpers used by RLS
revoke execute on function public.scope_covers_resource from public;
grant execute on function public.scope_covers_resource to app_backend;

revoke execute on function public.get_cached_actor_ids from public;
grant execute on function public.get_cached_actor_ids to app_backend;

revoke execute on function public.get_actor_ids_for_user from public;
grant execute on function public.get_actor_ids_for_user to app_backend;

-- Canonical profile resolution — called by RLS self-owned policies
-- and any function that needs the session-scoped profile_id
revoke execute on function public.get_current_profile_id from public;
grant execute on function public.get_current_profile_id to app_backend;

-- RPC endpoints
revoke execute on function public.bootstrap_session from public;
grant execute on function public.bootstrap_session to app_backend;

revoke execute on function public.get_my_effective_permissions from public;
grant execute on function public.get_my_effective_permissions to app_backend;

revoke execute on function public.redeem_invite from public;
grant execute on function public.redeem_invite to app_backend;

revoke execute on function public.create_profile from public;
grant execute on function public.create_profile to app_backend;

-- Org setup helper (called by admin tooling)
revoke execute on function public.create_default_org_policy_groups from public;
grant execute on function public.create_default_org_policy_groups to app_backend;


-- ═══════════════════════════════════════════════════════════
-- TIER 2: NOT CALLABLE (triggers + internal)
-- ═══════════════════════════════════════════════════════════
-- These functions are only invoked by Postgres triggers or by
-- other SECURITY DEFINER functions. No role should call them.

revoke execute on function public.set_updated_at from public, app_backend;
revoke execute on function public.log_permission_change from public, app_backend;
revoke execute on function public.bump_permissions_version from public, app_backend;
revoke execute on function public.enforce_federal_only from public, app_backend;
revoke execute on function public.enforce_federal_only_in_group from public, app_backend;
revoke execute on function public.cascade_revoke_delegations from public, app_backend;
revoke execute on function public.log_access_denied from public, app_backend;


-- ═══════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════

-- Raw view: internal only (read by SECURITY DEFINER functions)
revoke all on public.effective_permissions_raw from public, app_backend;

-- User-scoped view: app_backend only
revoke all on public.my_permissions from public;
grant select on public.my_permissions to app_backend;
