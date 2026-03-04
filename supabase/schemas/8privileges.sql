-- =========================================================
-- 08_privileges.sql
-- =========================================================
-- Privilege lockdown. Must run LAST (after all functions,
-- views, triggers, and seed data exist).
--
-- Principle: revoke everything from public/anon, then grant
-- only what each role actually needs.
--
-- Three tiers:
--   1. Callable by authenticated users (RLS helpers, RPCs)
--   2. Callable only by supabase_auth_admin (JWT hook)
--   3. Not callable at all (triggers, internal helpers)
-- =========================================================


-- ═══════════════════════════════════════════════════════════
-- TIER 1: AUTHENTICATED USERS
-- ═══════════════════════════════════════════════════════════
-- These functions are called by RLS policies (which run as
-- the authenticated user) or directly via supabase.rpc().

-- Permission engine
revoke execute on function public.can_actor_perform from public, anon;
grant execute on function public.can_actor_perform to authenticated;

revoke execute on function public.can_actor_perform_on_resource from public, anon;
grant execute on function public.can_actor_perform_on_resource to authenticated;

revoke execute on function public.current_user_can from public, anon;
grant execute on function public.current_user_can to authenticated;

revoke execute on function public.current_user_can_in_scope from public, anon;
grant execute on function public.current_user_can_in_scope to authenticated;

-- Helpers used by RLS
revoke execute on function public.scope_covers_resource from public, anon;
grant execute on function public.scope_covers_resource to authenticated;

revoke execute on function public.get_cached_actor_ids from public, anon;
grant execute on function public.get_cached_actor_ids to authenticated;

revoke execute on function public.get_actor_ids_for_user from public, anon;
grant execute on function public.get_actor_ids_for_user to authenticated;

revoke execute on function public.is_jwt_version_current from public, anon;
grant execute on function public.is_jwt_version_current to authenticated;

-- RPC endpoints
revoke execute on function public.bootstrap_session from public, anon;
grant execute on function public.bootstrap_session to authenticated;

revoke execute on function public.get_my_effective_permissions from public, anon;
grant execute on function public.get_my_effective_permissions to authenticated;

revoke execute on function public.redeem_invite from public, anon;
grant execute on function public.redeem_invite to authenticated;

-- Org setup helper (called by admin tooling)
revoke execute on function public.create_default_org_policy_groups from public, anon;
grant execute on function public.create_default_org_policy_groups to authenticated;


-- ═══════════════════════════════════════════════════════════
-- TIER 2: SUPABASE AUTH ADMIN ONLY (JWT hook)
-- ═══════════════════════════════════════════════════════════

revoke execute on function public.custom_access_token_hook from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- The hook reads these tables
grant select on public.actors to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;


-- ═══════════════════════════════════════════════════════════
-- TIER 3: NOT CALLABLE (triggers + internal)
-- ═══════════════════════════════════════════════════════════
-- These functions are only invoked by Postgres triggers or by
-- other SECURITY DEFINER functions. No role should call them.

revoke execute on function public.handle_new_user from public, anon, authenticated;
revoke execute on function public.set_updated_at from public, anon, authenticated;
revoke execute on function public.log_permission_change from public, anon, authenticated;
revoke execute on function public.bump_permissions_version from public, anon, authenticated;
revoke execute on function public.enforce_federal_only from public, anon, authenticated;
revoke execute on function public.enforce_federal_only_in_group from public, anon, authenticated;
revoke execute on function public.cascade_revoke_delegations from public, anon, authenticated;
revoke execute on function public.log_access_denied from public, anon, authenticated;


-- ═══════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════

-- Raw view: internal only (read by SECURITY DEFINER functions)
revoke all on public.effective_permissions_raw from public, anon, authenticated;

-- User-scoped view: authenticated users only
revoke all on public.my_permissions from public, anon;
grant select on public.my_permissions to authenticated;