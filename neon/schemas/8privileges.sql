-- =========================================================
-- 08_privileges.sql
-- =========================================================
-- Privilege lockdown. Must run LAST (after all functions,
-- views, triggers, and seed data exist).
--
-- Principle: revoke everything from public/anon, then grant
-- only what each role actually needs.
--
-- Tiers:
--   1. Callable by the app_backend role (RLS helpers, RPCs)
--   2. Not callable at all (triggers, internal helpers)
-- =========================================================


-- ═══════════════════════════════════════════════════════════
-- TIER 1: AUTHENTICATED USERS
-- ═══════════════════════════════════════════════════════════
-- These functions are called by RLS policies (which run as
  -- the app_backend role) or directly via RPC.

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
  -- and any function that needs to resolve the session profile id
revoke execute on function public.get_current_profile_id from public;
grant execute on function public.get_current_profile_id to app_backend;

-- RPC endpoints
revoke execute on function public.bootstrap_session from public;
grant execute on function public.bootstrap_session to app_backend;

revoke execute on function public.get_my_effective_permissions from public;
grant execute on function public.get_my_effective_permissions to app_backend;

revoke execute on function public.redeem_invite from public;
grant execute on function public.redeem_invite to app_backend;

-- Org setup helper (called by admin tooling)
revoke execute on function public.create_default_org_policy_groups from public;
grant execute on function public.create_default_org_policy_groups to app_backend;


-- ═══════════════════════════════════════════════════════════
-- TIER 2: NOT CALLABLE (triggers + internal)
-- ═══════════════════════════════════════════════════════════
-- These functions are only invoked by Postgres triggers or by
-- other SECURITY DEFINER functions. No role should call them.

revoke execute on function public.set_updated_at from public;
revoke execute on function public.log_permission_change from public;
revoke execute on function public.bump_permissions_version from public;
revoke execute on function public.enforce_federal_only from public;
revoke execute on function public.enforce_federal_only_in_group from public;
revoke execute on function public.cascade_revoke_delegations from public;
revoke execute on function public.log_access_denied from public;


-- ═══════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════

-- Raw view: internal only (read by SECURITY DEFINER functions)
revoke all on public.effective_permissions_raw from public;

-- User-scoped view: authenticated users only
revoke all on public.my_permissions from public;
grant select on public.my_permissions to app_backend;
