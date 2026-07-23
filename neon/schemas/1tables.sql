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

-- User profiles: canonical domain identity.
-- No FK to any auth-provider table — profile outlives any auth credential.
-- Provider accounts are mapped via identity_accounts.
create table profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  company_name text,
  avatar_url text,
  website text,
  unsubscribed boolean not null default false,
  permissions_version int not null default 1,  -- cache-invalidation signal (Supabase JWT kill-switch removed)
  onboarding_status text
    not null default 'GUEST'
    check (onboarding_status in ('GUEST','AWAITING_KYC','ACTIVE')),
  kyc_intent text
    check (kyc_intent in ('passenger','crew','operator','org_staff')),
  date_of_birth date,
  guardian_profile_id uuid references profiles(id) on delete set null,
  kyc_status text
    check (kyc_status in ('pending','approved','rejected','expired')),
  gatebill_job_id text unique,
  phone text,
  starting_locations text,
  destinations text,
  highway_corridors text[],
  routes_to_track text[],
  preferred_vehicle_type text[],
  social_media_links text,
  emergency_contacts text,
  languages_spoken text[],
  time_zone text default 'Africa/Nairobi',
  working_hours_start time,
  working_hours_end time,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Provider identity accounts.
-- Maps external auth providers to a canonical profile.
-- The auth-service (opaque atk_/rtk_ session tokens, Dgraph-backed)
-- resolves the caller and sets app.current_profile_id per-transaction;
-- this table remains the provider mapping layer for that resolution.
-- Providers: 'internal' (Dgraph/auth-service) | 'google' | 'mpesa'.
create table identity_accounts (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references profiles(id) on delete cascade,
  provider         text not null,        -- 'internal' | 'google' | 'mpesa'
  provider_subject text not null,        -- Dgraph UID, oauth sub, phone, etc.
  created_at       timestamptz default now(),
  unique (provider, provider_subject)    -- one account per provider identity
);

-- Actors: persona a user can assume (one profile → many)
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
  max_vehicles integer
    check (max_vehicles > 0),
  metadata jsonb,
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
-- CONTACT
-- ═══════════════════════════════════════════════════════════
-- (stripe_customers dropped — mpesa_customers, defined earlier
-- alongside mpesa_payouts/mpesa_settlements, is the retained
-- billing/payments table.)

create table contact_requests (
  id uuid primary key default gen_random_uuid(),
  first text NOT NULL,
  last text NOT NULL,
  email text NOT NULL,
  phone text,
  org text,
  type text,
  message text NOT NULL,
  ip_address text NOT NULL,
  created_at timestamptz default now()
);

-- Organization news / updates
create table if not exists public.org_news (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid references public.profiles(id),
  title text not null,
  body text not null,
  category text not null default 'general',
  severity text default 'info',
  pinned boolean default false,
  published boolean default true,
  route_ids uuid[] default '{}',
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Actor verification tokens (OTP / magic link)
create table if not exists actor_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references actors(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  method text not null check (method in ('email', 'sms')),
  token_hash text not null,
  destination text not null,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint one_active_token_per_actor unique (actor_id, method)
);

-- M-Pesa billing and payouts
create table if not exists public.mpesa_customers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone_number text,
  mpesa_customer_id text,
  subscription_code text,
  subscription_status text check (subscription_status in ('active','inactive','pending','cancelled')),
  is_minor_account boolean default false,
  guardian_phone text,
  daily_limit numeric,
  per_transaction_limit numeric,
  send_money_enabled boolean default true,
  lipa_na_mpesa_enabled boolean default true,
  documents_submitted boolean default false,
  documents_due_by timestamptz,
  updated_at timestamptz default now()
);

create table mpesa_payouts (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null unique,
  originator_id text,
  actor_id uuid references actors(id) on delete set null,
  phone text not null,
  amount numeric not null check (amount > 0),
  role text not null,
  trip_id uuid,
  organization_id uuid references organizations(id) on delete set null,
  remarks text,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  result_code integer,
  result_description text,
  transaction_id text,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table mpesa_settlements (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null unique,
  originator_id text,
  shortcode text not null,
  amount numeric not null check (amount > 0),
  reference text,
  organization_id uuid references organizations(id) on delete set null,
  initiated_by uuid references actors(id) on delete set null,
  remarks text,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  result_code integer,
  result_description text,
  transaction_id text,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Geofences
create table if not exists public.geofences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coords jsonb not null,
  scope text not null default 'personal' check (scope in ('personal','org')),
  profile_id uuid references public.profiles(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.geofences
  add constraint geofence_personal_needs_profile check (scope != 'personal' or profile_id is not null),
  add constraint geofence_org_needs_org check (scope != 'org' or org_id is not null);
