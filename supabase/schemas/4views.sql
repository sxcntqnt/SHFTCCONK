-- =========================================================
-- 04_views.sql
-- =========================================================
-- Two views:
--   1. effective_permissions_raw  — unfiltered base (internal only)
--   2. my_permissions             — user-scoped, double-gated, versioned
--
-- Must run AFTER 03_functions.sql (depends on
-- get_cached_actor_ids, scope_covers_resource).
--
-- Must run BEFORE 06_rls.sql (RLS functions read my_permissions).
-- =========================================================


-- ─────────────────────────────────────────────────────────
-- RAW EFFECTIVE PERMISSIONS
-- ─────────────────────────────────────────────────────────
-- Unfiltered union of all permission sources.
-- NOT exposed to any user role — only read by my_permissions
-- and by SECURITY DEFINER functions.

create or replace view public.effective_permissions_raw as

  -- Direct actor permissions
  select
    ap.actor_id,
    p.action,
    ap.effect::text,
    ap.level::text,
    ap.scope_id,
    'direct'::text as source
  from actor_permissions ap
  join permissions p on p.id = ap.permission_id
  where (ap.expires_at is null or ap.expires_at > now())

  union all

  -- Policy group permissions
  select
    apg.actor_id,
    p.action,
    pgp.effect::text,
    apg.level::text,
    apg.scope_id,
    'group:' || pg.name as source
  from actor_policy_groups apg
  join policy_group_permissions pgp on pgp.group_id = apg.group_id
  join permissions p on p.id = pgp.permission_id
  join policy_groups pg on pg.id = apg.group_id

  union all

  -- Delegated authority (active only)
  select
    da.to_actor_id as actor_id,
    p.action,
    'allow'::text as effect,
    da.level::text,
    da.scope_id,
    'delegated_from:' || da.from_actor_id as source
  from delegated_authority da
  join permissions p on p.id = da.permission_id
  where da.revoked = false
    and da.expires_at > now();


-- ─────────────────────────────────────────────────────────
-- USER-SCOPED PERMISSIONS (the "Double-Gate" view)
-- ─────────────────────────────────────────────────────────
-- Filters effective_permissions_raw to:
--   1. Only the current user's actors (from JWT → O(1))
--   2. Only where jurisdiction COVERS the permission scope
--   3. Only if JWT version matches DB version (kill-switch)
--
-- security_invoker = true means the view runs as the calling
-- user, so RLS on underlying tables still applies if present.

create or replace view public.my_permissions
with (security_invoker = true)
as
with current_user_state as (
  select
    p.id as profile_id,
    p.permissions_version as db_version,
    coalesce((auth.jwt()->>'permissions_version')::int, 0) as jwt_version,
    public.get_cached_actor_ids() as actor_ids
  from profiles p
  where p.id = auth.uid()
)
select
  ep.actor_id,
  ep.action,
  ep.effect,
  ep.level,
  ep.scope_id,
  ep.source
from current_user_state cus
join effective_permissions_raw ep
  on ep.actor_id = any(cus.actor_ids)
-- Double-gate: jurisdiction must cover the permission's scope
join actor_jurisdictions aj
  on aj.actor_id = ep.actor_id
where
  -- Kill-switch: JWT version must equal DB version
  cus.db_version = cus.jwt_version
  -- Jurisdiction covers permission scope
  and public.scope_covers_resource(
    aj.level,
    aj.scope_id,
    case when ep.level = 'org'        then ep.scope_id else null end,
    case when ep.level = 'branch'     then ep.scope_id else null end,
    case when ep.level = 'department' then ep.scope_id else null end
  );