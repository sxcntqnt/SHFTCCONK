-- =========================================================
-- 06_rls.sql
-- =========================================================
-- Row-Level Security policies for all tables.
--
-- Must run AFTER 03_functions.sql + 04_views.sql (policies
-- call current_user_can, current_user_can_in_scope, and
-- get_cached_actor_ids).
--
-- Key patterns:
--   SELECT/UPDATE/DELETE → current_user_can(action, type, id)
--     Uses can_actor_perform_on_resource (looks up existing row)
--
--   INSERT → current_user_can_in_scope(action, org_id, branch_id, dept_id)
--     Uses can_actor_perform directly (NEW row scope, no lookup)
--
--   Fast-path → passenger_actor_id = any(get_cached_actor_ids())
--     O(1) check before heavy permission engine
-- =========================================================


-- ═══════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════

alter table profiles enable row level security;

create policy "profiles_select_self" on profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_self" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_self" on profiles
  for update using (auth.uid() = id);


-- ═══════════════════════════════════════════════════════════
-- ACTORS
-- ═══════════════════════════════════════════════════════════

alter table actors enable row level security;

-- Users see their own actors
create policy "actors_select_own" on actors
  for select using (profile_id = auth.uid());

-- System creates actors (via invite redemption, triggers)
-- Direct user insert restricted to own profile
create policy "actors_insert_own" on actors
  for insert with check (profile_id = auth.uid());


-- ═══════════════════════════════════════════════════════════
-- ORGANIZATIONS
-- ═══════════════════════════════════════════════════════════

alter table organizations enable row level security;

-- Visible to members (via actor → org_members join)
create policy "orgs_select_member" on organizations
  for select using (
    exists (
      select 1 from organization_members om
      where om.organization_id = organizations.id
        and om.actor_id = any(public.get_cached_actor_ids())
    )
  );

-- Admins with federal jurisdiction can create orgs
create policy "orgs_insert_admin" on organizations
  for insert with check (
    public.current_user_can_in_scope('org.create', null)
  );


-- ═══════════════════════════════════════════════════════════
-- BRANCHES
-- ═══════════════════════════════════════════════════════════

alter table branches enable row level security;

-- Visible to org members
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
      select 1 from branches b
      join organization_members om on om.organization_id = b.organization_id
      where b.id = departments.branch_id
        and om.actor_id = any(public.get_cached_actor_ids())
    )
  );


-- ═══════════════════════════════════════════════════════════
-- VEHICLES
-- ═══════════════════════════════════════════════════════════

alter table vehicles enable row level security;

-- SELECT: resource lookup
create policy "vehicles_select" on vehicles
  for select using (
    public.current_user_can('vehicle.view', 'vehicles', id)
  );

-- UPDATE: resource lookup
create policy "vehicles_update" on vehicles
  for update using (
    public.current_user_can('vehicle.update', 'vehicles', id)
  );

-- INSERT: scope from NEW row (fixes INSERT paradox)
create policy "vehicles_insert" on vehicles
  for insert with check (
    public.current_user_can_in_scope(
      'vehicle.create',
      organization_id,
      branch_id,
      department_id
    )
  );

-- DELETE: resource lookup
create policy "vehicles_delete" on vehicles
  for delete using (
    public.current_user_can('vehicle.delete', 'vehicles', id)
  );


-- ═══════════════════════════════════════════════════════════
-- BOOKINGS
-- ═══════════════════════════════════════════════════════════

alter table bookings enable row level security;

-- SELECT: fast-path for passenger + slow-path for operators
create policy "bookings_select" on bookings
  for select using (
    passenger_actor_id = any(public.get_cached_actor_ids())
    or public.current_user_can('booking.view', 'bookings', id)
  );

-- UPDATE: permission-based
create policy "bookings_update" on bookings
  for update using (
    public.current_user_can('booking.modify', 'bookings', id)
  );

-- INSERT: passenger creating own + operator creating in scope
create policy "bookings_insert" on bookings
  for insert with check (
    passenger_actor_id = any(public.get_cached_actor_ids())
    or public.current_user_can_in_scope(
      'booking.create',
      organization_id,
      branch_id,
      department_id
    )
  );


-- ═══════════════════════════════════════════════════════════
-- STAGE ASSIGNMENTS
-- ═══════════════════════════════════════════════════════════

alter table stage_assignments enable row level security;

create policy "stage_assignments_select" on stage_assignments
  for select using (
    operator_id = any(public.get_cached_actor_ids())
    or public.current_user_can_in_scope('stage.view', organization_id)
  );


-- ═══════════════════════════════════════════════════════════
-- DRIVER ASSIGNMENTS
-- ═══════════════════════════════════════════════════════════

alter table driver_assignments enable row level security;

-- Drivers see their own assignment
create policy "driver_assignments_select" on driver_assignments
  for select using (
    actor_id = any(public.get_cached_actor_ids())
    or public.current_user_can('vehicle.view', 'vehicles', vehicle_id)
  );


-- ═══════════════════════════════════════════════════════════
-- CONDUCTOR ASSIGNMENTS
-- ═══════════════════════════════════════════════════════════

alter table conductor_assignments enable row level security;

create policy "conductor_assignments_select" on conductor_assignments
  for select using (
    actor_id = any(public.get_cached_actor_ids())
    or public.current_user_can('vehicle.view', 'vehicles', vehicle_id)
  );


-- ═══════════════════════════════════════════════════════════
-- FLEET OWNERSHIP
-- ═══════════════════════════════════════════════════════════

alter table fleet_ownership enable row level security;

create policy "fleet_ownership_select" on fleet_ownership
  for select using (
    actor_id = any(public.get_cached_actor_ids())
    or public.current_user_can('vehicle.view', 'vehicles', vehicle_id)
  );


-- ═══════════════════════════════════════════════════════════
-- ORGANIZATION MEMBERS
-- ═══════════════════════════════════════════════════════════

alter table organization_members enable row level security;

-- Members see other members of their orgs
create policy "org_members_select" on organization_members
  for select using (
    actor_id = any(public.get_cached_actor_ids())
    or exists (
      select 1 from organization_members om2
      where om2.organization_id = organization_members.organization_id
        and om2.actor_id = any(public.get_cached_actor_ids())
    )
  );


-- ═══════════════════════════════════════════════════════════
-- COMPLIANCE EVENTS
-- ═══════════════════════════════════════════════════════════

alter table compliance_events enable row level security;

create policy "compliance_select" on compliance_events
  for select using (
    public.current_user_can('compliance.view', 'compliance_events', id)
  );

create policy "compliance_update" on compliance_events
  for update using (
    public.current_user_can('compliance.resolve', 'compliance_events', id)
  );

create policy "compliance_insert" on compliance_events
  for insert with check (
    public.current_user_can_in_scope('compliance.create', organization_id)
  );


-- ═══════════════════════════════════════════════════════════
-- RECONCILIATION EVENTS
-- ═══════════════════════════════════════════════════════════

alter table reconciliation_events enable row level security;

create policy "reconciliation_select" on reconciliation_events
  for select using (
    public.current_user_can('reconciliation.view', 'reconciliation_events', id)
  );


-- ═══════════════════════════════════════════════════════════
-- ACTOR REQUESTS
-- ═══════════════════════════════════════════════════════════

alter table actor_requests enable row level security;

-- Users see their own requests
create policy "actor_requests_select_own" on actor_requests
  for select using (profile_id = auth.uid());

create policy "actor_requests_insert_own" on actor_requests
  for insert with check (profile_id = auth.uid());

-- Admins see + manage all
create policy "actor_requests_admin_select" on actor_requests
  for select using (
    exists (
      select 1 from actors a
      where a.profile_id = auth.uid()
        and a.type = 'ADMIN' and a.status = 'active'
    )
  );

create policy "actor_requests_admin_update" on actor_requests
  for update using (
    exists (
      select 1 from actors a
      where a.profile_id = auth.uid()
        and a.type = 'ADMIN' and a.status = 'active'
    )
  );


-- ═══════════════════════════════════════════════════════════
-- INVITE TOKENS
-- ═══════════════════════════════════════════════════════════

alter table invite_tokens enable row level security;

-- Creators see their own invites
create policy "invite_tokens_select_creator" on invite_tokens
  for select using (created_by = auth.uid());

-- Org managers can view org invites
create policy "invite_tokens_select_org" on invite_tokens
  for select using (
    public.current_user_can_in_scope('org.manage', organization_id)
  );


-- ═══════════════════════════════════════════════════════════
-- AUDIT LOGS (read-only for admins/regulators)
-- ═══════════════════════════════════════════════════════════

alter table audit_logs enable row level security;

create policy "audit_logs_select" on audit_logs
  for select using (
    exists (
      select 1 from actors a
      where a.profile_id = auth.uid()
        and a.type in ('ADMIN', 'REGULATOR')
        and a.status = 'active'
    )
  );


-- ═══════════════════════════════════════════════════════════
-- ACCESS DENIED LOG (read-only for admins/regulators)
-- ═══════════════════════════════════════════════════════════

alter table access_denied_log enable row level security;

create policy "access_denied_log_admin_select" on access_denied_log
  for select using (
    exists (
      select 1 from actors a
      where a.profile_id = auth.uid()
        and a.type in ('ADMIN', 'REGULATOR')
        and a.status = 'active'
    )
  );

-- No user-facing insert policy — only SECURITY DEFINER functions write


-- ═══════════════════════════════════════════════════════════
-- STRIPE / CONTACT (server-side only)
-- ═══════════════════════════════════════════════════════════

alter table stripe_customers enable row level security;
alter table contact_requests enable row level security;

-- Contact form: anyone can insert
create policy "contact_requests_insert" on contact_requests
  for insert with check (true);