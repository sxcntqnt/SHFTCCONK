-- =========================================================
-- MIGRATION: Current Schema → Federated Governance
-- =========================================================
-- Run this in a TRANSACTION. Test on a staging DB first.
--
-- Migration strategy:
--   Phase 1: Add new tables (non-breaking)
--   Phase 2: Backfill data from old structure
--   Phase 3: Add new constraints and indexes
--   Phase 4: Create new functions and RLS policies
--   Phase 5: Drop old policies and objects
-- =========================================================

begin;

-- =========================================================
-- PHASE 1: ADD NEW TABLES
-- =========================================================

-- 1a. Jurisdiction level domain
do $$
begin
  create domain jurisdiction_level as text
    check (value in ('federal', 'org', 'branch', 'department'));
exception when duplicate_object then null;
end $$;

do $$
begin
  create domain permission_effect as text
    check (value in ('allow', 'deny'));
exception when duplicate_object then null;
end $$;

-- 1b. Organizations (if not exists from earlier schema)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text default 'active',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- 1c. Branches
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- 1d. Departments
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- 1e. Actor jurisdictions
create table if not exists actor_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references actors(id) on delete cascade,
  level jurisdiction_level not null,
  scope_id uuid,
  created_at timestamptz default now(),
  unique (actor_id, level, scope_id)
);

-- 1f. Permissions catalog
create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  action text not null unique,
  description text,
  federal_only boolean default false,
  created_at timestamptz default now()
);

-- 1g. Actor permissions
create table if not exists actor_permissions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references actors(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  effect permission_effect default 'allow',
  level jurisdiction_level not null,
  scope_id uuid,
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique (actor_id, permission_id, level, scope_id, effect)
);

-- 1h. Policy groups
create table if not exists policy_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_id uuid references organizations(id) on delete cascade,
  description text,
  created_at timestamptz default now()
);

create table if not exists policy_group_permissions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references policy_groups(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  effect permission_effect default 'allow',
  unique (group_id, permission_id)
);

create table if not exists actor_policy_groups (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references actors(id) on delete cascade,
  group_id uuid not null references policy_groups(id) on delete cascade,
  level jurisdiction_level not null,
  scope_id uuid,
  created_at timestamptz default now(),
  unique (actor_id, group_id, level, scope_id)
);

-- 1i. Delegated authority
create table if not exists delegated_authority (
  id uuid primary key default gen_random_uuid(),
  from_actor_id uuid not null references actors(id) on delete cascade,
  to_actor_id uuid not null references actors(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  level jurisdiction_level not null,
  scope_id uuid,
  reason text,
  expires_at timestamptz not null,
  revoked boolean default false,
  created_at timestamptz default now()
);

-- 1j. Bookings table (was missing entirely)
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  passenger_actor_id uuid references actors(id) on delete set null,
  route_from text,
  route_to text,
  fare numeric,
  status text default 'pending',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- 1k. Invite tokens
create table if not exists invite_tokens (
  token uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id),
  organization_id uuid references organizations(id),
  actor_type text references roles(id),
  metadata jsonb default '{}',
  expires_at timestamptz not null default (now() + interval '7 days'),
  used boolean default false,
  used_by uuid references profiles(id),
  used_at timestamptz,
  created_at timestamptz default now()
);

-- 1l. Audit logs
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_id uuid,
  profile_id uuid,
  performed_by uuid,
  target_table text,
  target_id uuid,
  details jsonb default '{}',
  created_at timestamptz default now()
);

-- 1m. Fleet ownership
create table if not exists fleet_ownership (
  actor_id uuid not null references actors(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  percentage numeric default 100 check (percentage > 0 and percentage <= 100),
  primary key (actor_id, vehicle_id)
);

-- 1n. Organization members (if not exists)
create table if not exists organization_members (
  actor_id uuid not null references actors(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null default 'member',
  primary key (actor_id, organization_id)
);


-- =========================================================
-- PHASE 2: ALTER EXISTING TABLES & BACKFILL
-- =========================================================

-- 2a. Add jurisdiction columns to vehicles
alter table vehicles
  add column if not exists branch_id uuid references branches(id) on delete set null,
  add column if not exists department_id uuid references departments(id) on delete set null;

-- If vehicles already has organization_id, ensure FK exists
do $$
begin
  alter table vehicles
    add constraint vehicles_organization_id_fkey
    foreign key (organization_id) references organizations(id) on delete set null;
exception when duplicate_object then null;
end $$;

-- 2b. Add FK to driver_assignments.vehicle_id if missing
do $$
begin
  alter table driver_assignments
    add constraint driver_assignments_vehicle_fkey
    foreign key (vehicle_id) references vehicles(id) on delete cascade;
exception when duplicate_object then null;
end $$;

-- 2c. Add FK to conductor_assignments.vehicle_id if missing
do $$
begin
  alter table conductor_assignments
    add constraint conductor_assignments_vehicle_fkey
    foreign key (vehicle_id) references vehicles(id) on delete cascade;
exception when duplicate_object then null;
end $$;

-- 2d. Add unsubscribed to profiles if missing
alter table profiles
  add column if not exists unsubscribed boolean not null default false;

-- 2e. Ensure updated_at default on profiles
alter table profiles
  alter column updated_at set default now();

-- 2f. Seed core permissions
insert into permissions (action, description, federal_only) values
  -- Vehicle permissions
  ('vehicle.view',       'View vehicle details',             false),
  ('vehicle.create',     'Register a new vehicle',           false),
  ('vehicle.update',     'Update vehicle info',              false),
  ('vehicle.delete',     'Remove a vehicle',                 false),
  -- Booking permissions
  ('booking.view',       'View booking details',             false),
  ('booking.create',     'Create a booking',                 false),
  ('booking.modify',     'Modify an existing booking',       false),
  ('booking.cancel',     'Cancel a booking',                 false),
  -- Compliance permissions
  ('compliance.view',    'View compliance events',           false),
  ('compliance.create',  'Log a compliance event',           false),
  ('compliance.resolve', 'Resolve a compliance event',       false),
  -- Reconciliation permissions
  ('reconciliation.view','View reconciliation data',         false),
  -- Driver/Conductor management
  ('assignment.view',    'View driver/conductor assignments',false),
  ('assignment.manage',  'Create/modify assignments',        false),
  -- Organization management
  ('org.manage',         'Manage organization settings',     false),
  ('org.members',        'Manage organization members',      false),
  -- Platform admin
  ('admin.full',         'Full platform access',             true)
on conflict (action) do nothing;

-- 2g. Backfill: Convert existing stage operators to jurisdictions
-- For each stage_assignment, create an actor_jurisdiction at org level
insert into actor_jurisdictions (actor_id, level, scope_id)
select distinct sa.operator_id, 'org', sa.organization_id
from stage_assignments sa
where sa.organization_id is not null
on conflict do nothing;

-- 2h. Backfill: Give existing org admins the 'org.manage' policy group
-- First create a default admin policy group
do $$
declare
  admin_group_id uuid;
begin
  insert into policy_groups (name, description)
  values ('Default Org Admin', 'Full access within an organization')
  returning id into admin_group_id;

  -- Add all non-federal permissions to this group
  insert into policy_group_permissions (group_id, permission_id, effect)
  select admin_group_id, p.id, 'allow'
  from permissions p
  where p.federal_only = false;

  -- Assign to existing org admins
  insert into actor_policy_groups (actor_id, group_id, level, scope_id)
  select om.actor_id, admin_group_id, 'org', om.organization_id
  from organization_members om
  where om.role = 'admin'
  on conflict do nothing;
end $$;

-- 2i. Backfill: Give platform ADMINs federal jurisdiction
insert into actor_jurisdictions (actor_id, level, scope_id)
select a.id, 'federal', null
from actors a
where a.type = 'ADMIN'
on conflict do nothing;


-- =========================================================
-- PHASE 3: INDEXES
-- =========================================================

create index if not exists idx_actors_profile on actors(profile_id);
create index if not exists idx_actors_type on actors(type);
create index if not exists idx_branches_org on branches(organization_id);
create index if not exists idx_departments_branch on departments(branch_id);
create index if not exists idx_actor_jurisdictions_actor on actor_jurisdictions(actor_id);
create index if not exists idx_permissions_action on permissions(action);
create index if not exists idx_actor_permissions_lookup on actor_permissions(actor_id, effect);
create index if not exists idx_actor_policy_groups_actor on actor_policy_groups(actor_id);
create index if not exists idx_delegated_authority_to on delegated_authority(to_actor_id);
create index if not exists idx_vehicles_org on vehicles(organization_id);
create index if not exists idx_vehicles_branch on vehicles(branch_id);
create index if not exists idx_bookings_org on bookings(organization_id);
create index if not exists idx_bookings_vehicle on bookings(vehicle_id);
create index if not exists idx_compliance_vehicle on compliance_events(vehicle_id);
create index if not exists idx_org_members_org on organization_members(organization_id);
create index if not exists idx_audit_logs_created on audit_logs(created_at desc);
create index if not exists idx_audit_logs_event on audit_logs(event_type, created_at desc);
create index if not exists idx_invite_tokens_org on invite_tokens(organization_id);
create index if not exists idx_stage_assignments_operator on stage_assignments(operator_id);


-- =========================================================
-- PHASE 4: DROP OLD RLS POLICIES (from Doc 1 schema)
-- =========================================================
-- These are the hardcoded stage-operator-based policies being replaced.

-- Vehicles old policies
drop policy if exists "Operators can view vehicles in their stage routes" on vehicles;
drop policy if exists "Operators can update compliance status for vehicles in their stage routes" on vehicles;
drop policy if exists "Vehicle insertion restricted to admin" on vehicles;
drop policy if exists "Vehicle deletion restricted to admin" on vehicles;

-- Driver assignments old policies
drop policy if exists "Operators can view driver assignments for their stage vehicles" on driver_assignments;
drop policy if exists "Driver assignments modification restricted to admin" on driver_assignments;
drop policy if exists "Driver assignments deletion restricted to admin" on driver_assignments;

-- Conductor assignments old policies
drop policy if exists "Operators can view conductor assignments for their stage vehicles" on conductor_assignments;
drop policy if exists "Conductor assignments modification restricted to admin" on conductor_assignments;
drop policy if exists "Conductor assignments deletion restricted to admin" on conductor_assignments;

-- Compliance events old policies
drop policy if exists "Operators can view compliance events for their stage vehicles" on compliance_events;
drop policy if exists "Operators can resolve compliance events for their stage vehicles" on compliance_events;

-- Reconciliation events old policies
drop policy if exists "Operators can view reconciliation events for their stage vehicles" on reconciliation_events;
drop policy if exists "Reconciliation events modification restricted to admin" on reconciliation_events;
drop policy if exists "Reconciliation events deletion restricted to admin" on reconciliation_events;

-- Stage assignments old policies
drop policy if exists "Operators can view their assigned stages" on stage_assignments;
drop policy if exists "Operators can insert their stage assignment" on stage_assignments;
drop policy if exists "Operators can update their stage assignment" on stage_assignments;
drop policy if exists "Stage assignment deletion restricted to admin" on stage_assignments;

-- Actor requests old policies
drop policy if exists "Actor requests are viewable by owner" on actor_requests;
drop policy if exists "Owner can create their request" on actor_requests;
drop policy if exists "Admins can view pending requests" on actor_requests;
drop policy if exists "Admins can update requests" on actor_requests;

-- Drop old bootstrap_session (will be recreated)
drop function if exists public.bootstrap_session();


-- =========================================================
-- PHASE 5: Apply new functions and policies
-- =========================================================
-- At this point, run 02_rls_and_functions.sql to create:
--   - get_actor_ids_for_user()
--   - scope_covers_resource()
--   - can_actor_perform() (fixed version)
--   - current_user_can()
--   - All new RLS policies
--   - bootstrap_session() (updated)
--   - Audit triggers

-- NOTE: The 02_rls_and_functions.sql file should be executed
-- immediately after this migration completes.


commit;

-- =========================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- =========================================================
-- Run these to verify the migration was successful:

-- Check all tables exist
-- select tablename from pg_tables where schemaname = 'public' order by tablename;

-- Check permissions were seeded
-- select * from permissions order by action;

-- Check existing actors got jurisdictions
-- select a.id, a.type, aj.level, aj.scope_id
-- from actors a
-- left join actor_jurisdictions aj on aj.actor_id = a.id
-- order by a.type;

-- Check org admins got policy groups
-- select a.type, pg.name, apg.level, apg.scope_id
-- from actor_policy_groups apg
-- join actors a on a.id = apg.actor_id
-- join policy_groups pg on pg.id = apg.group_id;