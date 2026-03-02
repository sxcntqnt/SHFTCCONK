-- =========================================================
-- FULL PRODUCTION-READY DATABASE SCHEMA & RLS
-- =========================================================

-- -------------------------------
-- Roles Table
-- -------------------------------
create table roles (
  id text primary key,
  display_name text,
  description text
);

-- Seed roles
insert into roles (id, display_name, description) values
  ('PASSENGER','Passenger','Default user role for riders'),
  ('DRIVER','Driver','Vehicle operator'),
  ('CONDUCTOR','Conductor','On-vehicle staff'),
  ('OWNER','Owner','Vehicle owner'),
  ('ORGANIZATION','Organization','Sacco / cooperative admin'),
  ('STAGE_OPERATOR','Stage Operator','Stage management'),
  ('REGULATOR','Regulator','Read-only/audit access'),
  ('PLANNER','Planner','Data consumer'),
  ('ADMIN','Admin','Platform administrator')
ON CONFLICT DO NOTHING;

-- -------------------------------
-- Profiles Table
-- -------------------------------
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  company_name text,
  avatar_url text,
  website text
);

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;

-- Policies for profiles
create policy "Profiles are viewable by self." on profiles
  for select using (auth.uid() = id);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- -------------------------------
-- Actors Table
-- -------------------------------
create table actors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  type text references public.roles(id),
  status text,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_actors_profile on public.actors(profile_id);

-- -------------------------------
-- Stage Assignments (Route-Vehicle Mapping)
-- -------------------------------
create table stage_assignments (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid references actors(id) on delete cascade,
    stage_name text not null,
    organization_id uuid references organizations(id) on delete cascade,
    route jsonb, -- stores vehicle ids: { "vehicles": [id1, id2, ...] }
    created_at timestamptz default now()
);

alter table stage_assignments enable row level security;

-- Stage Assignment Policies
create policy "Operators can view their assigned stages" on stage_assignments
  for select using (operator_id = auth.uid());

create policy "Operators can insert their stage assignment" on stage_assignments
  for insert with check (operator_id = auth.uid());

create policy "Operators can update their stage assignment" on stage_assignments
  for update using (operator_id = auth.uid()) with check (operator_id = auth.uid());

create policy "Stage assignment deletion restricted to admin" on stage_assignments
  for delete using (
    exists (
      select 1 from organization_members om
      where om.actor_id = auth.uid() and om.role = 'admin'
    )
  );

-- -------------------------------
-- Vehicles Table
-- -------------------------------
create table vehicles (
    id uuid primary key,
    organization_id uuid references organizations(id),
    owner_id uuid references actors(id),
    reg_number text unique not null,
    capacity int,
    gps_lat double precision,
    gps_lng double precision,
    active boolean default true,
    compliance_status jsonb,
    created_at timestamptz default now()
);

alter table vehicles enable row level security;

-- Vehicle RLS Policies
create policy "Operators can view vehicles in their stage routes" on vehicles
  for select using (
    exists (
      select 1
      from stage_assignments sa
      where sa.operator_id = auth.uid()
        and sa.organization_id = vehicles.organization_id
        and vehicles.id::text = any (coalesce(sa.route->'vehicles'::text[], '{}'))
    )
  );

create policy "Operators can update compliance status for vehicles in their stage routes" on vehicles
  for update using (
    exists (
      select 1
      from stage_assignments sa
      where sa.operator_id = auth.uid()
        and sa.organization_id = vehicles.organization_id
        and vehicles.id::text = any (coalesce(sa.route->'vehicles'::text[], '{}'))
    )
  ) with check (
    exists (
      select 1
      from stage_assignments sa
      where sa.operator_id = auth.uid()
        and sa.organization_id = vehicles.organization_id
        and vehicles.id::text = any (coalesce(sa.route->'vehicles'::text[], '{}'))
    )
  );

-- Insert/Delete restricted to admins
create policy "Vehicle insertion restricted to admin" on vehicles
  for insert using (
    exists (
      select 1 from organization_members om
      where om.actor_id = auth.uid() and om.role = 'admin'
    )
  );
create policy "Vehicle deletion restricted to admin" on vehicles
  for delete using (
    exists (
      select 1 from organization_members om
      where om.actor_id = auth.uid() and om.role = 'admin'
    )
  );

-- -------------------------------
-- Driver Assignments
-- -------------------------------
create table driver_assignments (
    actor_id uuid references actors(id) on delete cascade,
    vehicle_id uuid references vehicles(id),
    active_trip_id uuid,
    shift_state text,
    primary key(actor_id)
);

alter table driver_assignments enable row level security;

create policy "Operators can view driver assignments for their stage vehicles" on driver_assignments
  for select using (
    exists (
      select 1
      from stage_assignments sa
      join vehicles v on v.id = driver_assignments.vehicle_id
      where sa.operator_id = auth.uid()
        and sa.organization_id = v.organization_id
        and v.id::text = any (coalesce(sa.route->'vehicles'::text[], '{}'))
    )
  );

create policy "Driver assignments modification restricted to admin" on driver_assignments
  for insert using (false);
create policy "Driver assignments deletion restricted to admin" on driver_assignments
  for delete using (false);

-- -------------------------------
-- Conductor Assignments
-- -------------------------------
create table conductor_assignments (
    actor_id uuid references actors(id) on delete cascade,
    vehicle_id uuid references vehicles(id),
    active_trip_id uuid,
    primary key(actor_id)
);

alter table conductor_assignments enable row level security;

create policy "Operators can view conductor assignments for their stage vehicles" on conductor_assignments
  for select using (
    exists (
      select 1
      from stage_assignments sa
      join vehicles v on v.id = conductor_assignments.vehicle_id
      where sa.operator_id = auth.uid()
        and sa.organization_id = v.organization_id
        and v.id::text = any (coalesce(sa.route->'vehicles'::text[], '{}'))
    )
  );

create policy "Conductor assignments modification restricted to admin" on conductor_assignments
  for insert using (false);
create policy "Conductor assignments deletion restricted to admin" on conductor_assignments
  for delete using (false);

-- -------------------------------
-- Compliance Events
-- -------------------------------
create table compliance_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  vehicle_id uuid not null,
  driver_id uuid,
  type text not null,
  severity text not null,
  message text,
  metadata jsonb,
  resolved boolean default false,
  created_at timestamptz default now()
);

alter table compliance_events enable row level security;

create policy "Operators can view compliance events for their stage vehicles" on compliance_events
  for select using (
    exists (
      select 1
      from stage_assignments sa
      join vehicles v on v.id = compliance_events.vehicle_id
      where sa.operator_id = auth.uid()
        and sa.organization_id = v.organization_id
        and v.id::text = any (coalesce(sa.route->'vehicles'::text[], '{}'))
    )
  );

create policy "Operators can resolve compliance events for their stage vehicles" on compliance_events
  for update using (
    exists (
      select 1
      from stage_assignments sa
      join vehicles v on v.id = compliance_events.vehicle_id
      where sa.operator_id = auth.uid()
        and sa.organization_id = v.organization_id
        and v.id::text = any (coalesce(sa.route->'vehicles'::text[], '{}'))
    )
  ) with check (resolved = true);

-- -------------------------------
-- Reconciliation Events
-- -------------------------------
create table reconciliation_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  vehicle_id uuid not null,
  total_collected numeric,
  expected_amount numeric,
  variance numeric,
  status text,
  created_at timestamptz default now()
);

alter table reconciliation_events enable row level security;

create policy "Operators can view reconciliation events for their stage vehicles" on reconciliation_events
  for select using (
    exists (
      select 1
      from stage_assignments sa
      join vehicles v on v.id = reconciliation_events.vehicle_id
      where sa.operator_id = auth.uid()
        and sa.organization_id = v.organization_id
        and v.id::text = any (coalesce(sa.route->'vehicles'::text[], '{}'))
    )
  );

create policy "Reconciliation events modification restricted to admin" on reconciliation_events
  for update using (false);
create policy "Reconciliation events deletion restricted to admin" on reconciliation_events
  for delete using (false);

-- -------------------------------
-- Actor Requests & Invite System
-- -------------------------------
create table actor_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  requested_type text references roles(id),
  payload jsonb,
  status text not null default 'pending',
  created_at timestamptz default now(),
  processed_at timestamptz,
  processed_by uuid
);

alter table actor_requests enable row level security;

create policy "Actor requests are viewable by owner" on actor_requests
  for select using (auth.uid() = profile_id);

create policy "Owner can create their request" on actor_requests
  for insert with check (auth.uid() = profile_id);

-- Admins (platform or org) can view & update actor requests
create policy "Admins can view pending requests" on actor_requests
  for select using (
    exists (select 1 from actors a where a.profile_id = auth.uid() and a.type = 'ADMIN')
    OR exists (
      select 1 from organization_members om
      join actors act on act.id = om.actor_id
      where act.profile_id = auth.uid() and om.role = 'admin'
    )
  );

create policy "Admins can update requests" on actor_requests
  for update using (
    exists (select 1 from actors a where a.profile_id = auth.uid() and a.type = 'ADMIN')
    OR exists (
      select 1 from organization_members om
      join actors act on act.id = om.actor_id
      where act.profile_id = auth.uid() and om.role = 'admin'
    )
  ) with check (
    exists (select 1 from actors a where a.profile_id = auth.uid() and a.type = 'ADMIN')
    OR exists (
      select 1 from organization_members om
      join actors act on act.id = om.actor_id
      where act.profile_id = auth.uid() and om.role = 'admin'
    )
  );

-- -------------------------------------------------
-- Done: Full operator-stage-aware RLS with actors/invite system
-- -------------------------------------------------



-- ====================================================
-- bootstrap_session: returns all session info for frontend
-- ====================================================
create or replace function public.bootstrap_session()
returns jsonb
language plpgsql
security definer
as $$
declare
    user_profile profiles%rowtype;
    user_actors jsonb;
    org_memberships jsonb;
    assigned_stages jsonb;
    assigned_vehicles jsonb;
begin
    -- 1. Get the user's profile
    select * into user_profile
    from profiles
    where id = auth.uid();

    -- 2. Get all actors for this profile
    select jsonb_agg(row_to_json(a))
    into user_actors
    from actors a
    where a.profile_id = auth.uid();

    -- 3. Get organization memberships
    select jsonb_agg(jsonb_build_object(
        'organization_id', om.organization_id,
        'role', om.role
    ))
    into org_memberships
    from organization_members om
    join actors act on act.id = om.actor_id
    where act.profile_id = auth.uid();

    -- 4. Get stage assignments for this user if they are an operator
    select jsonb_agg(row_to_json(sa))
    into assigned_stages
    from stage_assignments sa
    join actors act on act.id = sa.operator_id
    where act.profile_id = auth.uid();

    -- 5. Get vehicles assigned via stages
    select jsonb_agg(row_to_json(v))
    into assigned_vehicles
    from vehicles v
    join stage_assignments sa on sa.organization_id = v.organization_id
    join actors act on act.id = sa.operator_id
    where act.profile_id = auth.uid()
      and v.id::text = any (coalesce(sa.route->'vehicles'::text[], '{}'));

    -- 6. Return JSON
    return jsonb_build_object(
        'profile', row_to_json(user_profile),
        'actors', user_actors,
        'organization_memberships', coalesce(org_memberships, '[]'::jsonb),
        'assigned_stages', coalesce(assigned_stages, '[]'::jsonb),
        'assigned_vehicles', coalesce(assigned_vehicles, '[]'::jsonb)
    );
end;
$$;