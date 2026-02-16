-- Create a table for public profiles
-- Create a table for roles (lookup table for allowed roles)
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

create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  company_name text,
  avatar_url text,
  website text
);
-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security for more details.
alter table profiles
  enable row level security;

-- Index to speed up queries by role
-- (role-based index removed — role is now represented by `actors` table)

create policy "Profiles are viewable by self." on profiles
  for select using (auth.uid() = id);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);
-- (admin policies removed; use organization_members/actors for admin-like checks)

-- Actors table: represents the persona/actor a person can assume in the system
create table actors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  type text references public.roles(id),
  status text,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_actors_profile on public.actors(profile_id);

-- Driver assignments: operational bindings for drivers
create table driver_assignments (
  actor_id uuid references public.actors(id) on delete cascade,
  vehicle_id uuid,
  active_trip_id uuid,
  shift_state text,
  primary key (actor_id)
);

-- Conductor assignments: operational bindings for conductors
create table conductor_assignments (
  actor_id uuid references public.actors(id) on delete cascade,
  vehicle_id uuid,
  active_trip_id uuid,
  primary key (actor_id)
);

-- Fleet ownerships (owners)
create table fleet_ownership (
  actor_id uuid references public.actors(id) on delete cascade,
  vehicle_id uuid,
  percentage numeric default 100,
  primary key (actor_id, vehicle_id)
);

-- Organization membership for org admins/managers
create table organization_members (
  actor_id uuid references public.actors(id) on delete cascade,
  organization_id uuid,
  role text,
  primary key (actor_id, organization_id)
);

-- Audit logs: record approvals, invite usage, and admin actions
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_id uuid,
  profile_id uuid,
  performed_by uuid,
  details jsonb,
  created_at timestamptz default now()
);

-- Create Stripe Customer Table
-- One stripe customer per user (PK enforced)
-- Limit RLS policies -- mostly only server side access
create table stripe_customers (
  user_id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  stripe_customer_id text unique
);
alter table stripe_customers enable row level security;

-- Create a table for "Contact Us" form submissions
-- Limit RLS policies -- only server side access
create table contact_requests (
  id uuid primary key default gen_random_uuid(),
  updated_at timestamp with time zone,
  first_name text,
  last_name text,
  email text,
  phone text,
  company_name text,
  message_body text
);
alter table contact_requests enable row level security;

-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
-- See https://supabase.com/docs/guides/auth/managing-user-data#using-triggers for more details.
create function public.handle_new_user()
returns trigger as $$
begin
  -- create a simple profile record for the new user; actor bindings are managed separately
  insert into public.profiles (id, full_name, avatar_url, updated_at)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', now());
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC: bootstrap_session
-- Determines the user's operational landing route and returns context for the client to enrich session
create function public.bootstrap_session()
returns jsonb as $$
declare
  uid uuid := auth.uid();
  p record;
  a record;
  landing text := '/account';
begin
  select * into p from public.profiles where id = uid;
  if not found then
    return jsonb_build_object('route','/onboarding');
  end if;

  -- Highest priority: active conductor assignment
  select a.* into a from public.actors a
    join public.conductor_assignments ca on ca.actor_id = a.id
    where a.profile_id = p.id and ca.active_trip_id is not null
    limit 1;
  if found then
    landing := '/conductor/trip';
  else
    -- Active driver with trip
    select a.* into a from public.actors a
      join public.driver_assignments da on da.actor_id = a.id
      where a.profile_id = p.id and da.active_trip_id is not null
      limit 1;
    if found then
      landing := '/driver/navigation';
    else
      -- Owner of any vehicle
      select a.* into a from public.actors a
        join public.fleet_ownership fo on fo.actor_id = a.id
        where a.profile_id = p.id
        limit 1;
      if found then
        landing := '/owner/dashboard';
      else
        -- Org admin/member check
        select a.* into a from public.actors a
          join public.organization_members om on om.actor_id = a.id and om.role = 'admin'
          where a.profile_id = p.id
          limit 1;
        if found then
          landing := '/org/overview';
        else
          landing := '/app';
        end if;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'route', landing,
    'profile_id', p.id::text,
    'actor_id', coalesce(a.id::text, null),
    'actor_type', coalesce(a.type, null)
  );
end;
$$ language plpgsql security definer;

-- Auto-create a PASSENGER actor when a profile is created (fast-passenger onboarding)
create function public.create_passenger_actor_for_profile()
returns trigger as $$
declare
  existing int;
begin
  -- don't duplicate passenger actor
  select 1 into existing from public.actors where profile_id = new.id and type = 'PASSENGER' limit 1;
  if found then
    return new;
  end if;
  insert into public.actors (profile_id, type, status, metadata, created_at)
  values (new.id, 'PASSENGER', 'active', jsonb_build_object('auto','true'), now());
  return new;
end;
$$ language plpgsql security definer;
create trigger on_profile_created_create_passenger
  after insert on public.profiles
  for each row execute procedure public.create_passenger_actor_for_profile();

-- Actor requests: users apply for elevated actor types (driver/conductor/owner)
create table actor_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  requested_type text references public.roles(id),
  payload jsonb,
  status text not null default 'pending',
  created_at timestamptz default now(),
  processed_at timestamptz,
  processed_by uuid
);

-- Row level security for actor_requests
alter table public.actor_requests enable row level security;

create policy "Actor requests are viewable by owner" on public.actor_requests
  for select using (auth.uid() = profile_id);

create policy "Owner can create their request" on public.actor_requests
  for insert with check (auth.uid() = profile_id);

create policy "Admins can view pending requests" on public.actor_requests
  for select using (
    exists (select 1 from public.actors a where a.profile_id = auth.uid() and a.type = 'ADMIN')
    OR exists (
      select 1 from public.organization_members om
      join public.actors act on act.id = om.actor_id
      where act.profile_id = auth.uid() and om.role = 'admin'
    )
  );

create policy "Admins can update requests" on public.actor_requests
  for update using (
    exists (select 1 from public.actors a where a.profile_id = auth.uid() and a.type = 'ADMIN')
    OR exists (
      select 1 from public.organization_members om
      join public.actors act on act.id = om.actor_id
      where act.profile_id = auth.uid() and om.role = 'admin'
    )
  ) with check (
    exists (select 1 from public.actors a where a.profile_id = auth.uid() and a.type = 'ADMIN')
    OR exists (
      select 1 from public.organization_members om
      join public.actors act on act.id = om.actor_id
      where act.profile_id = auth.uid() and om.role = 'admin'
    )
  );


-- Approve an actor request: creates an actor and returns actor id
create function public.approve_actor_request(request_id uuid, binding_type text default null, binding_target uuid default null)
returns jsonb as $$
declare
  r record;
  actor_id uuid;
begin
  select * into r from public.actor_requests where id = request_id for update;
  if not found then
    return jsonb_build_object('error','not_found');
  end if;
  -- Authorization: only platform admins or org admins may approve requests
  if not exists (
    select 1 from public.actors a where a.profile_id = auth.uid() and a.type = 'ADMIN'
  ) and not exists (
    select 1 from public.organization_members om
      join public.actors act on act.id = om.actor_id
      where act.profile_id = auth.uid() and om.role = 'admin'
  ) then
    return jsonb_build_object('error','not_authorized');
  end if;
  if r.status <> 'pending' then
    return jsonb_build_object('error','already_processed','status', r.status);
  end if;
  insert into public.actors (profile_id, type, status, metadata)
  values (r.profile_id, r.requested_type, 'active', coalesce(r.payload, '{}'))
  returning id into actor_id;

  -- Optionally create operational binding if requested by admin
  if binding_type is not null then
    if binding_type = 'driver_assignment' then
      insert into public.driver_assignments (actor_id, vehicle_id) values (actor_id, binding_target);
    elsif binding_type = 'conductor_assignment' then
      insert into public.conductor_assignments (actor_id, vehicle_id) values (actor_id, binding_target);
    elsif binding_type = 'fleet_ownership' then
      insert into public.fleet_ownership (actor_id, vehicle_id, percentage) values (actor_id, binding_target, 100) on conflict do nothing;
    elsif binding_type = 'organization_member' then
      insert into public.organization_members (actor_id, organization_id, role) values (actor_id, binding_target, 'member') on conflict do nothing;
    end if;
  end if;

  update public.actor_requests set status = 'approved', processed_at = now(), processed_by = auth.uid() where id = request_id;

  -- Audit log
  insert into public.audit_logs (event_type, actor_id, profile_id, performed_by, details)
  values (
    'actor_request_approved', actor_id, r.profile_id, auth.uid(), jsonb_build_object('request_id', request_id::text, 'binding_type', binding_type, 'binding_target', coalesce(binding_target::text, ''))
  );

  return jsonb_build_object('actor_id', actor_id::text);
end;
$$ language plpgsql security definer;

-- Invite tokens: create pre-approved invites that bind new users to an actor type/org/vehicle
create table invite_tokens (
  token uuid primary key default gen_random_uuid(),
  created_by uuid,
  organization_id uuid,
  actor_type text references public.roles(id),
  metadata jsonb,
  expires_at timestamptz,
  used boolean default false,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz default now()
);

-- Accept an invite: create actor bound to current user based on token
create function public.accept_invite(invite_token uuid)
returns jsonb as $$
declare
  t record;
  actor_id uuid;
begin
  select * into t from public.invite_tokens where token = invite_token for update;
  if not found then
    return jsonb_build_object('error','invalid_token');
  end if;
  if t.used then
    return jsonb_build_object('error','already_used');
  end if;
  if t.expires_at is not null and t.expires_at < now() then
    return jsonb_build_object('error','expired');
  end if;
  -- create actor for current auth.uid()
  insert into public.actors (profile_id, type, status, metadata)
  values (auth.uid(), t.actor_type, 'active', coalesce(t.metadata, '{}'))
  returning id into actor_id;
  update public.invite_tokens set used = true, used_by = auth.uid(), used_at = now() where token = invite_token;
  -- Audit log for invite usage
  insert into public.audit_logs (event_type, actor_id, profile_id, performed_by, details)
  values ('invite_accepted', actor_id, auth.uid(), auth.uid(), jsonb_build_object('invite_token', invite_token::text, 'invite_meta', coalesce(t.metadata, '{}')));
  return jsonb_build_object('actor_id', actor_id::text);
end;
$$ language plpgsql security definer;

-- Restrict execution: invite acceptance only for authenticated; revoke public
revoke execute on function public.accept_invite(uuid) from public;
grant execute on function public.accept_invite(uuid) to authenticated;


-- Restrict direct EXECUTE access: revoke from public, allow only authenticated DB role
revoke execute on function public.approve_actor_request(uuid,text,uuid) from public;
grant execute on function public.approve_actor_request(uuid,text,uuid) to authenticated;


-- Set up Storage!
insert into storage.buckets (id, name)
  values ('avatars', 'avatars');

-- Set up access controls for storage.
-- See https://supabase.com/docs/guides/storage#policy-examples for more details.
create policy "Avatar images are publicly accessible." on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Anyone can upload an avatar." on storage.objects
  for insert with check (bucket_id = 'avatars');
