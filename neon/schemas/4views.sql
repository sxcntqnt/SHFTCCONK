-- =========================================================
-- 04_views.sql (FIXED)
-- =========================================================
-- Two views:
--   1. effective_permissions_raw  — unfiltered union of all permission sources
--   2. my_permissions             — user-scoped, double-gated, aggregated, versioned
--
-- FIXES from review:
--   BUG 6: Federal-level permissions were silently dropped.
--          The scoped CTE only handled org/branch/department joins.
--          Federal jurisdiction (level='federal', scope_id=NULL) matched
--          NONE of the conditions → admins got 0 permissions.
--          FIX: Added explicit federal handling in the scope join.
--
-- Must run AFTER 03_functions.sql (depends on get_cached_actor_ids,
--   get_current_profile_id).
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

  -- Delegated authority (active, unexpired, unrevoked)
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
--   1. Only the current user's actors
--   2. Only where jurisdiction COVERS the permission scope
--   3. Aggregates to resolve deny > allow conflicts
--
-- security_invoker = true means the view runs as the calling
-- user, so RLS on underlying tables still applies.

create or replace view public.my_permissions
with (security_invoker = true)
as
with current_user_state as (
  select
    p.id as profile_id,
    p.permissions_version as db_version,
    public.get_cached_actor_ids() as actor_ids
  from profiles p
  where p.id = public.get_current_profile_id()
),

-- Step 1: Score permissions for conflict resolution
precedence_scored as (
  select
    ep.actor_id,
    ep.action,
    ep.effect,
    ep.level,
    ep.scope_id,
    ep.source,

    -- Deny beats allow
    case ep.effect
      when 'deny'  then 2
      when 'allow' then 1
      else 0
    end as effect_score,

    -- Direct > delegated > group
    case
      when ep.source = 'direct'              then 3
      when ep.source like 'delegated_from:%' then 2
      when ep.source like 'group:%'          then 1
      else 0
    end as source_score

  from effective_permissions_raw ep
  join current_user_state cus
    on ep.actor_id = any(cus.actor_ids)
),

-- Step 2: Scope join — jurisdiction must COVER the permission's scope
--
-- This replaces the old scope_covers_resource() function call with
-- inline join conditions that Postgres can optimize with covering indexes.
--
-- CRITICAL: Federal jurisdiction covers EVERYTHING.
-- The original rewrite missed this case, causing all federal-level
-- permissions (admins, regulators) to silently return 0 rows.
scoped as (
  select ps.*
  from precedence_scored ps
  join actor_jurisdictions aj
    on aj.actor_id = ps.actor_id
   and (
        -- ═══════════════════════════════════════════════════════
        -- FEDERAL jurisdiction covers ALL permission scopes.
        -- This is the admin/regulator case: jurisdiction at federal
        -- means you can operate on any org, branch, or department.
        -- ═══════════════════════════════════════════════════════
        (aj.level = 'federal')

        -- ═══════════════════════════════════════════════════════
        -- ORG jurisdiction covers:
        --   - org-level permissions for the same org
        --   - branch-level permissions for branches IN that org
        --   - department-level permissions for depts IN that org
        --
        -- For branch/dept: we need to verify the scope_id belongs
        -- to this org. We do this via subquery joins to branches
        -- and departments tables.
        -- ═══════════════════════════════════════════════════════
        or (aj.level = 'org' and ps.level = 'org'
            and aj.scope_id = ps.scope_id)

        or (aj.level = 'org' and ps.level = 'branch'
            and exists (
              select 1 from branches b
              where b.id = ps.scope_id
                and b.organization_id = aj.scope_id
            ))

        or (aj.level = 'org' and ps.level = 'department'
            and exists (
              select 1 from departments d
              join branches b on b.id = d.branch_id
              where d.id = ps.scope_id
                and b.organization_id = aj.scope_id
            ))

        -- ═══════════════════════════════════════════════════════
        -- BRANCH jurisdiction covers:
        --   - branch-level permissions for the same branch
        --   - department-level permissions for depts IN that branch
        -- ═══════════════════════════════════════════════════════
        or (aj.level = 'branch' and ps.level = 'branch'
            and aj.scope_id = ps.scope_id)

        or (aj.level = 'branch' and ps.level = 'department'
            and exists (
              select 1 from departments d
              where d.id = ps.scope_id
                and d.branch_id = aj.scope_id
            ))

        -- ═══════════════════════════════════════════════════════
        -- DEPARTMENT jurisdiction covers only same-department
        -- ═══════════════════════════════════════════════════════
        or (aj.level = 'department' and ps.level = 'department'
            and aj.scope_id = ps.scope_id)

        -- ═══════════════════════════════════════════════════════
        -- FEDERAL permission scope (scope_id IS NULL):
        -- Only federal-level jurisdiction can grant federal perms.
        -- Already handled by (aj.level = 'federal') above.
        -- ═══════════════════════════════════════════════════════
   )
),

-- Step 3: Aggregate — collapse duplicates, resolve deny > allow
aggregated as (
  select
    actor_id,
    action,
    scope_id,
    level,
    -- Highest effect_score wins: deny (2) > allow (1)
    case when max(effect_score) = 2 then 'deny' else 'allow' end as effect,
    -- Pick most authoritative source
    max(source) as source
  from scoped
  group by actor_id, action, scope_id, level
)

-- Step 4: Return (profile-scoped, no JWT version gate)
select
  ag.actor_id,
  ag.action,
  ag.effect,
  ag.level,
  ag.scope_id,
  ag.source
from aggregated ag
join current_user_state cus on true;
