-- =========================================================
-- 05_triggers.sql
-- =========================================================
-- All triggers. Must run AFTER 03_functions.sql (functions
-- must exist before triggers reference them).
--
-- Categories:
--   A. Lifecycle (updated_at, new user)
--   B. Audit (permission change logging)
--   C. Version bumping (instant revocation)
--   D. Validation (federal_only enforcement)
--   E. Cascade (delegation revocation)
-- =========================================================


-- ═══════════════════════════════════════════════════════════
-- A. LIFECYCLE
-- ═══════════════════════════════════════════════════════════

-- Auto-update updated_at on profiles
create trigger profiles_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile + PASSENGER actor on auth signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at on org_news
create trigger on_org_news_update
  before update on public.org_news
  for each row execute function public.handle_org_news_updated_at();


-- ═══════════════════════════════════════════════════════════
-- B. AUDIT (permission change logging)
-- ═══════════════════════════════════════════════════════════

create trigger audit_actor_permissions
  after insert or update or delete on actor_permissions
  for each row execute function public.log_permission_change();

create trigger audit_actor_policy_groups
  after insert or update or delete on actor_policy_groups
  for each row execute function public.log_permission_change();

create trigger audit_delegated_authority
  after insert or update or delete on delegated_authority
  for each row execute function public.log_permission_change();


-- ═══════════════════════════════════════════════════════════
-- C. VERSION BUMPING (instant JWT kill-switch)
-- ═══════════════════════════════════════════════════════════
-- Bumps profiles.permissions_version whenever the user's
-- permission landscape changes. Mismatched JWT version
-- causes my_permissions to return zero rows.

create trigger bump_version_on_actor_permissions
  after insert or update or delete on actor_permissions
  for each row execute function public.bump_permissions_version();

create trigger bump_version_on_actor_policy_groups
  after insert or update or delete on actor_policy_groups
  for each row execute function public.bump_permissions_version();

create trigger bump_version_on_actor_jurisdictions
  after insert or update or delete on actor_jurisdictions
  for each row execute function public.bump_permissions_version();

create trigger bump_version_on_delegated_authority
  after insert or update or delete on delegated_authority
  for each row execute function public.bump_permissions_version();


-- ═══════════════════════════════════════════════════════════
-- D. VALIDATION (federal_only enforcement)
-- ═══════════════════════════════════════════════════════════
-- Prevents granting federal-only permissions at non-federal scope.

create trigger enforce_federal_only_on_actor_permissions
  before insert or update on actor_permissions
  for each row execute function public.enforce_federal_only();

create trigger enforce_federal_only_on_group_permissions
  before insert or update on policy_group_permissions
  for each row execute function public.enforce_federal_only_in_group();


-- ═══════════════════════════════════════════════════════════
-- E. CASCADE (delegation revocation)
-- ═══════════════════════════════════════════════════════════
-- When a direct permission is deleted or flipped to deny,
-- any delegations the actor made for that permission are
-- automatically revoked.

create trigger cascade_revoke_on_permission_change
  after update or delete on actor_permissions
  for each row execute function public.cascade_revoke_delegations();