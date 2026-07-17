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
-- Tables that are server-side only (app_backend writes):
--   mpesa_customers (M-PESA webhook/callback handler), contact_requests
--   (SvelteKit action)
--
-- IDENTITY NOTE:
--   Self-owned fast-paths resolve identity via get_current_profile_id(),
--   which reads the app.current_profile_id session GUC set per-transaction
--   by the auth-service. There is no client JWT and no auth.uid().
-- =========================================================


-- ═══════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════
-- Self-owned fast-paths (zero my_permissions overhead) PLUS
-- admin/org-manager access via my_permissions for user management.
--
-- Pattern:
--   SELECT self     → get_current_profile_id() = id (instant)
--   SELECT admin    → current_user_is_platform_admin() (platform admins)
--   SELECT org-mgr  → current_user_manages_profile(id) (org's own actors)
--   INSERT          → self only (auth-service creates the row on signup)
--   UPDATE self     → get_current_profile_id() = id (instant)
--   UPDATE admin    → current_user_is_platform_admin()
--
-- profiles_select_admin / profiles_select_org_manager / profiles_update_admin
-- deliberately do NOT use public.my_permissions here: that view reads
-- `profiles` (via get_current_profile_id()) to resolve the caller, so a
-- profiles policy calling it recurses infinitely (42P17 — a policy on
-- table T cannot call anything that itself reads T). current_user_is_
-- platform_admin() / current_user_manages_profile() are SECURITY DEFINER
-- and read only actors/organization_members instead — no recursion.

alter table profiles enable row level security;

-- Self-owned: identity resolved via the session-scoped canonical profile
create policy "profiles_select_self" on profiles
  for select to app_backend using (id = public.get_current_profile_id());

create policy "profiles_insert_self" on profiles
  for insert to app_backend with check (id = public.get_current_profile_id());

create policy "profiles_update_self" on profiles
  for update to app_backend using (id = public.get_current_profile_id());

-- Platform admins see all profiles (recursion-safe — see note above)
create policy "profiles_select_admin" on profiles
  for select to app_backend using (public.current_user_is_platform_admin());

-- Org managers see profiles of actors in their org (recursion-safe)
create policy "profiles_select_org_manager" on profiles
  for select to app_backend using (public.current_user_manages_profile(profiles.id));

-- Platform admins can update any profile (recursion-safe)
create policy "profiles_update_admin" on profiles
  for update to app_backend using (public.current_user_is_platform_admin());

-- No org-manager UPDATE policy: managers only get read access to
-- profiles in their org by design. Add one explicitly (mirroring
-- profiles_update_admin, using current_user_manages_profile(id))
-- if managers should also be able to edit them.

-- identity_accounts: internal provider-mapping table, never queried
-- directly by end users — full access for the one role that writes
-- it (app_backend, via the auth-service) is appropriate here.
alter table identity_accounts enable row level security;

create policy "identity_accounts_app_backend" on identity_accounts
  for all
  to app_backend
  using (true)
  with check (true);


-- ═══════════════════════════════════════════════════════════
-- ACTORS
-- ═══════════════════════════════════════════════════════════
-- Self-owned fast-paths PLUS admin/org-manager access for
-- actor management (deactivation, role changes, cross-org queries).
--
-- Pattern:
--   SELECT self     → profile_id = get_current_profile_id() (instant)
--   SELECT admin    → admin.users at federal
--   SELECT org-mgr  → org.manage at org (see actors in their org)
--   INSERT          → self only (invite flow creates via redeem_invite)
--   UPDATE admin    → admin.users at federal (deactivate, change status)
--   UPDATE org-mgr  → org.manage at org (manage actors in their org)

alter table actors enable row level security;

-- Self-owned: identity resolved via the session-scoped canonical profile
create policy "actors_select_own" on actors
  for select to app_backend using (profile_id = public.get_current_profile_id());

create policy "actors_insert_own" on actors
  for insert to app_backend with check (profile_id = public.get_current_profile_id());

-- Platform admins see all actors
create policy "actors_select_admin" on actors
  for select to app_backend using (
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
  for select to app_backend using (
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
  for update to app_backend using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'admin.users'
        and mp.level = 'federal'
    )
  );

-- Org managers can update actors in their org (deactivate members, etc.)
create policy "actors_update_org_manager" on actors
  for update to app_backend using (
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
  for select to app_backend using (
    exists (
      select 1 from organization_members om
      where om.organization_id = organizations.id
        and om.actor_id = any(public.get_cached_actor_ids())
    )
  );

-- Federal admins can also see all orgs
create policy "orgs_select_admin" on organizations
  for select to app_backend using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'org.view'
        and mp.level = 'federal'
    )
  );

-- Org creation requires federal-scoped org.create
create policy "orgs_insert_admin" on organizations
  for insert to app_backend with check (
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
  for select to app_backend using (
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
  for select to app_backend using (
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
  for select to app_backend using (
    actor_id = any(public.get_cached_actor_ids())
  );

-- You see other members of orgs you can view
create policy "org_members_select_org" on organization_members
  for select to app_backend using (
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
  for select to app_backend using (
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
  for update to app_backend using (
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
  for insert to app_backend with check (
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
  for delete to app_backend using (
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
-- + scoped booking.view for org/branch/dept staff
create policy "bookings_select" on bookings
  for select to app_backend using (
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
  for update to app_backend using (
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
  for insert to app_backend with check (
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
  for select to app_backend using (
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
  for select to app_backend using (
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

alter table conductor_assignments enable row level security;

create policy "conductor_assignments_select" on conductor_assignments
  for select to app_backend using (
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
  for select to app_backend using (
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
  for select to app_backend using (
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
  for update to app_backend using (
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
  for insert to app_backend with check (
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
  for select to app_backend using (
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
  for select to app_backend using (profile_id = public.get_current_profile_id());

-- Users create their own requests
create policy "actor_requests_insert_own" on actor_requests
  for insert to app_backend with check (profile_id = public.get_current_profile_id());

-- Admins see all requests (federal-level)
create policy "actor_requests_admin_select" on actor_requests
  for select to app_backend using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'audit.view'
        and mp.level = 'federal'
    )
  );

-- Admins can update requests (approve/reject)
create policy "actor_requests_admin_update" on actor_requests
  for update to app_backend using (
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
  for select to app_backend using (created_by = public.get_current_profile_id());

-- Org managers can view org invites
create policy "invite_tokens_select_org" on invite_tokens
  for select to app_backend using (
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
  for select to app_backend using (
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
  for select to app_backend using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'audit.view'
        and mp.level = 'federal'
    )
  );

-- Org managers see denied attempts scoped to their org
create policy "access_denied_log_select_org" on access_denied_log
  for select to app_backend using (
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
-- get_current_profile_id() is not null guards authentication only —
-- not used as a profile FK here.
create policy "permissions_select" on permissions
  for select to app_backend using (public.get_current_profile_id() is not null);

-- Permissions catalog writes: platform admins only. Deliberately no
-- "manage your own permissions" branch — that would let a user grant
-- themselves elevated access, a privilege-escalation path, not a
-- convenience. In normal operation this catalog is seeded via
-- migrations (07_seed.sql, run by the schema-owning role, which
-- bypasses RLS); this policy exists for any admin-tooling path that
-- adds a new permission type at runtime through app_backend.
create policy "permissions_admin_write" on permissions
  for all
  to app_backend
  using (public.current_user_is_platform_admin())
  with check (public.current_user_is_platform_admin());

-- Policy groups: org members can see their org's groups
create policy "policy_groups_select" on policy_groups
  for select to app_backend using (
    exists (
      select 1 from organization_members om
      where om.organization_id = policy_groups.organization_id
        and om.actor_id = any(public.get_cached_actor_ids())
    )
    -- Federal/global groups (no org) visible to all authenticated
    or (policy_groups.organization_id is null and public.get_current_profile_id() is not null)
  );

-- Own bindings: actors see their own jurisdiction/permission/group assignments
create policy "actor_jurisdictions_select_own" on actor_jurisdictions
  for select to app_backend using (
    actor_id = any(public.get_cached_actor_ids())
  );

create policy "actor_permissions_select_own" on actor_permissions
  for select to app_backend using (
    actor_id = any(public.get_cached_actor_ids())
  );

create policy "actor_policy_groups_select_own" on actor_policy_groups
  for select to app_backend using (
    actor_id = any(public.get_cached_actor_ids())
  );

create policy "policy_group_permissions_select" on policy_group_permissions
  for select to app_backend using (
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
  for select to app_backend using (
    from_actor_id = any(public.get_cached_actor_ids())
    or to_actor_id = any(public.get_cached_actor_ids())
  );


-- ═══════════════════════════════════════════════════════════
-- MPESA CUSTOMERS (server-side writes, self-select)
-- ═══════════════════════════════════════════════════════════
-- (stripe_customers dropped — this replaces it as the billing/
-- payments table with an app_backend policy.)
--
-- This table was previously missing RLS entirely — enabled by
-- default-deny, it silently returned zero rows for every query,
-- which userState.server.ts treats as "no subscription/M-PESA
-- status", contributing to the same guest-detection failure mode
-- as the other 12 tables audited in the RLS migration checklist.
--
-- INSERT/UPDATE/DELETE: app_backend only (M-PESA webhook/callback
-- handler). SELECT: users see their own record (subscription +
-- M-PESA GO minor-account status, for account/billing UI).
-- Column is user_id (not profile_id — matches 01_tables.sql as-is).
--
-- app_backend is NOBYPASSRLS (see 00_extensions_domains.sql), so an
-- explicit write policy is required or every webhook write is
-- silently default-denied.

alter table mpesa_customers enable row level security;

create policy "mpesa_customers_select_own" on mpesa_customers
  for select to app_backend using (user_id = public.get_current_profile_id());

create policy "mpesa_customers_write_backend" on mpesa_customers
  for all
  to app_backend
  using (true)
  with check (true);


-- ═══════════════════════════════════════════════════════════
-- ACTOR VERIFICATION TOKENS (self-scoped, app_backend)
-- ═══════════════════════════════════════════════════════════
-- Was previously enabled-with-zero-policies (same silent-default-deny
-- gap as mpesa_customers/identity_accounts before this pass). Backs the
-- email/SMS OTP verification shim (src/lib/server/mailer.ts) — token_hash
-- is a hash of the code, never the raw code itself, so a policy exposing
-- this table more broadly than "own profile" would still not leak usable
-- codes, but self-scoping is the correct default regardless.
--
-- One row per (actor_id, method) by constraint — generating a new token
-- is an upsert (`on conflict (actor_id, method) do update`), which needs
-- the same policy to cover both the insert and update path.

alter table actor_verification_tokens enable row level security;

create policy "actor_verification_tokens_self" on actor_verification_tokens
  for all
  to app_backend
  using (profile_id = public.get_current_profile_id())
  with check (profile_id = public.get_current_profile_id());


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
-- The SvelteKit contact form action writes via the app_backend
-- server role. Therefore no client-facing INSERT policy is needed.
--
-- NEON MIGRATION: Supabase's service_role bypassed RLS automatically.
-- app_backend does NOT (NOBYPASSRLS — see 00_extensions_domains.sql),
-- so an explicit policy scoped `to app_backend` is required, or every
-- server-side insert is silently default-denied.
--
-- By enabling RLS with zero INSERT policies for any other role,
-- Postgres default-denies all client-side inserts. Only app_backend
-- (your SvelteKit server) can write.

alter table contact_requests enable row level security;

-- Explicit: only app_backend can insert
create policy "contact_requests_insert_backend" on contact_requests
  for insert
  to app_backend
  with check (true);

-- Admin read access for managing contact submissions
create policy "contact_requests_select_admin" on contact_requests
  for select to app_backend using (
    exists (
      select 1 from public.my_permissions mp
      where mp.effect = 'allow'
        and mp.action = 'admin.full'
        and mp.level = 'federal'
    )
  );


-- ═══════════════════════════════════════════════════════════
-- GEOFENCES (personal or org-scoped; was missing RLS entirely)
-- ═══════════════════════════════════════════════════════════
-- scope='personal' → owned by profile_id, visible/writable by that
--   profile only.
-- scope='org'      → owned by org_id, visible/writable by any active
--   actor who is a member of that organization.
--
-- No geofences_update policy: geofences are write-once/delete per the
-- original design intent. Add one explicitly if updates are needed.

alter table geofences enable row level security;

create policy "geofences_select" on geofences
  for select to app_backend using (
    profile_id = public.get_current_profile_id()
    or org_id in (
      select om.organization_id
      from organization_members om
      where om.actor_id = any(public.get_cached_actor_ids())
    )
  );

create policy "geofences_insert" on geofences
  for insert to app_backend with check (
    profile_id = public.get_current_profile_id()
    or org_id in (
      select om.organization_id
      from organization_members om
      where om.actor_id = any(public.get_cached_actor_ids())
    )
  );

create policy "geofences_delete" on geofences
  for delete to app_backend using (
    profile_id = public.get_current_profile_id()
    or org_id in (
      select om.organization_id
      from organization_members om
      where om.actor_id = any(public.get_cached_actor_ids())
    )
  );
