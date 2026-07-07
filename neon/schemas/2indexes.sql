-- =========================================================
-- 02_indexes.sql
-- =========================================================
-- All indexes including covering indexes for Index-Only Scans.
-- Covering indexes use INCLUDE to store extra columns in the
-- index leaf pages so Postgres never touches the table heap.
-- =========================================================


-- ── Identity ───────────────────────────────────────────────
create index idx_actors_profile on actors(profile_id);
create index idx_actors_type on actors(type);

-- identity_accounts:
--   (provider, provider_subject) is covered by the unique constraint index.
--   profile_id index supports "all accounts for a profile" lookups.
create index idx_identity_accounts_profile
  on identity_accounts(profile_id);

-- ── Hierarchy ──────────────────────────────────────────────
create index idx_branches_org on branches(organization_id);
create index idx_departments_branch on departments(branch_id);

-- ── Permissions (covering) ─────────────────────────────────
-- Direct permissions: actor + permission → everything for the check
create index idx_actor_permissions_covering
  on actor_permissions (actor_id, permission_id)
  include (effect, level, scope_id, expires_at);

-- Jurisdiction lookups (used by double-gate join in my_permissions)
create index idx_actor_jurisdictions_covering
  on actor_jurisdictions (actor_id)
  include (level, scope_id);

-- Operator cap index (only rows with max_vehicles set)
create index if not exists idx_actor_jurisdictions_operator
  on actor_jurisdictions(actor_id, level, scope_id)
  where max_vehicles is not null;

-- Permission action lookups (used by every permission check)
create index idx_permissions_action_covering
  on permissions (action)
  include (id, federal_only);

-- Policy group bindings: actor → group + scope
create index idx_actor_policy_groups_covering
  on actor_policy_groups (actor_id)
  include (group_id, level, scope_id);

-- Policy group permissions (used in the view join)
create index idx_policy_group_permissions_covering
  on policy_group_permissions (group_id)
  include (permission_id, effect);

-- Delegated authority: active delegations
-- NOTE: No now() in predicate — that's evaluated at write time, not query time
create index idx_delegated_authority_covering
  on delegated_authority (to_actor_id, revoked)
  include (permission_id, level, scope_id, expires_at);

-- ── Operations (covering for RLS scope resolution) ─────────
-- Vehicle scope: lets can_actor_perform_on_resource resolve scope without heap
create index idx_vehicles_scope
  on vehicles (id)
  include (organization_id, branch_id, department_id);

create index idx_vehicles_org on vehicles(organization_id);
create index idx_vehicles_branch on vehicles(branch_id);

-- Booking scope
create index idx_bookings_scope
  on bookings (id)
  include (organization_id, branch_id, department_id, passenger_actor_id);

create index idx_bookings_org on bookings(organization_id);
create index idx_bookings_vehicle on bookings(vehicle_id);

-- ── Operational ────────────────────────────────────────────
create index idx_stage_assignments_operator on stage_assignments(operator_id);
create index idx_org_members_org on organization_members(organization_id);
create index idx_compliance_vehicle on compliance_events(vehicle_id);
create index idx_invite_tokens_org on invite_tokens(organization_id);

-- Org news
create index if not exists idx_org_news_org on public.org_news(organization_id);
create index if not exists idx_org_news_created on public.org_news(created_at desc);
create index if not exists idx_org_news_category on public.org_news(category);
create index if not exists idx_org_news_published on public.org_news(published) where published = true;

-- Actor verification tokens
create index if not exists idx_avt_token_hash on actor_verification_tokens (token_hash) where used_at is null;

-- M-Pesa indexes
create index if not exists idx_mpesa_customers_user_id
  on public.mpesa_customers(user_id);
create index on mpesa_payouts    (actor_id);
create index on mpesa_payouts    (organization_id);
create index on mpesa_payouts    (status);
create index on mpesa_payouts    (created_at desc);
create index on mpesa_settlements (organization_id);
create index on mpesa_settlements (status);
create index on mpesa_settlements (created_at desc);

-- Geofences
create index if not exists idx_geofences_profile on public.geofences(profile_id);
create index if not exists idx_geofences_org on public.geofences(org_id);
create index if not exists idx_geofences_created on public.geofences(created_at desc);

-- ── Audit & Monitoring ─────────────────────────────────────
create index idx_audit_logs_created on audit_logs(created_at desc);
create index idx_audit_logs_event on audit_logs(event_type, created_at desc);

create index idx_access_denied_created on access_denied_log(created_at desc);
create index idx_access_denied_actor on access_denied_log(actor_id, created_at desc);
create index idx_access_denied_monitoring
  on access_denied_log (denial_reason, created_at desc)
  include (actor_id, action_attempted);

-- Profile indexes
create index if not exists idx_profiles_onboarding_status
  on public.profiles(onboarding_status);

create index if not exists idx_profiles_ballerine_case
  on public.profiles(ballerine_case_id)
  where ballerine_case_id is not null;

create index if not exists idx_profiles_guardian
  on public.profiles(guardian_profile_id)
  where guardian_profile_id is not null;

