-- =========================================================
-- 03_functions.sql
-- =========================================================
-- All functions in dependency order. Every SECURITY DEFINER
-- function has `set search_path = public`.
--
-- Dependency chain:
--   scope_covers_resource (leaf — no deps)
--   get_current_profile_id (leaf — resolves app.current_profile_id session GUC)
--   get_cached_actor_ids (reads actors via get_current_profile_id)
--   get_actor_ids_for_user (fallback — reads actors by profile_id directly)
--   log_access_denied (writes access_denied_log via get_current_profile_id)
--   can_actor_perform (uses my_permissions view + log_access_denied)
--   can_actor_perform_on_resource (wraps can_actor_perform)
--   current_user_can (wraps can_actor_perform_on_resource)
--   current_user_can_in_scope (wraps can_actor_perform)
--   bootstrap_session (reads many tables + my_permissions via get_current_profile_id)
--   get_my_effective_permissions (reads my_permissions)
--   create_profile (updates profiles, ownership check via get_current_profile_id)
--   redeem_invite (writes actors, org_members, jurisdictions, etc.)
--   set_updated_at (trigger helper)
--   log_permission_change (audit trigger)
--   bump_permissions_version (version trigger)
--   enforce_federal_only (validation trigger)
--   enforce_federal_only_in_group (validation trigger)
--   cascade_revoke_delegations (cascade trigger)
--
-- REMOVED (Neon/auth-service migration):
--   is_jwt_version_current, handle_new_user, custom_access_token_hook.
--   Profile creation and Supabase JWT claims are no longer part of this
--   schema; the auth-service (Dgraph-backed) owns signup and session
--   issuance, and sets app.current_profile_id per-transaction.
-- =========================================================


-- ─────────────────────────────────────────────────────────
-- SCOPE GEOMETRY
-- ─────────────────────────────────────────────────────────

create or replace function public.scope_covers_resource(
  check_level text,
  check_scope uuid,
  res_org uuid,
  res_branch uuid,
  res_dept uuid
) returns boolean
language sql
immutable
set search_path = public
as $$
  select case check_level
    when 'federal'    then true
    when 'org'        then check_scope = res_org
    when 'branch'     then check_scope = res_branch
    when 'department' then check_scope = res_dept
    else false
  end;
$$;


-- ─────────────────────────────────────────────────────────
-- CANONICAL PROFILE RESOLUTION
-- ─────────────────────────────────────────────────────────
-- Resolves the caller's canonical domain profile_id from the
-- app.current_profile_id session GUC, set per-transaction by
-- the auth-service (pg.ts's withProfileContext) after it has
-- validated the caller's opaque session token. Returns NULL if
-- the GUC is unset — RLS then denies by default (no identity).
--
-- No auth.uid()/identity_accounts lookup here: the auth-service
-- has already done that resolution before opening the transaction.

create or replace function public.get_current_profile_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select current_setting('app.current_profile_id', true)::uuid
$$;


-- ─────────────────────────────────────────────────────────
-- PROFILES-RLS-RECURSION-SAFE ADMIN/MANAGER CHECKS
-- ─────────────────────────────────────────────────────────
-- Used only by the profiles_select_admin / profiles_select_org_manager /
-- profiles_update_admin policies in 06_rls.sql. A policy on `profiles`
-- cannot call anything that itself reads `profiles` — my_permissions
-- does (via get_current_profile_id() -> profiles), so using it inside
-- a profiles policy is a guaranteed infinite loop (42P17). These two
-- functions are SECURITY DEFINER and read only actors /
-- organization_members — never profiles — so they're safe to call
-- from a profiles policy.
--
-- Depends on the actor-type roles seeded in 07_seed.sql
-- (SUPER_ADMIN, GENERAL_MANAGER, FLEET_MANAGER, OPERATIONS_MANAGER,
-- BRANCH_MANAGER, ORG_CHAIR — ADMIN already existed). Until an actor
-- is actually assigned one of these types, these functions match
-- nobody (fails closed, not open).

create or replace function public.current_user_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from actors a
    where a.profile_id = public.get_current_profile_id()
      and a.type in ('SUPER_ADMIN', 'ADMIN')
      and a.status = 'active'
  );
$$;

create or replace function public.current_user_manages_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from actors caller_actor
    join organization_members caller_om
      on caller_om.actor_id = caller_actor.id
    join organization_members target_om
      on target_om.organization_id = caller_om.organization_id
    join actors target_actor
      on target_actor.id = target_om.actor_id
      and target_actor.profile_id = target_profile_id
    where caller_actor.profile_id = public.get_current_profile_id()
      and caller_actor.status = 'active'
      and caller_actor.type in (
        'GENERAL_MANAGER', 'FLEET_MANAGER', 'OPERATIONS_MANAGER',
        'BRANCH_MANAGER', 'ORG_CHAIR'
      )
  );
$$;


-- ─────────────────────────────────────────────────────────
-- ACTOR ID RESOLUTION
-- ─────────────────────────────────────────────────────────

-- Primary: resolves the caller's active actor IDs from the
-- session-scoped profile. Replaces the old JWT-claim lookup —
-- there is no client JWT under the auth-service token model.
create or replace function public.get_cached_actor_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(a.id), '{}'::uuid[])
  from actors a
  where a.profile_id = public.get_current_profile_id()
    and a.status = 'active';
$$;

-- Fallback: resolves an arbitrary canonical profile_id → actor IDs.
-- Used by call sites that already have a profile_id in hand (e.g.
-- admin tooling looking up another user) rather than the caller's
-- own session. Does not touch identity_accounts — providers are
-- irrelevant once you have the canonical profile_id.
create or replace function public.get_actor_ids_for_user(profile_uuid uuid)
returns uuid[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(array_agg(a.id), '{}'::uuid[])
  from actors a
  where a.profile_id = profile_uuid
    and a.status = 'active';
$$;


-- ─────────────────────────────────────────────────────────
-- FAILED ACCESS LOGGER
-- ─────────────────────────────────────────────────────────

create or replace function public.log_access_denied(
  p_actor_id uuid,
  p_action text,
  p_res_org uuid,
  p_res_branch uuid,
  p_res_dept uuid,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into access_denied_log (
    actor_id, profile_id, action_attempted,
    resource_org, resource_branch, resource_dept,
    denial_reason
  ) values (
    p_actor_id, public.get_current_profile_id(), p_action,
    p_res_org, p_res_branch, p_res_dept,
    p_reason
  );
exception when others then
  -- Never let logging failure block the permission check
  null;
end;
$$;


-- ─────────────────────────────────────────────────────────
-- CORE PERMISSION ENGINE
-- ─────────────────────────────────────────────────────────
-- Accepts raw scope UUIDs. Does NOT look up resources.
-- Used by INSERT policies (where the row doesn't exist yet)
-- and by the resource-lookup wrapper below.

create or replace function public.can_actor_perform(
  actor_uuid uuid,
  action_text text,
  res_org uuid,
  res_branch uuid default null,
  res_dept uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  has_deny boolean;
  has_allow boolean;
begin
  -- 1. Deny takes absolute precedence
  select exists(
    select 1 from public.my_permissions mp
    where mp.actor_id = actor_uuid
      and mp.action = action_text
      and mp.effect = 'deny'
      and public.scope_covers_resource(mp.level, mp.scope_id, res_org, res_branch, res_dept)
  ) into has_deny;

  if has_deny then
    perform public.log_access_denied(
      actor_uuid, action_text, res_org, res_branch, res_dept, 'explicit_deny'
    );
    return false;
  end if;

  -- 2. Check for allow (my_permissions already enforces
  --    JWT version, jurisdiction intersection, and actor filter)
  select exists(
    select 1 from public.my_permissions mp
    where mp.actor_id = actor_uuid
      and mp.action = action_text
      and mp.effect = 'allow'
      and public.scope_covers_resource(mp.level, mp.scope_id, res_org, res_branch, res_dept)
  ) into has_allow;

  if not has_allow then
    perform public.log_access_denied(
      actor_uuid, action_text, res_org, res_branch, res_dept, 'no_allow'
    );
  end if;

  return has_allow;
end;
$$;


-- ─────────────────────────────────────────────────────────
-- RESOURCE LOOKUP WRAPPER (for SELECT/UPDATE/DELETE)
-- ─────────────────────────────────────────────────────────
-- Resolves resource scope from its ID, then delegates to
-- can_actor_perform. Uses FOUND correctly.

create or replace function public.can_actor_perform_on_resource(
  actor_uuid uuid,
  action_text text,
  resource_type text,
  resource_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  res_org uuid;
  res_branch uuid;
  res_dept uuid;
  resource_found boolean;
begin
  if resource_type = 'vehicles' then
    select organization_id, branch_id, department_id
    into res_org, res_branch, res_dept
    from vehicles where id = resource_id;
    resource_found := found;

  elsif resource_type = 'bookings' then
    select organization_id, branch_id, department_id
    into res_org, res_branch, res_dept
    from bookings where id = resource_id;
    resource_found := found;

  elsif resource_type = 'compliance_events' then
    select v.organization_id, v.branch_id, v.department_id
    into res_org, res_branch, res_dept
    from compliance_events ce
    join vehicles v on v.id = ce.vehicle_id
    where ce.id = resource_id;
    resource_found := found;

  elsif resource_type = 'reconciliation_events' then
    select v.organization_id, v.branch_id, v.department_id
    into res_org, res_branch, res_dept
    from reconciliation_events re
    join vehicles v on v.id = re.vehicle_id
    where re.id = resource_id;
    resource_found := found;

  else
    -- Unknown type → silent deny (no schema leak)
    return false;
  end if;

  if not resource_found then
    return false;  -- same response whether ID exists or not
  end if;

  return public.can_actor_perform(actor_uuid, action_text, res_org, res_branch, res_dept);
end;
$$;


-- ─────────────────────────────────────────────────────────
-- CONVENIENCE: current_user_can (SELECT/UPDATE/DELETE RLS)
-- ─────────────────────────────────────────────────────────

create or replace function public.current_user_can(
  action_text text,
  resource_type text,
  resource_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  actor_ids uuid[];
  aid uuid;
begin
  actor_ids := public.get_cached_actor_ids();
  foreach aid in array actor_ids loop
    if public.can_actor_perform_on_resource(aid, action_text, resource_type, resource_id) then
      return true;
    end if;
  end loop;
  return false;
end;
$$;


-- ─────────────────────────────────────────────────────────
-- CONVENIENCE: current_user_can_in_scope (INSERT RLS)
-- ─────────────────────────────────────────────────────────
-- Accepts raw scope from the NEW row — no resource lookup.

create or replace function public.current_user_can_in_scope(
  action_text text,
  scope_org uuid,
  scope_branch uuid default null,
  scope_dept uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  actor_ids uuid[];
  aid uuid;
begin
  actor_ids := public.get_cached_actor_ids();
  foreach aid in array actor_ids loop
    if public.can_actor_perform(aid, action_text, scope_org, scope_branch, scope_dept) then
      return true;
    end if;
  end loop;
  return false;
end;
$$;


-- ─────────────────────────────────────────────────────────
-- BOOTSTRAP SESSION (single RPC for frontend hydration)
-- ─────────────────────────────────────────────────────────
-- Resolves canonical profile once at the top via
-- get_current_profile_id(), then uses it throughout.

create or replace function public.bootstrap_session()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  current_profile_id uuid;
begin
  current_profile_id := public.get_current_profile_id();

  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'company_name', p.company_name,
        'avatar_url', p.avatar_url,
        'website', p.website,
        'unsubscribed', p.unsubscribed,
        'permissions_version', p.permissions_version
      )
      from profiles p where p.id = current_profile_id
    ),
    'actors', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'profile_id', a.profile_id,
        'type', a.type, 'status', a.status,
        'metadata', a.metadata, 'created_at', a.created_at
      ))
      from actors a
      where a.profile_id = current_profile_id and a.status = 'active'
    ), '[]'::jsonb),
    'jurisdictions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'actor_id', aj.actor_id,
        'level', aj.level,
        'scope_id', aj.scope_id
      ))
      from actor_jurisdictions aj
      join actors a on a.id = aj.actor_id
      where a.profile_id = current_profile_id and a.status = 'active'
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
      where a.profile_id = current_profile_id and a.status = 'active'
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
      where a.profile_id = current_profile_id and a.status = 'active'
    ), '[]'::jsonb),
    'permissions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'actor_id', mp.actor_id, 'action', mp.action,
        'effect', mp.effect, 'level', mp.level,
        'scope_id', mp.scope_id, 'source', mp.source
      ))
      from my_permissions mp
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;


-- ─────────────────────────────────────────────────────────
-- EFFECTIVE PERMISSIONS RPC
-- ─────────────────────────────────────────────────────────

create or replace function public.get_my_effective_permissions()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return coalesce(
    (select jsonb_agg(jsonb_build_object(
      'actor_id', mp.actor_id, 'action', mp.action,
      'effect', mp.effect, 'level', mp.level,
      'scope_id', mp.scope_id, 'source', mp.source
    ))
    from my_permissions mp),
    '[]'::jsonb
  );
end;
$$;


-- ─────────────────────────────────────────────────────────
-- CLIENT-FACING PROFILE ENRICHMENT
-- ─────────────────────────────────────────────────────────
-- Authorization check: caller must own the profile being updated.
-- Ownership is confirmed via get_current_profile_id() (the
-- session-scoped identity the auth-service resolved and set for
-- this transaction) — not by comparing a raw execution UUID
-- directly to the profile ID.
--
-- NOTE: profile + PASSENGER-actor bootstrap on signup is now owned
-- by the auth-service (Dgraph-backed), not a Postgres trigger. See
-- 00_extensions_domains.sql & 08_privileges.sql for the identity model
-- function participates in.

create or replace function public.create_profile(
  p_profile_id uuid,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _row public.profiles%rowtype;
begin
  if public.get_current_profile_id() is distinct from p_profile_id then
    raise exception 'permission denied: caller must match profile id';
  end if;

  update public.profiles set
    full_name = coalesce(p_payload->>'full_name', full_name),
    company_name = coalesce(p_payload->>'company_name', company_name),
    avatar_url = coalesce(p_payload->>'avatar_url', avatar_url),
    website = coalesce(p_payload->>'website', website),
    onboarding_status = coalesce(p_payload->>'onboarding_status', onboarding_status),
    kyc_intent = coalesce(p_payload->>'kyc_intent', kyc_intent),
    date_of_birth = coalesce((p_payload->>'date_of_birth')::date, date_of_birth),
    guardian_profile_id = coalesce((p_payload->>'guardian_profile_id')::uuid, guardian_profile_id),
    kyc_status = coalesce(p_payload->>'kyc_status', kyc_status),
    ballerine_case_id = coalesce(p_payload->>'ballerine_case_id', ballerine_case_id),
    phone = coalesce(p_payload->>'phone', phone),
    unsubscribed = coalesce((p_payload->>'unsubscribed')::boolean, unsubscribed),
    starting_locations = coalesce(p_payload->>'starting_locations', starting_locations),
    destinations = coalesce(p_payload->>'destinations', destinations),
    social_media_links = coalesce(p_payload->>'social_media_links', social_media_links),
    emergency_contacts = coalesce(p_payload->>'emergency_contacts', emergency_contacts),
    time_zone = coalesce(p_payload->>'time_zone', time_zone),
    working_hours_start = coalesce((p_payload->>'working_hours_start')::time, working_hours_start),
    working_hours_end = coalesce((p_payload->>'working_hours_end')::time, working_hours_end),
    updated_at = now(),
    highway_corridors = coalesce(
      (select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload->'highway_corridors','[]'::jsonb)) x),
      highway_corridors
    ),
    routes_to_track = coalesce(
      (select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload->'routes_to_track','[]'::jsonb)) x),
      routes_to_track
    ),
    preferred_vehicle_type = coalesce(
      (select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload->'preferred_vehicle_type','[]'::jsonb)) x),
      preferred_vehicle_type
    ),
    languages_spoken = coalesce(
      (select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload->'languages_spoken','[]'::jsonb)) x),
      languages_spoken
    )
  where id = p_profile_id
  returning * into _row;

  return to_jsonb(_row);
exception when others then
  raise warning 'create_profile failed for %: %', p_profile_id, sqlerrm;
  return jsonb_build_object('error', sqlerrm);
end;
$$;

grant execute on function public.create_profile(uuid, jsonb) to app_backend;


-- ─────────────────────────────────────────────────────────
-- INVITE REDEMPTION
-- ─────────────────────────────────────────────────────────
-- All profile FK writes use get_current_profile_id() to get
-- the caller's canonical profile_id from the session GUC.

create or replace function public.redeem_invite(invite_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tok invite_tokens%rowtype;
  new_actor_id uuid;
  default_group_id uuid;
  current_profile_id uuid;
begin
  current_profile_id := public.get_current_profile_id();

  select * into tok from invite_tokens where token = invite_token;

  if not found then
    raise exception 'Invalid or expired invite token';
  end if;
  if tok.used then
    raise exception 'Invalid or expired invite token';
  end if;
  if tok.expires_at < now() then
    raise exception 'Invalid or expired invite token';
  end if;

  -- Duplicate check
  if exists (
    select 1 from actors a
    join organization_members om on om.actor_id = a.id
    where a.profile_id = current_profile_id
      and a.type = tok.actor_type
      and om.organization_id = tok.organization_id
  ) then
    update invite_tokens
    set used = true, used_by = current_profile_id, used_at = now()
    where token = invite_token;
    return jsonb_build_object('status', 'already_exists', 'message', 'Role already assigned');
  end if;

  -- Create actor
  insert into actors (profile_id, type, status, metadata)
  values (current_profile_id, tok.actor_type, 'active',
    jsonb_build_object('invited_by_token', invite_token))
  returning id into new_actor_id;

  -- Org scope
  if tok.organization_id is not null then
    insert into organization_members (actor_id, organization_id, role)
    values (new_actor_id, tok.organization_id, 'member')
    on conflict do nothing;

    insert into actor_jurisdictions (actor_id, level, scope_id)
    values (new_actor_id, 'org', tok.organization_id)
    on conflict do nothing;

    select pg.id into default_group_id
    from policy_groups pg
    where pg.organization_id = tok.organization_id
      and pg.name = 'Default ' || tok.actor_type
    limit 1;

    if default_group_id is not null then
      insert into actor_policy_groups (actor_id, group_id, level, scope_id)
      values (new_actor_id, default_group_id, 'org', tok.organization_id)
      on conflict do nothing;
    end if;
  end if;

  update invite_tokens
  set used = true, used_by = current_profile_id, used_at = now()
  where token = invite_token;

  insert into audit_logs (event_type, actor_id, profile_id, performed_by, details)
  values ('INVITE_REDEEMED', new_actor_id, current_profile_id, current_profile_id,
    jsonb_build_object('invite_token', invite_token,
      'actor_type', tok.actor_type, 'organization_id', tok.organization_id));

  return jsonb_build_object('status', 'success', 'actor_id', new_actor_id,
    'actor_type', tok.actor_type, 'organization_id', tok.organization_id);
end;
$$;


-- ─────────────────────────────────────────────────────────
-- TRIGGER FUNCTIONS
-- ─────────────────────────────────────────────────────────

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- org_news updated_at helper
create or replace function public.handle_org_news_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Audit logger
create or replace function public.log_permission_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_logs (event_type, actor_id, performed_by, target_table, target_id, details)
  values (
    tg_op,
    coalesce(new.actor_id, old.actor_id),
    public.get_current_profile_id(),
    tg_table_name,
    coalesce(new.id, old.id),
    jsonb_build_object(
      'old', case when tg_op != 'INSERT' then row_to_json(old) end,
      'new', case when tg_op != 'DELETE' then row_to_json(new) end
    )
  );
  return coalesce(new, old);
exception when others then
  raise warning 'Audit logging failed for % on %: %', tg_op, tg_table_name, sqlerrm;
  return coalesce(new, old);
end;
$$;

-- Version bump on permission changes
create or replace function public.bump_permissions_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile_id uuid;
begin
  select a.profile_id into target_profile_id
  from actors a
  where a.id = coalesce(
    case tg_table_name
      when 'actor_permissions'   then coalesce(new.actor_id, old.actor_id)
      when 'actor_policy_groups' then coalesce(new.actor_id, old.actor_id)
      when 'actor_jurisdictions' then coalesce(new.actor_id, old.actor_id)
      when 'delegated_authority' then coalesce(
        (row_to_json(new) ->> 'to_actor_id')::uuid,
        (row_to_json(old) ->> 'to_actor_id')::uuid
      )
      else null
    end
  );

  if target_profile_id is not null then
    update profiles
    set permissions_version = permissions_version + 1
    where id = target_profile_id;
  end if;

  return coalesce(new, old);
end;
$$;

-- federal_only enforcement on direct grants
create or replace function public.enforce_federal_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_federal_only boolean;
begin
  select p.federal_only into is_federal_only
  from permissions p where p.id = new.permission_id;

  if is_federal_only and new.level != 'federal' then
    raise exception 'Permission is federal-only and cannot be granted at % level', new.level;
  end if;
  return new;
end;
$$;

-- federal_only enforcement on policy groups
create or replace function public.enforce_federal_only_in_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_federal_only boolean;
  group_org uuid;
begin
  select p.federal_only into is_federal_only
  from permissions p where p.id = new.permission_id;

  if is_federal_only then
    select pg.organization_id into group_org
    from policy_groups pg where pg.id = new.group_id;

    if group_org is not null then
      raise exception 'Federal-only permission cannot be added to org-scoped policy group';
    end if;
  end if;
  return new;
end;
$$;

-- Cascading delegation revocation
create or replace function public.cascade_revoke_delegations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update delegated_authority
    set revoked = true
    where from_actor_id = old.actor_id
      and permission_id = old.permission_id
      and revoked = false;
  end if;

  if tg_op = 'UPDATE' and new.effect = 'deny' and old.effect = 'allow' then
    update delegated_authority
    set revoked = true
    where from_actor_id = new.actor_id
      and permission_id = new.permission_id
      and revoked = false;
  end if;

  return coalesce(new, old);
end;
$$;
