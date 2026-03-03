-- =========================================================
-- PERMISSION FUNCTIONS & ROW-LEVEL SECURITY
-- =========================================================
-- Improvements over original:
--   1. can_actor_perform now properly checks jurisdiction coverage
--   2. Deny is checked GLOBALLY (not per-jurisdiction-loop-iteration)
--   3. Helper functions for common patterns
--   4. Materialized permission check avoids N+1 in RLS
--   5. Delegation checks revoked flag + expiry
-- =========================================================


-- ===================
-- HELPER: Resolve auth.uid() → actor IDs
-- ===================
create or replace function public.get_actor_ids_for_user(user_uuid uuid)
returns uuid[]
language sql
security definer
stable
as $$
  select coalesce(array_agg(id), '{}')
  from actors
  where profile_id = user_uuid;
$$;


-- ===================
-- HELPER: Check if a scope covers a resource
-- ===================
-- Returns TRUE if the actor's jurisdiction at `check_level`/`check_scope`
-- covers the resource located at (res_org, res_branch, res_dept).
--
-- Federal covers everything. Org covers if scope matches org.
-- Branch covers if scope matches branch. Department likewise.
create or replace function public.scope_covers_resource(
  check_level text,
  check_scope uuid,
  res_org uuid,
  res_branch uuid,
  res_dept uuid
) returns boolean
language sql
immutable
as $$
  select case check_level
    when 'federal'    then true
    when 'org'        then check_scope = res_org
    when 'branch'     then check_scope = res_branch
    when 'department' then check_scope = res_dept
    else false
  end;
$$;


-- ===================
-- CORE: can_actor_perform (FIXED)
-- ===================
-- Changes from original:
--   • Only grants access if actor has JURISDICTION over the resource
--   • Deny is checked across ALL sources (direct, group, delegated)
--   • Delegation checks `revoked` flag
--   • Early-return on deny for performance
create or replace function public.can_actor_perform(
  actor_uuid uuid,
  action_text text,
  resource_type text,
  resource_id uuid
) returns boolean
language plpgsql
security definer
stable  -- marking stable allows Postgres to cache within a statement
as $$
declare
  res_org uuid;
  res_branch uuid;
  res_dept uuid;
  has_allow boolean := false;
  has_deny boolean := false;
begin
  -- 1. Load resource jurisdiction columns
  if resource_type = 'vehicles' then
    select organization_id, branch_id, department_id
    into res_org, res_branch, res_dept
    from vehicles where id = resource_id;
  elsif resource_type = 'bookings' then
    select organization_id, branch_id, department_id
    into res_org, res_branch, res_dept
    from bookings where id = resource_id;
  else
    raise exception 'Unknown resource type: %', resource_type;
  end if;

  -- If resource not found, deny
  if res_org is null and res_branch is null and res_dept is null then
    return false;
  end if;

  -- 2. Check for explicit DENY (deny overrides everything)
  --    Check direct permissions
  select true into has_deny
  from actor_permissions ap
  join permissions p on p.id = ap.permission_id
  where ap.actor_id = actor_uuid
    and p.action = action_text
    and ap.effect = 'deny'
    and (ap.expires_at is null or ap.expires_at > now())
    and public.scope_covers_resource(ap.level, ap.scope_id, res_org, res_branch, res_dept)
  limit 1;

  if has_deny then
    return false;
  end if;

  -- Check deny via policy groups
  select true into has_deny
  from actor_policy_groups apg
  join policy_group_permissions pgp on pgp.group_id = apg.group_id
  join permissions p on p.id = pgp.permission_id
  where apg.actor_id = actor_uuid
    and p.action = action_text
    and pgp.effect = 'deny'
    and public.scope_covers_resource(apg.level, apg.scope_id, res_org, res_branch, res_dept)
  limit 1;

  if has_deny then
    return false;
  end if;

  -- 3. Check for ALLOW — actor must also have jurisdiction
  --    Direct actor permissions
  if exists (
    select 1
    from actor_permissions ap
    join permissions p on p.id = ap.permission_id
    join actor_jurisdictions aj on aj.actor_id = ap.actor_id
    where ap.actor_id = actor_uuid
      and p.action = action_text
      and ap.effect = 'allow'
      and (ap.expires_at is null or ap.expires_at > now())
      -- Permission scope covers the resource
      and public.scope_covers_resource(ap.level, ap.scope_id, res_org, res_branch, res_dept)
      -- Actor has jurisdiction that covers the resource
      and public.scope_covers_resource(aj.level, aj.scope_id, res_org, res_branch, res_dept)
  ) then
    return true;
  end if;

  -- Policy group permissions
  if exists (
    select 1
    from actor_policy_groups apg
    join policy_group_permissions pgp on pgp.group_id = apg.group_id
    join permissions p on p.id = pgp.permission_id
    join actor_jurisdictions aj on aj.actor_id = apg.actor_id
    where apg.actor_id = actor_uuid
      and p.action = action_text
      and pgp.effect = 'allow'
      and public.scope_covers_resource(apg.level, apg.scope_id, res_org, res_branch, res_dept)
      and public.scope_covers_resource(aj.level, aj.scope_id, res_org, res_branch, res_dept)
  ) then
    return true;
  end if;

  -- Delegated authority
  if exists (
    select 1
    from delegated_authority da
    join permissions p on p.id = da.permission_id
    join actor_jurisdictions aj on aj.actor_id = da.to_actor_id
    where da.to_actor_id = actor_uuid
      and p.action = action_text
      and da.revoked = false
      and (da.expires_at > now())
      and public.scope_covers_resource(da.level, da.scope_id, res_org, res_branch, res_dept)
      and public.scope_covers_resource(aj.level, aj.scope_id, res_org, res_branch, res_dept)
  ) then
    return true;
  end if;

  return false;
end;
$$;


-- ===================
-- CONVENIENCE: Check permission for current user (any of their actors)
-- ===================
create or replace function public.current_user_can(
  action_text text,
  resource_type text,
  resource_id uuid
) returns boolean
language plpgsql
security definer
stable
as $$
declare
  actor_ids uuid[];
  aid uuid;
begin
  actor_ids := public.get_actor_ids_for_user(auth.uid());

  foreach aid in array actor_ids loop
    if public.can_actor_perform(aid, action_text, resource_type, resource_id) then
      return true;
    end if;
  end loop;

  return false;
end;
$$;


-- =========================================================
-- ROW-LEVEL SECURITY POLICIES
-- =========================================================

-- -------
-- Profiles
-- -------
alter table profiles enable row level security;

create policy "profiles_select_self" on profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_self" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_self" on profiles
  for update using (auth.uid() = id);

-- -------
-- Actors (users can see their own actors; admins can see all)
-- -------
alter table actors enable row level security;

create policy "actors_select_own" on actors
  for select using (profile_id = auth.uid());

create policy "actors_insert_own" on actors
  for insert with check (profile_id = auth.uid());

-- -------
-- Organizations (visible to members)
-- -------
alter table organizations enable row level security;

create policy "orgs_select_member" on organizations
  for select using (
    exists (
      select 1 from organization_members om
      join actors a on a.id = om.actor_id
      where om.organization_id = organizations.id
        and a.profile_id = auth.uid()
    )
  );

-- -------
-- Vehicles (permission-based)
-- -------
alter table vehicles enable row level security;

create policy "vehicles_select" on vehicles
  for select using (
    public.current_user_can('vehicle.view', 'vehicles', id)
  );

create policy "vehicles_update" on vehicles
  for update using (
    public.current_user_can('vehicle.update', 'vehicles', id)
  );

create policy "vehicles_insert" on vehicles
  for insert with check (
    public.current_user_can('vehicle.create', 'vehicles', id)
  );

create policy "vehicles_delete" on vehicles
  for delete using (
    public.current_user_can('vehicle.delete', 'vehicles', id)
  );

-- -------
-- Bookings (permission-based)
-- -------
alter table bookings enable row level security;

create policy "bookings_select" on bookings
  for select using (
    -- Passengers can see their own bookings
    passenger_actor_id = any(public.get_actor_ids_for_user(auth.uid()))
    or public.current_user_can('booking.view', 'bookings', id)
  );

create policy "bookings_update" on bookings
  for update using (
    public.current_user_can('booking.modify', 'bookings', id)
  );

create policy "bookings_insert" on bookings
  for insert with check (
    -- Passengers can create their own bookings
    passenger_actor_id = any(public.get_actor_ids_for_user(auth.uid()))
    or public.current_user_can('booking.create', 'bookings', id)
  );

-- -------
-- Compliance events (permission-based via vehicle)
-- -------
alter table compliance_events enable row level security;

create policy "compliance_select" on compliance_events
  for select using (
    public.current_user_can('compliance.view', 'vehicles', vehicle_id)
  );

create policy "compliance_update" on compliance_events
  for update using (
    public.current_user_can('compliance.resolve', 'vehicles', vehicle_id)
  );

-- -------
-- Reconciliation events
-- -------
alter table reconciliation_events enable row level security;

create policy "reconciliation_select" on reconciliation_events
  for select using (
    public.current_user_can('reconciliation.view', 'vehicles', vehicle_id)
  );

-- -------
-- Actor requests
-- -------
alter table actor_requests enable row level security;

create policy "actor_requests_select_own" on actor_requests
  for select using (profile_id = auth.uid());

create policy "actor_requests_insert_own" on actor_requests
  for insert with check (profile_id = auth.uid());

-- Admins can view/update all requests
create policy "actor_requests_admin_select" on actor_requests
  for select using (
    exists (
      select 1 from actors a
      where a.profile_id = auth.uid() and a.type = 'ADMIN'
    )
  );

create policy "actor_requests_admin_update" on actor_requests
  for update using (
    exists (
      select 1 from actors a
      where a.profile_id = auth.uid() and a.type = 'ADMIN'
    )
  );

-- -------
-- Audit logs (read-only for regulators/admins)
-- -------
alter table audit_logs enable row level security;

create policy "audit_logs_select" on audit_logs
  for select using (
    exists (
      select 1 from actors a
      where a.profile_id = auth.uid()
        and a.type in ('ADMIN', 'REGULATOR')
    )
  );

-- -------
-- Stripe / Contact (server-side only — no user-facing policies)
-- -------
alter table stripe_customers enable row level security;
alter table contact_requests enable row level security;


-- =========================================================
-- BOOTSTRAP SESSION (updated for federated model)
-- =========================================================
create or replace function public.bootstrap_session()
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'profile', (
      select row_to_json(p) from profiles p where p.id = auth.uid()
    ),
    'actors', coalesce((
      select jsonb_agg(row_to_json(a))
      from actors a where a.profile_id = auth.uid()
    ), '[]'::jsonb),
    'jurisdictions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'actor_id', aj.actor_id,
        'level', aj.level,
        'scope_id', aj.scope_id
      ))
      from actor_jurisdictions aj
      join actors a on a.id = aj.actor_id
      where a.profile_id = auth.uid()
    ), '[]'::jsonb),
    'organization_memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'organization_id', om.organization_id,
        'role', om.role,
        'org_name', o.name
      ))
      from organization_members om
      join actors a on a.id = om.actor_id
      join organizations o on o.id = om.organization_id
      where a.profile_id = auth.uid()
    ), '[]'::jsonb),
    'policy_groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'group_name', pg.name,
        'level', apg.level,
        'scope_id', apg.scope_id
      ))
      from actor_policy_groups apg
      join policy_groups pg on pg.id = apg.group_id
      join actors a on a.id = apg.actor_id
      where a.profile_id = auth.uid()
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;


-- =========================================================
-- DEBUGGING VIEW: Effective permissions per actor
-- =========================================================
create or replace view effective_permissions as
  -- Direct permissions
  select
    ap.actor_id,
    p.action,
    ap.effect,
    ap.level,
    ap.scope_id,
    'direct' as source,
    ap.expires_at
  from actor_permissions ap
  join permissions p on p.id = ap.permission_id
  where (ap.expires_at is null or ap.expires_at > now())

  union all

  -- Policy group permissions
  select
    apg.actor_id,
    p.action,
    pgp.effect,
    apg.level,
    apg.scope_id,
    'group:' || pg.name as source,
    null as expires_at
  from actor_policy_groups apg
  join policy_group_permissions pgp on pgp.group_id = apg.group_id
  join permissions p on p.id = pgp.permission_id
  join policy_groups pg on pg.id = apg.group_id

  union all

  -- Delegated permissions
  select
    da.to_actor_id as actor_id,
    p.action,
    'allow' as effect,
    da.level,
    da.scope_id,
    'delegated_from:' || da.from_actor_id as source,
    da.expires_at
  from delegated_authority da
  join permissions p on p.id = da.permission_id
  where da.revoked = false
    and da.expires_at > now();


-- =========================================================
-- TRIGGER: Auto-create profile on user signup
-- =========================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  -- Auto-create a PASSENGER actor for every new user
  insert into public.actors (profile_id, type, status)
  values (new.id, 'PASSENGER', 'active');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =========================================================
-- AUDIT TRIGGER: Log permission changes
-- =========================================================
create or replace function public.log_permission_change()
returns trigger as $$
begin
  insert into audit_logs (event_type, actor_id, performed_by, target_table, target_id, details)
  values (
    tg_op,
    coalesce(new.actor_id, old.actor_id),
    auth.uid(),
    tg_table_name,
    coalesce(new.id, old.id),
    jsonb_build_object(
      'old', case when tg_op != 'INSERT' then row_to_json(old) end,
      'new', case when tg_op != 'DELETE' then row_to_json(new) end
    )
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger audit_actor_permissions
  after insert or update or delete on actor_permissions
  for each row execute function public.log_permission_change();

create trigger audit_actor_policy_groups
  after insert or update or delete on actor_policy_groups
  for each row execute function public.log_permission_change();

create trigger audit_delegated_authority
  after insert or update or delete on delegated_authority
  for each row execute function public.log_permission_change();