-- Migration: Create org_news table for organization news & updates
-- Run this in your Supabase SQL editor or as a migration

create table if not exists public.org_news (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid references public.profiles(id),
  title text not null,
  body text not null,
  category text not null default 'general',
    -- categories: general, route_change, fare_update, service_alert, compliance, fleet, announcement
  severity text default 'info',
    -- severity: info, notice, warning, critical
  pinned boolean default false,
  published boolean default true,
  route_ids uuid[] default '{}',
    -- optional: link news to specific stage_assignments
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_org_news_org on public.org_news(organization_id);
create index if not exists idx_org_news_created on public.org_news(created_at desc);
create index if not exists idx_org_news_category on public.org_news(category);
create index if not exists idx_org_news_published on public.org_news(published) where published = true;

-- RLS
alter table public.org_news enable row level security;

-- Anyone authenticated can read published news
create policy "Published news is readable by authenticated users"
  on public.org_news for select
  using (published = true);

-- Org admins can manage news for their org
create policy "Org admins can insert news"
  on public.org_news for insert
  with check (
    exists (
      select 1 from public.organization_members om
      join public.actors a on a.id = om.actor_id
      where om.organization_id = org_news.organization_id
        and a.profile_id = auth.uid()
        and om.role = 'admin'
    )
  );

create policy "Org admins can update their org news"
  on public.org_news for update
  using (
    exists (
      select 1 from public.organization_members om
      join public.actors a on a.id = om.actor_id
      where om.organization_id = org_news.organization_id
        and a.profile_id = auth.uid()
        and om.role = 'admin'
    )
  );

create policy "Org admins can delete their org news"
  on public.org_news for delete
  using (
    exists (
      select 1 from public.organization_members om
      join public.actors a on a.id = om.actor_id
      where om.organization_id = org_news.organization_id
        and a.profile_id = auth.uid()
        and om.role = 'admin'
    )
  );

-- Auto-update updated_at
create or replace function public.handle_org_news_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_org_news_update
  before update on public.org_news
  for each row
  execute function public.handle_org_news_updated_at();



  create or replace function public.bump_permissions_version()
returns trigger language plpgsql security definer as $$
declare
  target_profile_id uuid;
  target_actor_id   uuid;
begin
  target_actor_id := coalesce(
    case tg_table_name
      when 'actor_permissions'   then coalesce(new.actor_id, old.actor_id)
      when 'actor_policy_groups' then coalesce(new.actor_id, old.actor_id)
      when 'actor_jurisdictions' then coalesce(new.actor_id, old.actor_id)
      -- use row_to_json to defer field lookup to runtime —
      -- direct new.to_actor_id reference fails at parse time on other tables
      when 'delegated_authority' then coalesce(
        (row_to_json(new) ->> 'to_actor_id')::uuid,
        (row_to_json(old) ->> 'to_actor_id')::uuid
      )
      else null
    end
  );

  select a.profile_id into target_profile_id
  from actors a
  where a.id = target_actor_id;

  if target_profile_id is not null then
    update profiles
    set permissions_version = permissions_version + 1
    where id = target_profile_id;
  end if;

  return coalesce(new, old);
end;
$$;


UPDATE actor_permissions SET action = replace(action, ':', '.');
UPDATE policy_group_permissions SET action = replace(action, ':', '.');


-- migrations/20240001_actor_verification_tokens.sql
--
-- Stores OTP codes (SMS path) and email magic-link tokens.
-- Supabase handles the email delivery; we handle SMS via Africa's Talking.
--
-- LIFECYCLE:
--   1. Admin clicks "Send Verification" (SMS or Email)
--   2. Row inserted here with method, token/otp, expiry
--   3. User enters OTP or clicks link → row marked used_at
--   4. actor.status → 'active'

create table if not exists actor_verification_tokens (
  id         uuid        primary key default gen_random_uuid(),
  actor_id   uuid        not null references actors(id) on delete cascade,
  profile_id uuid        not null references profiles(id) on delete cascade,

  -- 'email' | 'sms'
  method     text        not null check (method in ('email', 'sms')),

  -- For SMS path: 6-digit code stored as bcrypt hash
  -- For email path: opaque random token (UUID) used in the link
  token_hash text        not null,

  -- Destination — phone number or email address
  destination text       not null,

  expires_at  timestamptz not null default (now() + interval '15 minutes'),
  used_at     timestamptz,
  created_at  timestamptz not null default now(),

  -- Only one active (unused, unexpired) token per actor at a time
  -- Old ones are invalidated by the send_verification action
  constraint one_active_token_per_actor
    unique (actor_id, method)
);

-- Index for token lookup on the verify page
create index if not exists idx_avt_token_hash
  on actor_verification_tokens (token_hash)
  where used_at is null;

-- RLS: only service role can touch this table (admin uses service role)
alter table actor_verification_tokens enable row level security;

create policy "Service role only"
  on actor_verification_tokens
  for all
  using (auth.role() = 'service_role');


-- supabase/migrations/YYYYMMDDHHMMSS_add_phone_to_profiles.sql
--
-- Adds a phone column to profiles.
-- Run via: supabase db push  (or paste into the SQL editor)

alter table profiles
  add column if not exists phone text;




  -- supabase/migrations/YYYYMMDDHHMMSS_mpesa_payout_tables.sql
--
-- M-Pesa B2C payout and B2B settlement tracking tables.
-- These record outgoing payments initiated via Daraja API.
-- Status is updated by the b2c-result and b2b-result webhook callbacks.

-- ── M-Pesa B2C payouts (tips to drivers / conductors) ─────────────────────────
create table mpesa_payouts (
  id                  uuid primary key default gen_random_uuid(),

  -- Daraja response identifiers
  conversation_id     text not null unique,    -- ConversationID from Daraja
  originator_id       text,                    -- OriginatorConversationID

  -- Who is being paid
  actor_id            uuid references actors(id) on delete set null,
  phone               text not null,           -- +254 format
  amount              numeric not null check (amount > 0),  -- KES

  -- Context
  role                text not null,           -- DRIVER | CONDUCTOR
  trip_id             uuid,                    -- optional — links to a trip/booking
  organization_id     uuid references organizations(id) on delete set null,
  remarks             text,

  -- Status lifecycle: processing → completed | failed
  status              text not null default 'processing'
                        check (status in ('processing', 'completed', 'failed')),

  -- Daraja result callback fields (populated by b2c-result webhook)
  result_code         integer,
  result_description  text,
  transaction_id      text,                    -- M-Pesa transaction code e.g. MPESA4G8K2L
  completed_at        timestamptz,

  created_at          timestamptz default now()
);

-- ── M-Pesa B2B settlements (SACCO → paybill/till revenue share) ───────────────
create table mpesa_settlements (
  id                  uuid primary key default gen_random_uuid(),

  conversation_id     text not null unique,
  originator_id       text,

  -- Destination
  shortcode           text not null,           -- Recipient paybill or till number
  amount              numeric not null check (amount > 0),  -- KES
  reference           text,                    -- e.g. invoice or batch reference

  -- Context
  organization_id     uuid references organizations(id) on delete set null,
  initiated_by        uuid references actors(id) on delete set null,  -- who triggered it
  remarks             text,

  status              text not null default 'processing'
                        check (status in ('processing', 'completed', 'failed')),

  result_code         integer,
  result_description  text,
  transaction_id      text,
  completed_at        timestamptz,

  created_at          timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index on mpesa_payouts    (actor_id);
create index on mpesa_payouts    (organization_id);
create index on mpesa_payouts    (status);
create index on mpesa_payouts    (created_at desc);
create index on mpesa_settlements (organization_id);
create index on mpesa_settlements (status);
create index on mpesa_settlements (created_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table mpesa_payouts    enable row level security;
alter table mpesa_settlements enable row level security;

-- Only platform admins and the org's members can view payouts for their org.
-- Insertions happen only via service role (server-side API routes).
create policy "org members can view their payouts"
  on mpesa_payouts for select
  using (
    organization_id in (
      select organization_id from organization_members
      where actor_id in (
        select id from actors where profile_id = auth.uid()
      )
    )
  );

create policy "org members can view their settlements"
  on mpesa_settlements for select
  using (
    organization_id in (
      select organization_id from organization_members
      where actor_id in (
        select id from actors where profile_id = auth.uid()
      )
    )
  );


  alter table geofences
  add column if not exists scope      text not null default 'org'
                                        check (scope in ('personal', 'org')),
  add column if not exists profile_id uuid references profiles(id) on delete cascade,
  add column if not exists org_id     uuid references organizations(id) on delete cascade,
  add column if not exists vehicle_id uuid references vehicles(id) on delete set null;

-- Personal geofences must have a vehicle; org geofences must have an org
alter table geofences
  add constraint geofence_personal_needs_vehicle
    check (scope != 'personal' or vehicle_id is not null),
  add constraint geofence_org_needs_org
    check (scope != 'org' or org_id is not null);



    -- migrations/20260327000001_profiles_onboarding_mpesa.sql
-- =========================================================
-- Adds explicit onboarding lifecycle tracking to profiles
-- and replaces stripe_customers with mpesa_customers.
--
-- onboarding_status drives the guest trap in hooks.server.ts:
--   GUEST        → registered, no intent chosen
--   AWAITING_KYC → intent chosen, Ballerine flow not yet complete
--   ACTIVE       → KYC cleared, at least one active actor exists
--
-- kyc_intent holds the chosen onboarding path so the hook can
-- redirect back to the correct /onboarding/[intent] route.
-- =========================================================

-- ── 1. Onboarding columns on profiles ─────────────────────────────────────

alter table public.profiles
  add column if not exists onboarding_status text
    not null default 'GUEST'
    check (onboarding_status in ('GUEST', 'AWAITING_KYC', 'ACTIVE')),

  add column if not exists kyc_intent text
    check (kyc_intent in ('passenger', 'crew', 'operator', 'org_staff'));

comment on column public.profiles.onboarding_status is
  'Lifecycle state: GUEST (no intent) → AWAITING_KYC (Ballerine started) → ACTIVE (cleared)';

comment on column public.profiles.kyc_intent is
  'Chosen onboarding path — used by hooks.server.ts to redirect to /onboarding/[intent]';

-- Backfill existing profiles:
--   Any profile with at least one active actor → ACTIVE
--   Everyone else stays GUEST
update public.profiles p
set onboarding_status = 'ACTIVE'
where exists (
  select 1 from public.actors a
  where a.profile_id = p.id
    and a.status = 'active'
);

-- ── 2. M-Pesa customers table (replaces stripe_customers) ─────────────────

create table if not exists public.mpesa_customers (
  user_id            text        primary key references public.profiles(id) on delete cascade,
  phone_number       text,                        -- E.164 format e.g. +254712345678
  mpesa_customer_id  text,                        -- Safaricom customer reference if available
  subscription_code  text,                        -- Active subscription/standing order code
  subscription_status text
    check (subscription_status in ('active', 'inactive', 'pending', 'cancelled')),
  updated_at         timestamptz default now()
);

comment on table public.mpesa_customers is
  'M-Pesa billing records — replaces stripe_customers. hasPaidPlan = subscription_status = active';

-- ── 3. Index for hooks.server.ts lookup ───────────────────────────────────

create index if not exists idx_mpesa_customers_user_id
  on public.mpesa_customers(user_id);

create index if not exists idx_profiles_onboarding_status
  on public.profiles(onboarding_status);


  -- migrations/20260327000002_operator_vehicle_cap.sql
-- =========================================================
-- Adds max_vehicles cap to actor_jurisdictions.
--
-- When an ORG_CHAIR approves an OPERATOR actor_request,
-- they set max_vehicles on the jurisdiction row to cap
-- how many fleet vehicles that operator may manage in their org.
--
-- operator.context.ts reads this column to compute:
--   isAtVehicleLimit    → assignedVehicleIds.length >= max_vehicles
--   vehicleUtilisation  → assignedVehicleIds.length / max_vehicles
-- =========================================================

alter table public.actor_jurisdictions
  add column if not exists max_vehicles integer
    check (max_vehicles > 0),
  add column if not exists metadata jsonb;

comment on column public.actor_jurisdictions.max_vehicles is
  'OPERATOR only — maximum fleet vehicles this actor may manage in this org scope. '
  'Set by ORG_CHAIR at approval time. Null for non-operator jurisdictions.';

comment on column public.actor_jurisdictions.metadata is
  'Arbitrary JSON for future jurisdiction constraints. '
  'Currently unused — max_vehicles is a typed column, not stored here.';

-- Index for operator context lookups — filters by actor_id + level + scope_id
create index if not exists idx_actor_jurisdictions_operator
  on public.actor_jurisdictions(actor_id, level, scope_id)
  where max_vehicles is not null;



  -- migrations/20260327000003_passenger_minor_mpesa_go.sql
-- =========================================================
-- Adds minor passenger support and M-PESA GO fields.
--
-- Covers:
--   1. date_of_birth + guardian linkage on profiles
--   2. kyc_document_status — tracks the 30-day document
--      submission window Safaricom requires for M-PESA GO
--   3. mpesa_customers extended with minor-specific fields:
--        is_minor_account
--        guardian_phone
--        daily_limit
--        per_transaction_limit
--        send_money_enabled
--        lipa_na_mpesa_enabled
--        documents_submitted
--        documents_due_by
-- =========================================================

-- ── 1. Profiles — minor + guardian fields ─────────────────────────────────

alter table public.profiles
  add column if not exists date_of_birth      date,
  add column if not exists guardian_profile_id uuid
    references public.profiles(id) on delete set null;

comment on column public.profiles.date_of_birth is
  'Used to derive isMinor (age < 18). Required for M-PESA GO onboarding.';

comment on column public.profiles.guardian_profile_id is
  'For minors: the parent/guardian profile that controls this account. '
  'Null for adult passengers.';

-- ── 2. M-PESA GO columns on mpesa_customers ───────────────────────────────

alter table public.mpesa_customers
  add column if not exists is_minor_account        boolean   default false,
  add column if not exists guardian_phone          text,
  add column if not exists daily_limit             numeric,
  add column if not exists per_transaction_limit   numeric,
  add column if not exists send_money_enabled      boolean   default true,
  add column if not exists lipa_na_mpesa_enabled   boolean   default true,
  add column if not exists documents_submitted     boolean   default false,
  add column if not exists documents_due_by        timestamptz;

comment on column public.mpesa_customers.is_minor_account is
  'True for M-PESA GO accounts (child aged 8–17).';

comment on column public.mpesa_customers.guardian_phone is
  'E.164 phone of the parent/guardian linked to this M-PESA GO account.';

comment on column public.mpesa_customers.daily_limit is
  'Parent-set daily transaction cap in KES. Null = Safaricom default.';

comment on column public.mpesa_customers.per_transaction_limit is
  'Parent-set per-transaction cap in KES. Null = Safaricom default.';

comment on column public.mpesa_customers.send_money_enabled is
  'Parent toggle — whether child can send money to other M-PESA users.';

comment on column public.mpesa_customers.lipa_na_mpesa_enabled is
  'Parent toggle — whether child can pay for goods via Lipa na M-PESA.';

comment on column public.mpesa_customers.documents_submitted is
  'True once birth certificate or passport has been uploaded. '
  'M-PESA GO account cannot transact until this is done (30-day window).';

comment on column public.mpesa_customers.documents_due_by is
  'Safaricom compliance deadline — documents must be submitted by this date. '
  'Null for adult accounts.';

-- ── 3. Indexes ─────────────────────────────────────────────────────────────

create index if not exists idx_profiles_guardian
  on public.profiles(guardian_profile_id)
  where guardian_profile_id is not null;

create index if not exists idx_mpesa_minor_accounts
  on public.mpesa_customers(user_id)
  where is_minor_account = true;



-- migrations/20260327000004_profiles_kyc_ballerine.sql
-- =========================================================
-- Adds Ballerine KYC tracking columns to profiles.
--
-- kyc_status tracks the Ballerine case lifecycle:
--   pending    → case submitted, awaiting review
--   approved   → KYC passed, actor will be created by webhook
--   rejected   → KYC failed, user can retry
--   expired    → case timed out, user must restart
--
-- ballerine_case_id is the external case reference returned by
-- Ballerine SDK on submission. Used by the webhook to match the
-- incoming event to the correct profile.
-- =========================================================

alter table public.profiles
  add column if not exists kyc_status         text
    check (kyc_status in ('pending', 'approved', 'rejected', 'expired')),
  add column if not exists ballerine_case_id  text unique;

comment on column public.profiles.kyc_status is
  'Ballerine KYC case status. Null until KYC is submitted.';

comment on column public.profiles.ballerine_case_id is
  'External Ballerine case ID. Unique — used by webhook to match profile.';

create index if not exists idx_profiles_ballerine_case
  on public.profiles(ballerine_case_id)
  where ballerine_case_id is not null;

create index if not exists idx_profiles_kyc_status
  on public.profiles(kyc_status)
  where kyc_status is not null;


-- migrations/20260327000005_hyperledger_enrollment_queue.sql
-- =========================================================
-- Tracks Hyperledger Fabric enrollment attempts per actor.
--
-- Flow:
--   Ballerine webhook → insert row (status: pending)
--   Queue processor   → attempts enrollment → updates status
--   On failure        → increments attempts, sets next_retry_at
--   On success        → sets status: success, enrolled_at
--   Max 5 attempts    → status: exhausted (admin must re-trigger)
--
-- Also tracks revocation events so actor suspension in Supabase
-- can automatically revoke the Fabric identity.
-- =========================================================

create type hyperledger_event_type as enum (
  'enroll_crew_member',
  'enroll_operator',
  'enroll_fleet_owner',
  'register_organisation',
  'revoke_identity'
);

create type hyperledger_queue_status as enum (
  'pending',
  'processing',
  'success',
  'failed',
  'retrying',
  'exhausted'   -- max attempts reached, needs manual admin intervention
);

create table public.hyperledger_enrollment_queue (
  id              uuid        primary key default gen_random_uuid(),
  actor_id        uuid        not null references public.actors(id) on delete cascade,
  profile_id      uuid        not null references public.profiles(id) on delete cascade,
  intent          text        not null,
  event_name      hyperledger_event_type not null,
  status          hyperledger_queue_status not null default 'pending',
  attempts        integer     not null default 0,
  max_attempts    integer     not null default 5,
  last_error      text,
  fabric_user_id  text,       -- the enrolled identity ID in Fabric CA / Vault
  msp_id          text,       -- MSP ID assigned on enrollment
  enrolled_at     timestamptz,
  next_retry_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.hyperledger_enrollment_queue is
  'Tracks Fabric CA enrollment attempts triggered by Ballerine KYC approvals. '
  'Processed by /api/jobs/process-hyperledger-queue (cron every 2 min).';

-- Indexes for queue processor queries
create index idx_hlf_queue_status_retry
  on public.hyperledger_enrollment_queue(status, next_retry_at)
  where status in ('pending', 'retrying');

create index idx_hlf_queue_actor
  on public.hyperledger_enrollment_queue(actor_id);

create index idx_hlf_queue_profile
  on public.hyperledger_enrollment_queue(profile_id);

-- Auto-update updated_at
create or replace function update_hlf_queue_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger hlf_queue_updated_at
  before update on public.hyperledger_enrollment_queue
  for each row execute function update_hlf_queue_updated_at();