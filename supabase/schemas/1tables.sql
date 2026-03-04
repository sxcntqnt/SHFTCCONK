-- =========================================================
-- 01_tables.sql
-- =========================================================
-- All tables in FK-dependency order. No indexes, no RLS,
-- no functions — just structure.
-- =========================================================


-- ═══════════════════════════════════════════════════════════
-- IDENTITY
-- ═══════════════════════════════════════════════════════════

-- Roles: identity classification only (NOT access control)
create table roles (
  id text primary key,
  display_name text not null,
  description text,
  created_at timestamptz default now()
);

-- User profiles (1:1 with auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  company_name text,
  avatar_url text,
  website text,
  unsubscribed boolean not null default false,
  permissions_version int not null default 1,  -- JWT kill-switch
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Actors: persona a user can assume (one user → many)
create table actors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null references roles(id),
  status text default 'active',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);


-- ═══════════════════════════════════════════════════════════
-- HIERARCHY
-- ═══════════════════════════════════════════════════════════

-- Organizations (top-level, e.g. a Sacco)
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

-- Departments (branch → department)
create table departments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);


-- ═══════════════════════════════════════════════════════════
-- PERMISSION SYSTEM
-- ═══════════════════════════════════════════════════════════

-- Where an actor can operate
create table actor_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references actors(id) on delete cascade,
  level jurisdiction_level not null,
  scope_id uuid,  -- NULL = federal
  created_at timestamptz default now(),
  unique (actor_id, level, scope_id)
);

-- Atomic action catalog
create table permissions (
  id uuid primary key default gen_random_uuid(),
  action text not null unique,
  description text,
  federal_only boolean default false,
  created_at timestamptz default now()
);

-- Direct permission grants (scoped)
create table actor_permissions (
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

-- Named bundles of permissions
create table policy_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_id uuid references organizations(id) on delete cascade,
  description text,
  created_at timestamptz default now()
);

-- Permissions in each bundle
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

-- Temporary / emergency power transfer
create table delegated_authority (
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


-- ═══════════════════════════════════════════════════════════
-- OPERATIONAL TABLES
-- ═══════════════════════════════════════════════════════════

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

-- Stage assignments (operator ↔ route ↔ vehicles)
create table stage_assignments (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references actors(id) on delete cascade,
  stage_name text not null,
  organization_id uuid references organizations(id) on delete cascade,
  route jsonb default '{"vehicles": []}',
  created_at timestamptz default now()
);

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


-- ═══════════════════════════════════════════════════════════
-- COMPLIANCE & RECONCILIATION
-- ═══════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════
-- INVITE / REQUEST / AUDIT
-- ═══════════════════════════════════════════════════════════

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

-- Failed access attempts (security monitoring)
create table access_denied_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  profile_id uuid,
  action_attempted text not null,
  resource_type text,
  resource_org uuid,
  resource_branch uuid,
  resource_dept uuid,
  denial_reason text not null,
  created_at timestamptz default now()
);


-- ═══════════════════════════════════════════════════════════
-- STRIPE / CONTACT
-- ═══════════════════════════════════════════════════════════

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