-- =========================================================
-- 06_rls.sql (FIXED)
-- =========================================================
-- Row-Level Security policies for all tables.
-- Uses my_permissions (aggregated, conflict-resolved) for
-- permission-gated access and direct shortcuts for self-owned data.
--
-- ═══════════════════════════════════════════════════════════
-- BUG FIXES
-- ═══════════════════════════════════════════════════════════
--
-- BUG 1 (CRASH): driver_assignments_select referenced vehicles.*
--   without joining to vehicles. driver_assignments has no org/branch/dept
--   columns. FIX: JOIN through vehicle_id → vehicles to resolve scope.
--
-- BUG 2 (CRASH): conductor_assignments_select — same as BUG 1.
--
-- BUG 3 (CRASH): actor_requests_admin_select/update referenced
--   actor_requests.organization_id which does not exist. Table has:
--   id, profile_id, requested_type, payload, status, created_at,
--   processed_at, processed_by.
--   FIX: Admin access uses federal-level audit.view permission
--   (actor requests are a system-wide admin concern, not org-scoped).
--
-- BUG 4 (CRASH): audit_logs_select referenced audit_logs.organization_id
--   which does not exist. Table has: id, event_type, actor_id, profile_id,
--   performed_by, target_table, target_id, details, created_at.
--   FIX: Use audit.view at federal level for full access. Org-scoped
--   audit access would require extracting from details jsonb (fragile,
--   unindexed) — defer to a future table migration adding org_id.
--
-- BUG 5 (CRASH): access_denied_log had DUPLICATE policy names and
--   referenced .organization_id (column is .resource_org).
--   FIX: Single policy, correct column name, unified under my_permissions.
--
-- ═══════════════════════════════════════════════════════════
-- OPTIMIZATIONS (from senior dev review)
-- ═══════════════════════════════════════════════════════════
--
-- OPT 1: organization_members — replaced self-join with my_permissions
--   check for org.view. Consistent with unified pattern.
--
-- OPT 2: access_denied_log — replaced manual actor type check with
--   my_permissions audit.view. Consistent and permission-revocable.
--
-- OPT 3: profiles — added admin.users (federal) and org.manage (org)
--   SELECT/UPDATE policies alongside self-owned fast-paths.
--   Enables: admin user management, org manager member views.
--
-- OPT 4: actors — added admin.users (federal) and org.manage (org)
--   SELECT/UPDATE policies alongside self-owned fast-paths.
--   Enables: admin actor deactivation, org manager actor management.
--
-- ═══════════════════════════════════════════════════════════
-- NOTES ON SCOPE STRATEGY
-- ═══════════════════════════════════════════════════════════
--
-- Tables WITH org/branch/dept columns use scoped my_permissions:
--   vehicles, bookings, stage_assignments, compliance_events,
--   reconciliation_events, invite_tokens
--
-- Tables WITHOUT org columns use federal-level permissions:
--   audit_logs, access_denied_log, actor_requests (admin path)
--
-- Tables with self-owned fast-paths + admin escalation:
--   profiles (self + admin.users + org.manage), actors (same)
--   actor_requests (own path + admin), invite_tokens (creator + org.manage)
--
-- Tables that are server-side only (service_role writes):
--   stripe_customers (webhook handler), contact_requests (SvelteKit action)
--
-- =========================================================


-- ═══════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════
-- Self-owned fast-paths (zero my_permissions overhead) PLUS
-- admin/org-manager access via my_permissions for user management.
--
-- Pattern:
--   SELECT self     → auth.uid() = id (instant)
--   SELECT admin    → admin.users at federal (platform admins)
--   SELECT org-mgr  → org.manage at org (see profiles of their org's actors)
--   INSERT          → self only (handle_new_user trigger creates profiles)
--   UPDATE self     → auth.uid() = id (instant)
--   UPDATE admin    → admin.users at federal (deactivate, edit names, etc.)

alter table profiles enable row level security;

-- Self-owned (no my_permissions, no joins — fastest possible path)
create policy "profiles_select_self" on profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_self" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_self" on profiles
  for update using (auth.uid() = id);

-- Platform admins see all profiles
create policy "profiles_select_admin" on profiles
  for select using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'admin.users'
        and mp.level = 'federal'
    )
  );

-- Org managers see profiles of actors in their org
-- Join path: profiles → actors → organization_members
create policy "profiles_select_org_manager" on profiles
  for select using (
    exists (
      select 1
      from actors a
      join organization_members om on om.actor_id = a.id
      join public.my_permissions mp on mp.effect = 'allow'
        and mp.action = 'org.manage'
        and mp.level = 'org'
        and mp.scope_id = om.organization_id
      where a.profile_id = profiles.id
    )
  );

-- Platform admins can update any profile
create policy "profiles_update_admin" on profiles
  for update using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'admin.users'
        and mp.level = 'federal'
    )
  );


-- ═══════════════════════════════════════════════════════════
-- ACTORS
-- ═══════════════════════════════════════════════════════════
-- Self-owned fast-paths PLUS admin/org-manager access for
-- actor management (deactivation, role changes, cross-org queries).
--
-- Pattern:
--   SELECT self     → profile_id = auth.uid() (instant)
--   SELECT admin    → admin.users at federal
--   SELECT org-mgr  → org.manage at org (see actors in their org)
--   INSERT          → self only (invite flow creates via redeem_invite)
--   UPDATE admin    → admin.users at federal (deactivate, change status)
--   UPDATE org-mgr  → org.manage at org (manage actors in their org)

alter table actors enable row level security;

-- Self-owned (instant, no my_permissions)
create policy "actors_select_own" on actors
  for select using (profile_id = auth.uid());

create policy "actors_insert_own" on actors
  for insert with check (profile_id = auth.uid());

-- Platform admins see all actors
create policy "actors_select_admin" on actors
  for select using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'admin.users'
        and mp.level = 'federal'
    )
  );

-- Org managers see actors in their org
-- Join path: actors → organization_members
create policy "actors_select_org_manager" on actors
  for select using (
    exists (
      select 1
      from organization_members om
      join public.my_permissions mp on mp.effect = 'allow'
        and mp.action = 'org.manage'
        and mp.level = 'org'
        and mp.scope_id = om.organization_id
      where om.actor_id = actors.id
    )
  );

-- Platform admins can update any actor (deactivate, reactivate, etc.)
create policy "actors_update_admin" on actors
  for update using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'admin.users'
        and mp.level = 'federal'
    )
  );

-- Org managers can update actors in their org (deactivate members, etc.)
create policy "actors_update_org_manager" on actors
  for update using (
    exists (
      select 1
      from organization_members om
      join public.my_permissions mp on mp.effect = 'allow'
        and mp.action = 'org.manage'
        and mp.level = 'org'
        and mp.scope_id = om.organization_id
      where om.actor_id = actors.id
    )
  );


-- ═══════════════════════════════════════════════════════════
-- ORGANIZATIONS
-- ═══════════════════════════════════════════════════════════

alter table organizations enable row level security;

-- Members see their orgs (fast-path via organization_members)
create policy "orgs_select_member" on organizations
  for select using (
    exists (
      select 1 from organization_members om
      where om.organization_id = organizations.id
        and om.actor_id = any(public.get_cached_actor_ids())
    )
  );

-- Federal admins can also see all orgs
create policy "orgs_select_admin" on organizations
  for select using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'org.view'
        and mp.level = 'federal'
    )
  );

-- Org creation requires federal-scoped org.create
create policy "orgs_insert_admin" on organizations
  for insert with check (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'org.create'
        and mp.level = 'federal'
    )
  );


-- ═══════════════════════════════════════════════════════════
-- BRANCHES
-- ═══════════════════════════════════════════════════════════

alter table branches enable row level security;

create policy "branches_select" on branches
  for select using (
    exists (
      select 1 from organization_members om
      where om.organization_id = branches.organization_id
        and om.actor_id = any(public.get_cached_actor_ids())
    )
  );


-- ═══════════════════════════════════════════════════════════
-- DEPARTMENTS
-- ═══════════════════════════════════════════════════════════

alter table departments enable row level security;

create policy "departments_select" on departments
  for select using (
    exists (
      select 1
      from branches b
      join organization_members om on om.organization_id = b.organization_id
      where b.id = departments.branch_id
        and om.actor_id = any(public.get_cached_actor_ids())
    )
  );


-- ═══════════════════════════════════════════════════════════
-- ORGANIZATION MEMBERS [OPT 1: unified under my_permissions]
-- ═══════════════════════════════════════════════════════════
-- Was: self-join to organization_members (you see members
--      of orgs you're a member of).
-- Now: self-owned fast-path + my_permissions for org.view.
-- Benefit: consistent pattern, permission-revocable.

alter table organization_members enable row level security;

-- You always see your own memberships
create policy "org_members_select_own" on organization_members
  for select using (
    actor_id = any(public.get_cached_actor_ids())
  );

-- You see other members of orgs you can view
create policy "org_members_select_org" on organization_members
  for select using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'org.view'
        and (
          -- Org-scoped: see members of this specific org
          (mp.level = 'org' and mp.scope_id = organization_members.organization_id)
          -- Federal: see members of all orgs
          or mp.level = 'federal'
        )
    )
  );


-- ═══════════════════════════════════════════════════════════
-- VEHICLES
-- ═══════════════════════════════════════════════════════════

alter table vehicles enable row level security;

create policy "vehicles_select" on vehicles
  for select using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'vehicle.view'
        and (
          (mp.level = 'org'        and mp.scope_id = vehicles.organization_id)
          or (mp.level = 'branch'  and mp.scope_id = vehicles.branch_id)
          or (mp.level = 'department' and mp.scope_id = vehicles.department_id)
          or mp.level = 'federal'
        )
    )
  );

create policy "vehicles_update" on vehicles
  for update using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'vehicle.update'
        and (
          (mp.level = 'org'        and mp.scope_id = vehicles.organization_id)
          or (mp.level = 'branch'  and mp.scope_id = vehicles.branch_id)
          or (mp.level = 'department' and mp.scope_id = vehicles.department_id)
          or mp.level = 'federal'
        )
    )
  );

create policy "vehicles_insert" on vehicles
  for insert with check (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'vehicle.create'
        and (
          (mp.level = 'org'        and mp.scope_id = vehicles.organization_id)
          or (mp.level = 'branch'  and mp.scope_id = vehicles.branch_id)
          or (mp.level = 'department' and mp.scope_id = vehicles.department_id)
          or mp.level = 'federal'
        )
    )
  );

create policy "vehicles_delete" on vehicles
  for delete using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'vehicle.delete'
        and (
          (mp.level = 'org'        and mp.scope_id = vehicles.organization_id)
          or (mp.level = 'branch'  and mp.scope_id = vehicles.branch_id)
          or (mp.level = 'department' and mp.scope_id = vehicles.department_id)
          or mp.level = 'federal'
        )
    )
  );


-- ═══════════════════════════════════════════════════════════
-- BOOKINGS
-- ═══════════════════════════════════════════════════════════

alter table bookings enable row level security;

-- Passengers see their own bookings (fast-path)
-- + scoped vehicle.view for org/branch/dept staff
create policy "bookings_select" on bookings
  for select using (
    passenger_actor_id = any(public.get_cached_actor_ids())
    or exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'booking.view'
        and (
          (mp.level = 'org'        and mp.scope_id = bookings.organization_id)
          or (mp.level = 'branch'  and mp.scope_id = bookings.branch_id)
          or (mp.level = 'department' and mp.scope_id = bookings.department_id)
          or mp.level = 'federal'
        )
    )
  );

create policy "bookings_update" on bookings
  for update using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'booking.modify'
        and (
          (mp.level = 'org'        and mp.scope_id = bookings.organization_id)
          or (mp.level = 'branch'  and mp.scope_id = bookings.branch_id)
          or (mp.level = 'department' and mp.scope_id = bookings.department_id)
          or mp.level = 'federal'
        )
    )
  );

create policy "bookings_insert" on bookings
  for insert with check (
    passenger_actor_id = any(public.get_cached_actor_ids())
    or exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'booking.create'
        and (
          (mp.level = 'org'        and mp.scope_id = bookings.organization_id)
          or (mp.level = 'branch'  and mp.scope_id = bookings.branch_id)
          or (mp.level = 'department' and mp.scope_id = bookings.department_id)
          or mp.level = 'federal'
        )
    )
  );


-- ═══════════════════════════════════════════════════════════
-- STAGE ASSIGNMENTS
-- ═══════════════════════════════════════════════════════════

alter table stage_assignments enable row level security;

create policy "stage_assignments_select" on stage_assignments
  for select using (
    operator_id = any(public.get_cached_actor_ids())
    or exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'stage.view'
        and (
          (mp.level = 'org' and mp.scope_id = stage_assignments.organization_id)
          or mp.level = 'federal'
        )
    )
  );


-- ═══════════════════════════════════════════════════════════
-- DRIVER ASSIGNMENTS [BUG 1 FIX: JOIN through vehicle_id]
-- ═══════════════════════════════════════════════════════════
-- driver_assignments has NO org/branch/dept columns.
-- Must JOIN to vehicles via vehicle_id to resolve scope.

alter table driver_assignments enable row level security;

create policy "driver_assignments_select" on driver_assignments
  for select using (
    -- Fast-path: drivers see their own assignment
    actor_id = any(public.get_cached_actor_ids())
    or exists (
      -- Scoped access: resolve org/branch/dept via the assigned vehicle
      select 1
      from vehicles v
      join public.my_permissions mp on true
      where v.id = driver_assignments.vehicle_id
        and mp.effect = 'allow'
        and mp.action = 'vehicle.view'
        and (
          (mp.level = 'org'        and mp.scope_id = v.organization_id)
          or (mp.level = 'branch'  and mp.scope_id = v.branch_id)
          or (mp.level = 'department' and mp.scope_id = v.department_id)
          or mp.level = 'federal'
        )
    )
  );


-- ═══════════════════════════════════════════════════════════
-- CONDUCTOR ASSIGNMENTS [BUG 2 FIX: JOIN through vehicle_id]
-- ═══════════════════════════════════════════════════════════
-- Same fix as driver_assignments.

alter table conductor_assignments enable row level security;

create policy "conductor_assignments_select" on conductor_assignments
  for select using (
    actor_id = any(public.get_cached_actor_ids())
    or exists (
      select 1
      from vehicles v
      join public.my_permissions mp on true
      where v.id = conductor_assignments.vehicle_id
        and mp.effect = 'allow'
        and mp.action = 'vehicle.view'
        and (
          (mp.level = 'org'        and mp.scope_id = v.organization_id)
          or (mp.level = 'branch'  and mp.scope_id = v.branch_id)
          or (mp.level = 'department' and mp.scope_id = v.department_id)
          or mp.level = 'federal'
        )
    )
  );


-- ═══════════════════════════════════════════════════════════
-- FLEET OWNERSHIP
-- ═══════════════════════════════════════════════════════════

alter table fleet_ownership enable row level security;

create policy "fleet_ownership_select" on fleet_ownership
  for select using (
    actor_id = any(public.get_cached_actor_ids())
    or exists (
      select 1
      from vehicles v
      join public.my_permissions mp on true
      where v.id = fleet_ownership.vehicle_id
        and mp.effect = 'allow'
        and mp.action = 'vehicle.view'
        and (
          (mp.level = 'org'        and mp.scope_id = v.organization_id)
          or (mp.level = 'branch'  and mp.scope_id = v.branch_id)
          or (mp.level = 'department' and mp.scope_id = v.department_id)
          or mp.level = 'federal'
        )
    )
  );


-- ═══════════════════════════════════════════════════════════
-- COMPLIANCE EVENTS
-- ═══════════════════════════════════════════════════════════

alter table compliance_events enable row level security;

create policy "compliance_select" on compliance_events
  for select using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'compliance.view'
        and (
          (mp.level = 'org' and mp.scope_id = compliance_events.organization_id)
          or mp.level = 'federal'
        )
    )
  );

create policy "compliance_update" on compliance_events
  for update using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'compliance.resolve'
        and (
          (mp.level = 'org' and mp.scope_id = compliance_events.organization_id)
          or mp.level = 'federal'
        )
    )
  );

create policy "compliance_insert" on compliance_events
  for insert with check (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'compliance.create'
        and (
          (mp.level = 'org' and mp.scope_id = compliance_events.organization_id)
          or mp.level = 'federal'
        )
    )
  );


-- ═══════════════════════════════════════════════════════════
-- RECONCILIATION EVENTS
-- ═══════════════════════════════════════════════════════════

alter table reconciliation_events enable row level security;

create policy "reconciliation_select" on reconciliation_events
  for select using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'reconciliation.view'
        and (
          (mp.level = 'org' and mp.scope_id = reconciliation_events.organization_id)
          or mp.level = 'federal'
        )
    )
  );


-- ═══════════════════════════════════════════════════════════
-- ACTOR REQUESTS [BUG 3 FIX: no organization_id column]
-- ═══════════════════════════════════════════════════════════
-- actor_requests has NO organization_id. It's a user-level
-- request (profile_id, requested_type, payload).
--
-- Self-access: users see/create their own requests.
-- Admin access: federal-level audit.view (system-wide concern).
--
-- NOTE: Consider adding 'actor_request.manage' to the permissions
-- seed if you want a distinct permission for this. For now,
-- audit.view at federal level covers it — the same users who
-- can view audit logs can manage actor requests.

alter table actor_requests enable row level security;

-- Users see their own requests
create policy "actor_requests_select_own" on actor_requests
  for select using (profile_id = auth.uid());

-- Users create their own requests
create policy "actor_requests_insert_own" on actor_requests
  for insert with check (profile_id = auth.uid());

-- Admins see all requests (federal-level)
create policy "actor_requests_admin_select" on actor_requests
  for select using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'audit.view'
        and mp.level = 'federal'
    )
  );

-- Admins can update requests (approve/reject)
create policy "actor_requests_admin_update" on actor_requests
  for update using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'audit.view'
        and mp.level = 'federal'
    )
  );


-- ═══════════════════════════════════════════════════════════
-- INVITE TOKENS
-- ═══════════════════════════════════════════════════════════

alter table invite_tokens enable row level security;

-- Creators see their own invites (fast-path)
create policy "invite_tokens_select_creator" on invite_tokens
  for select using (created_by = auth.uid());

-- Org managers can view org invites
create policy "invite_tokens_select_org" on invite_tokens
  for select using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'org.manage'
        and (
          (mp.level = 'org' and mp.scope_id = invite_tokens.organization_id)
          or mp.level = 'federal'
        )
    )
  );

-- No INSERT policy: invite creation is server-only (service role)


-- ═══════════════════════════════════════════════════════════
-- AUDIT LOGS [BUG 4 FIX: no organization_id column]
-- ═══════════════════════════════════════════════════════════
-- audit_logs has NO organization_id. The org context is buried
-- in the jsonb `details` column (unindexed, fragile).
--
-- For now: federal-level audit.view grants full read access.
-- Org-scoped audit access requires a schema migration to add
-- an indexed organization_id column to audit_logs.
--
-- TODO: ALTER TABLE audit_logs ADD COLUMN organization_id uuid
--       REFERENCES organizations(id);
--       Then update this policy to support org-scoped access.

alter table audit_logs enable row level security;

create policy "audit_logs_select" on audit_logs
  for select using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'audit.view'
        and mp.level = 'federal'
    )
  );

-- No INSERT/UPDATE/DELETE policies: writes are server-only (SECURITY DEFINER / service role)


-- ═══════════════════════════════════════════════════════════
-- ACCESS DENIED LOG [BUG 5 FIX: duplicate policy + wrong column]
-- [OPT 2: unified under my_permissions]
-- ═══════════════════════════════════════════════════════════
-- Was: two duplicate policies, first referencing non-existent
--      .organization_id, second using manual actor type check.
-- Now: single policy using audit.view at federal level.
--      Org-scoped variant uses correct column: .resource_org
--
-- The correct column is resource_org (not organization_id).
-- See: create table access_denied_log (... resource_org uuid ...)

alter table access_denied_log enable row level security;

-- Federal auditors see all denied access attempts
create policy "access_denied_log_select_federal" on access_denied_log
  for select using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'audit.view'
        and mp.level = 'federal'
    )
  );

-- Org managers see denied attempts scoped to their org
create policy "access_denied_log_select_org" on access_denied_log
  for select using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'audit.view'
        and mp.level = 'org'
        and mp.scope_id = access_denied_log.resource_org
    )
  );

-- No INSERT policy: writes are SECURITY DEFINER only (log_access_denied())


-- ═══════════════════════════════════════════════════════════
-- PERMISSION SYSTEM TABLES (admin-only)
-- ═══════════════════════════════════════════════════════════
-- These tables (permissions, policy_groups, policy_group_permissions,
-- actor_permissions, actor_policy_groups, actor_jurisdictions,
-- delegated_authority) are read via SECURITY DEFINER functions
-- and the my_permissions view.
--
-- Direct table access is restricted to:
--   - SELECT for users who need to see their own bindings
--   - INSERT/UPDATE/DELETE via SECURITY DEFINER functions only

alter table permissions enable row level security;
alter table policy_groups enable row level security;
alter table policy_group_permissions enable row level security;
alter table actor_permissions enable row level security;
alter table actor_policy_groups enable row level security;
alter table actor_jurisdictions enable row level security;
alter table delegated_authority enable row level security;

-- Permissions catalog: readable by all authenticated users
create policy "permissions_select" on permissions
  for select using (auth.uid() is not null);

-- Policy groups: org members can see their org's groups
create policy "policy_groups_select" on policy_groups
  for select using (
    exists (
      select 1 from organization_members om
      where om.organization_id = policy_groups.organization_id
        and om.actor_id = any(public.get_cached_actor_ids())
    )
    -- Federal/global groups (no org) visible to all authenticated
    or (policy_groups.organization_id is null and auth.uid() is not null)
  );

-- Own bindings: actors see their own jurisdiction/permission/group assignments
create policy "actor_jurisdictions_select_own" on actor_jurisdictions
  for select using (
    actor_id = any(public.get_cached_actor_ids())
  );

create policy "actor_permissions_select_own" on actor_permissions
  for select using (
    actor_id = any(public.get_cached_actor_ids())
  );

create policy "actor_policy_groups_select_own" on actor_policy_groups
  for select using (
    actor_id = any(public.get_cached_actor_ids())
  );

create policy "policy_group_permissions_select" on policy_group_permissions
  for select using (
    exists (
      select 1 from policy_groups pg
      where pg.id = policy_group_permissions.group_id
        and (
          pg.organization_id is null  -- global groups
          or exists (
            select 1 from organization_members om
            where om.organization_id = pg.organization_id
              and om.actor_id = any(public.get_cached_actor_ids())
          )
        )
    )
  );

-- Delegated authority: both parties can see the delegation
create policy "delegated_authority_select" on delegated_authority
  for select using (
    from_actor_id = any(public.get_cached_actor_ids())
    or to_actor_id = any(public.get_cached_actor_ids())
  );


-- ═══════════════════════════════════════════════════════════
-- STRIPE CUSTOMERS (server-side writes, self-select)
-- ═══════════════════════════════════════════════════════════
-- INSERT/UPDATE/DELETE: service_role only (Stripe webhooks).
-- SELECT: users see their own record (for billing UI).

alter table stripe_customers enable row level security;

create policy "stripe_customers_select_own" on stripe_customers
  for select using (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies for anon/authenticated.
-- Stripe webhook handler uses supabaseServiceRole which bypasses RLS.


-- ═══════════════════════════════════════════════════════════
-- CONTACT REQUESTS (server-side insert only)
-- ═══════════════════════════════════════════════════════════
-- SECURITY FIX: Removed WITH CHECK (true) which allowed anyone
-- with the anon key to INSERT directly, bypassing:
--   - Turnstile CAPTCHA verification
--   - Zod input validation
--   - Rate limiting
--   - IP address logging
--
-- The SvelteKit contact form action uses supabaseServiceRole
-- for the insert, which bypasses RLS entirely. Therefore NO
-- client-facing INSERT policy is needed.
--
-- By enabling RLS with zero INSERT policies for anon/authenticated,
-- Postgres default-denies all client-side inserts. Only
-- service_role (your SvelteKit server) can write.
--
-- The explicit service_role policy below is for documentation —
-- service_role bypasses RLS regardless, but this makes the
-- intent clear to anyone reading the schema.

alter table contact_requests enable row level security;

-- Explicit: only service_role can insert (documentation policy)
create policy "contact_requests_insert_service_only" on contact_requests
  for insert
  to service_role
  with check (true);

-- Admin read access for managing contact submissions
create policy "contact_requests_select_admin" on contact_requests
  for select using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'admin.full'
        and mp.level = 'federal'
    )
  );