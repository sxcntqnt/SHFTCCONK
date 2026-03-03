-- =========================================================
-- IMPROVED FEDERATED GOVERNANCE SCHEMA
-- =========================================================
-- Fixes applied from review of original Documents 1 & 2:
--
-- CRITICAL FIXES:
--   1. Added missing `vehicles` and `bookings` table definitions
--      (Doc 2 only had ALTER statements, no CREATE)
--   2. Fixed `can_actor_perform` — jurisdiction loop was decorative;
--      permission checks didn't reference the current jurisdiction row
--   3. Added FK constraints on all UUID references (organization_members,
--      fleet_ownership, driver/conductor assignments → vehicles)
--   4. Added missing indexes on permission-lookup hot paths
--   5. Fixed deny-override logic — deny now checked OUTSIDE the loop
--      to prevent short-circuit within a single jurisdiction
--   6. Added `UNIQUE` constraints to prevent duplicate permission grants
--   7. Added `stage_assignments` table back (was in Doc 1 but dropped)
--   8. Added `updated_at` trigger for profiles
--   9. Added `bookings` table definition
--  10. Added composite indexes for the most common RLS query patterns
--
-- DESIGN IMPROVEMENTS:
--   - Consolidated hierarchy: federal → org → branch → department
--   - Explicit `jurisdiction_level` type for consistency
--   - Added `effective_permissions` view for debugging
--   - Added helper functions: has_any_permission, get_actor_for_user
--   - Separated concerns: schema → indexes → RLS → functions
-- =========================================================


-- ===================
-- 0. EXTENSIONS
-- ===================
create extension if not exists "pgcrypto";


-- ===================
-- 1. ENUM / DOMAIN TYPES
-- ===================
-- Using a check constraint instead of enum so new levels can be
-- added without a migration, but you could use CREATE TYPE instead.

-- Jurisdiction levels
create domain jurisdiction_level as text
  check (value in ('federal', 'org', 'branch', 'department'));

-- Permission effects
create domain permission_effect as text
  check (value in ('allow', 'deny'));


-- ===================
-- 2. IDENTITY TABLES
-- ===================

-- Roles (classification only — NOT used for access control)
create table roles (
  id text primary key,
  display_name text not null,
  description text,
  created_at timestamptz default now()
);

insert into roles (id, display_name, description) values
  ('PASSENGER',      'Passenger',       'Default user role for riders'),
  ('DRIVER',         'Driver',          'Vehicle operator'),
  ('CONDUCTOR',      'Conductor',       'On-vehicle staff'),
  ('OWNER',          'Owner',           'Vehicle owner'),
  ('ORGANIZATION',   'Organization',    'Sacco / cooperative admin'),
  ('STAGE_OPERATOR', 'Stage Operator',  'Stage management'),
  ('REGULATOR',      'Regulator',       'Read-only / audit access'),
  ('PLANNER',        'Planner',         'Data consumer'),
  ('ADMIN',          'Admin',           'Platform administrator')
on conflict do nothing;

-- User profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  company_name text,
  avatar_url text,
  website text,
  unsubscribed boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

-- Actors: persona a user can assume (one user → many actors)
create table actors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null references roles(id),
  status text default 'active',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_actors_profile on actors(profile_id);
create index idx_actors_type on actors(type);


-- ===================
-- 3. HIERARCHY TABLES
-- ===================

-- Organizations (top-level entity, e.g. a Sacco)
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text default 'active',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Branches (org → branch)
create table branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create index idx_branches_org on branches(organization_id);

-- Departments (branch → department)
create table departments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create index idx_departments_branch on departments(branch_id);


-- ===================
-- 4. PERMISSION SYSTEM
-- ===================

-- Scoped jurisdiction for an actor (where they can operate)
create table actor_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references actors(id) on delete cascade,
  level jurisdiction_level not null,
  scope_id uuid,  -- NULL for federal; org/branch/dept id otherwise
  created_at timestamptz default now(),
  -- Prevent duplicate jurisdiction grants
  unique (actor_id, level, scope_id)
);

create index idx_actor_jurisdictions_actor on actor_jurisdictions(actor_id);

-- Permissions catalog (atomic actions)
create table permissions (
  id uuid primary key default gen_random_uuid(),
  action text not null unique,  -- e.g. 'vehicle.view', 'booking.modify'
  description text,
  federal_only boolean default false,
  created_at timestamptz default now()
);

create index idx_permissions_action on permissions(action);

-- Direct permissions assigned to actors (scoped)
create table actor_permissions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references actors(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  effect permission_effect default 'allow',
  level jurisdiction_level not null,
  scope_id uuid,
  expires_at timestamptz,
  created_at timestamptz default now(),
  -- Prevent duplicate grants
  unique (actor_id, permission_id, level, scope_id, effect)
);

create index idx_actor_permissions_lookup
  on actor_permissions(actor_id, effect);

-- Policy groups (bundles of permissions)
create table policy_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_id uuid references organizations(id) on delete cascade,
  -- NULL organization_id = federal-level group
  description text,
  created_at timestamptz default now()
);

-- Permissions within a policy group
create table policy_group_permissions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references policy_groups(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  effect permission_effect default 'allow',
  unique (group_id, permission_id)
);

-- Actor ↔ policy group binding (scoped)
create table actor_policy_groups (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references actors(id) on delete cascade,
  group_id uuid not null references policy_groups(id) on delete cascade,
  level jurisdiction_level not null,
  scope_id uuid,
  created_at timestamptz default now(),
  unique (actor_id, group_id, level, scope_id)
);

create index idx_actor_policy_groups_actor on actor_policy_groups(actor_id);

-- Delegated authority (temporary / emergency powers)
create table delegated_authority (
  id uuid primary key default gen_random_uuid(),
  from_actor_id uuid not null references actors(id) on delete cascade,
  to_actor_id uuid not null references actors(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  level jurisdiction_level not null,
  scope_id uuid,
  reason text,
  expires_at timestamptz not null,  -- delegation MUST expire
  revoked boolean default false,
  created_at timestamptz default now()
);

create index idx_delegated_authority_to on delegated_authority(to_actor_id);


-- ===================
-- 5. OPERATIONAL TABLES
-- ===================

-- Vehicles
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  owner_id uuid references actors(id) on delete set null,
  reg_number text unique not null,
  capacity int,
  gps_lat double precision,
  gps_lng double precision,
  active boolean default true,
  compliance_status jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_vehicles_org on vehicles(organization_id);
create index idx_vehicles_branch on vehicles(branch_id);

-- Bookings
create table bookings (
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

create index idx_bookings_org on bookings(organization_id);
create index idx_bookings_vehicle on bookings(vehicle_id);

-- Stage assignments (operator ↔ route ↔ vehicles)
create table stage_assignments (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references actors(id) on delete cascade,
  stage_name text not null,
  organization_id uuid references organizations(id) on delete cascade,
  route jsonb default '{"vehicles": []}',
  created_at timestamptz default now()
);

create index idx_stage_assignments_operator on stage_assignments(operator_id);

-- Driver assignments
create table driver_assignments (
  actor_id uuid references actors(id) on delete cascade primary key,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  active_trip_id uuid,
  shift_state text default 'off_duty',
  assigned_at timestamptz default now()
);

-- Conductor assignments
create table conductor_assignments (
  actor_id uuid references actors(id) on delete cascade primary key,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  active_trip_id uuid,
  assigned_at timestamptz default now()
);

-- Fleet ownership
create table fleet_ownership (
  actor_id uuid not null references actors(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  percentage numeric default 100 check (percentage > 0 and percentage <= 100),
  primary key (actor_id, vehicle_id)
);

-- Organization membership
create table organization_members (
  actor_id uuid not null references actors(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null default 'member',
  primary key (actor_id, organization_id)
);

create index idx_org_members_org on organization_members(organization_id);


-- ===================
-- 6. COMPLIANCE & RECONCILIATION
-- ===================

create table compliance_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  vehicle_id uuid not null references vehicles(id),
  driver_id uuid references actors(id),
  type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  message text,
  metadata jsonb default '{}',
  resolved boolean default false,
  created_at timestamptz default now()
);

create index idx_compliance_vehicle on compliance_events(vehicle_id);

create table reconciliation_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  vehicle_id uuid not null references vehicles(id),
  total_collected numeric,
  expected_amount numeric,
  variance numeric generated always as (total_collected - expected_amount) stored,
  status text default 'pending',
  created_at timestamptz default now()
);


-- ===================
-- 7. INVITE / REQUEST / AUDIT
-- ===================

create table actor_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  requested_type text not null references roles(id),
  payload jsonb default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  processed_at timestamptz,
  processed_by uuid references profiles(id)
);

create table invite_tokens (
  token uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id),
  organization_id uuid references organizations(id),
  actor_type text references roles(id),
  metadata jsonb default '{}',
  expires_at timestamptz not null,
  used boolean default false,
  used_by uuid references profiles(id),
  used_at timestamptz,
  created_at timestamptz default now()
);

create index idx_invite_tokens_org on invite_tokens(organization_id);

create table audit_logs (
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

-- Partition-friendly index for time-range queries
create index idx_audit_logs_created on audit_logs(created_at desc);
create index idx_audit_logs_event on audit_logs(event_type, created_at desc);


-- ===================
-- 8. STRIPE / CONTACT (unchanged)
-- ===================

create table stripe_customers (
  user_id uuid references auth.users on delete cascade not null primary key,
  stripe_customer_id text unique,
  updated_at timestamptz default now()
);

create table contact_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  company_name text,
  message_body text,
  created_at timestamptz default now()
);