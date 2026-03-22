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