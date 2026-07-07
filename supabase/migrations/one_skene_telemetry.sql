-- Skene Growth: allowlisted triggers insert into event_log (Shadow Mirror)
-- Generated at 2026-03-30T16:34:14.109145
-- Depends on: 20260201000000_skene_growth_schema.sql (run skene init first)

-- Trigger functions
CREATE OR REPLACE FUNCTION skene_growth_fn_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, skene_growth
AS $$
BEGIN

BEGIN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NEW."id"::uuid, 'trip_events.insert', jsonb_build_object('id', NEW."id", 'vehicle_id', NEW."vehicle_id", 'operator_id', NEW."operator_id", 'latitude', NEW."latitude", 'longitude', NEW."longitude", 'accuracy', NEW."accuracy", 'accuracy_flag', NEW."accuracy_flag", 'route_corridor', NEW."route_corridor", 'created_at', NEW."created_at"));
EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NULL, 'trip_events.insert', jsonb_build_object('id', NEW."id", 'vehicle_id', NEW."vehicle_id", 'operator_id', NEW."operator_id", 'latitude', NEW."latitude", 'longitude', NEW."longitude", 'accuracy', NEW."accuracy", 'accuracy_flag', NEW."accuracy_flag", 'route_corridor', NEW."route_corridor", 'created_at', NEW."created_at"));
END;
RETURN NULL;

$$;

-- Triggers

DROP TRIGGER IF EXISTS skene_growth_trg_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel ON public.trip_events;
CREATE TRIGGER skene_growth_trg_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel
  AFTER INSERT ON public.trip_events
  FOR EACH ROW
  EXECUTE FUNCTION skene_growth_fn_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel();-- Skene Growth: allowlisted triggers insert into event_log (Shadow Mirror)
-- Generated at 2026-03-30T16:36:51.494588
-- Depends on: 20260201000000_skene_growth_schema.sql (run skene init first)

-- Trigger functions
CREATE OR REPLACE FUNCTION skene_growth_fn_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, skene_growth
AS $$
BEGIN

BEGIN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NEW."id"::uuid, 'trip_events.insert', jsonb_build_object('id', NEW."id", 'vehicle_id', NEW."vehicle_id", 'operator_id', NEW."operator_id", 'latitude', NEW."latitude", 'longitude', NEW."longitude", 'accuracy', NEW."accuracy", 'accuracy_flag', NEW."accuracy_flag", 'route_corridor', NEW."route_corridor", 'created_at', NEW."created_at"));
EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NULL, 'trip_events.insert', jsonb_build_object('id', NEW."id", 'vehicle_id', NEW."vehicle_id", 'operator_id', NEW."operator_id", 'latitude', NEW."latitude", 'longitude', NEW."longitude", 'accuracy', NEW."accuracy", 'accuracy_flag', NEW."accuracy_flag", 'route_corridor', NEW."route_corridor", 'created_at', NEW."created_at"));
END;
RETURN NULL;

$$;

-- Triggers

DROP TRIGGER IF EXISTS skene_growth_trg_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel ON public.trip_events;
CREATE TRIGGER skene_growth_trg_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel
  AFTER INSERT ON public.trip_events
  FOR EACH ROW
  EXECUTE FUNCTION skene_growth_fn_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel();-- Skene Growth: allowlisted triggers insert into event_log (Shadow Mirror)
-- Generated at 2026-03-31T16:12:51.286506
-- Depends on: 20260201000000_skene_growth_schema.sql (run skene init first)

-- Trigger functions
CREATE OR REPLACE FUNCTION skene_growth_fn_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, skene_growth
AS $$
BEGIN

BEGIN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NEW."id"::uuid, 'trip_events.insert', jsonb_build_object('id', NEW."id", 'vehicle_id', NEW."vehicle_id", 'operator_id', NEW."operator_id", 'latitude', NEW."latitude", 'longitude', NEW."longitude", 'accuracy', NEW."accuracy", 'accuracy_flag', NEW."accuracy_flag", 'route_corridor', NEW."route_corridor", 'created_at', NEW."created_at"));
EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NULL, 'trip_events.insert', jsonb_build_object('id', NEW."id", 'vehicle_id', NEW."vehicle_id", 'operator_id', NEW."operator_id", 'latitude', NEW."latitude", 'longitude', NEW."longitude", 'accuracy', NEW."accuracy", 'accuracy_flag', NEW."accuracy_flag", 'route_corridor', NEW."route_corridor", 'created_at', NEW."created_at"));
END;
RETURN NULL;

$$;

-- Triggers

DROP TRIGGER IF EXISTS skene_growth_trg_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel ON public.trip_events;
CREATE TRIGGER skene_growth_trg_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel
  AFTER INSERT ON public.trip_events
  FOR EACH ROW
  EXECUTE FUNCTION skene_growth_fn_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel();-- Skene Growth: allowlisted triggers insert into event_log (Shadow Mirror)
-- Generated at 2026-03-31T18:29:37.683436
-- Depends on: 20260201000000_skene_growth_schema.sql (run skene init first)

-- Trigger functions
CREATE OR REPLACE FUNCTION skene_growth_fn_per_event_escrow_records_UPDATE_compliance_ledger_gate_monetisation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, skene_growth
AS $$
BEGIN

BEGIN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NEW."id"::uuid, 'per_event_escrow_records.update', jsonb_build_object('id', NEW."id", 'org_id', NEW."org_id", 'booking_id', NEW."booking_id", 'agreed_fare', NEW."agreed_fare", 'escrow_fee_kes', NEW."escrow_fee_kes", 'completed_at', NEW."completed_at", 'mpesa_receipt_number', NEW."mpesa_receipt_number"));
EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NULL, 'per_event_escrow_records.update', jsonb_build_object('id', NEW."id", 'org_id', NEW."org_id", 'booking_id', NEW."booking_id", 'agreed_fare', NEW."agreed_fare", 'escrow_fee_kes', NEW."escrow_fee_kes", 'completed_at', NEW."completed_at", 'mpesa_receipt_number', NEW."mpesa_receipt_number"));
END;
RETURN NULL;

$$;

CREATE OR REPLACE FUNCTION skene_growth_fn_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, skene_growth
AS $$
BEGIN

BEGIN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NEW."id"::uuid, 'trip_events.insert', jsonb_build_object('id', NEW."id", 'vehicle_id', NEW."vehicle_id", 'operator_id', NEW."operator_id", 'latitude', NEW."latitude", 'longitude', NEW."longitude", 'accuracy', NEW."accuracy", 'accuracy_flag', NEW."accuracy_flag", 'route_corridor', NEW."route_corridor", 'created_at', NEW."created_at"));
EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
  INSERT INTO skene_growth.event_log (entity_id, event_type, metadata)
  VALUES (NULL, 'trip_events.insert', jsonb_build_object('id', NEW."id", 'vehicle_id', NEW."vehicle_id", 'operator_id', NEW."operator_id", 'latitude', NEW."latitude", 'longitude', NEW."longitude", 'accuracy', NEW."accuracy", 'accuracy_flag', NEW."accuracy_flag", 'route_corridor', NEW."route_corridor", 'created_at', NEW."created_at"));
END;
RETURN NULL;

$$;

-- Triggers

DROP TRIGGER IF EXISTS skene_growth_trg_per_event_escrow_records_UPDATE_compliance_ledger_gate_monetisation ON public.per_event_escrow_records;
CREATE TRIGGER skene_growth_trg_per_event_escrow_records_UPDATE_compliance_ledger_gate_monetisation
  AFTER UPDATE ON public.per_event_escrow_records
  FOR EACH ROW
  EXECUTE FUNCTION skene_growth_fn_per_event_escrow_records_UPDATE_compliance_ledger_gate_monetisation();


DROP TRIGGER IF EXISTS skene_growth_trg_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel ON public.trip_events;
CREATE TRIGGER skene_growth_trg_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel
  AFTER INSERT ON public.trip_events
  FOR EACH ROW
  EXECUTE FUNCTION skene_growth_fn_trip_events_INSERT_gps_broadcast_ledger_depth_flywheel();-- Skene Growth: event_log, failed_events, enrichment_map
-- 1. Schema tables
-- 2. enrich_event (BEFORE INSERT)
-- 3. pg_net + notify_event_log (AFTER INSERT)

CREATE SCHEMA IF NOT EXISTS skene_growth;

CREATE TABLE IF NOT EXISTS skene_growth.event_log (
  id bigserial PRIMARY KEY,
  org_id uuid,
  entity_id uuid,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  occurred_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz,
  attempts int DEFAULT 0 NOT NULL,
  last_error text
);

CREATE TABLE IF NOT EXISTS skene_growth.failed_events (
  id bigserial PRIMARY KEY,
  event_log_id bigint NOT NULL,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}',
  failure_reason text,
  moved_at timestamptz DEFAULT now() NOT NULL
);

DROP TABLE IF EXISTS skene_growth.enrichment_map;
CREATE TABLE skene_growth.enrichment_map (
  trigger_event text NOT NULL,
  metadata_key  text NOT NULL,
  enrich_sql    text,
  strip_after   boolean DEFAULT false,
  PRIMARY KEY (trigger_event, metadata_key)
);

CREATE OR REPLACE FUNCTION skene_growth.enrich_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, skene_growth
AS $$
DECLARE
  rule        RECORD;
  _result     jsonb;
  _strip_keys text[] := ARRAY[]::text[];
BEGIN
  FOR rule IN
    SELECT metadata_key, enrich_sql, strip_after
    FROM skene_growth.enrichment_map
    WHERE trigger_event = NEW.event_type
      AND NEW.metadata ? metadata_key
  LOOP
    BEGIN
      IF rule.enrich_sql IS NOT NULL THEN
        EXECUTE rule.enrich_sql INTO _result USING (NEW.metadata->>rule.metadata_key);
        IF _result IS NOT NULL THEN
          NEW.metadata = NEW.metadata || _result;
        END IF;
      END IF;
      IF rule.strip_after THEN
        _strip_keys := _strip_keys || rule.metadata_key;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
  IF array_length(_strip_keys, 1) > 0 THEN
    NEW.metadata = NEW.metadata - _strip_keys;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS skene_growth_enrich_event ON skene_growth.event_log;
CREATE TRIGGER skene_growth_enrich_event
  BEFORE INSERT ON skene_growth.event_log
  FOR EACH ROW
  EXECUTE FUNCTION skene_growth.enrich_event();

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION skene_growth.notify_event_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, skene_growth, net
AS $$
DECLARE
  payload jsonb;
  ingest_url text := 'https://YOUR_UPSTREAM_INGEST_URL/api/v1/cloud/ingest/db-trigger';
  proxy_secret text := 'YOUR_PROXY_SECRET';
BEGIN
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'event_log',
    'schema', 'skene_growth',
    'record', to_jsonb(NEW),
    'old_record', null
  );
  PERFORM net.http_post(
    url := ingest_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-skene-secret', proxy_secret
    ),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS skene_growth_webhook_event_log ON skene_growth.event_log;
CREATE TRIGGER skene_growth_webhook_event_log
  AFTER INSERT ON skene_growth.event_log
  FOR EACH ROW
  EXECUTE FUNCTION skene_growth.notify_event_log();-- Migration: add per_event_escrow_records table
CREATE TABLE IF NOT EXISTS per_event_escrow_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  org_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  agreed_fare_kes integer NOT NULL,
  platform_fee_kes integer NOT NULL,
  operator_net_kes integer NOT NULL,
  mpesa_checkout_request_id text,
  mpesa_receipt_number text,
  status text NOT NULL DEFAULT 'PENDING',
  failure_reason text,
  ledger_tx_id text,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_per_event_escrow_booking ON per_event_escrow_records (booking_id);
CREATE INDEX IF NOT EXISTS idx_per_event_escrow_org ON per_event_escrow_records (org_id);
-- Safe, idempotent data updates derived from orgnews.sql
-- Guards ensure statements run only if relevant columns exist.

DO $$
BEGIN
  -- Normalize legacy action separators (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'actor_permissions' AND column_name = 'action'
  ) THEN
    EXECUTE 'UPDATE public.actor_permissions SET action = replace(action, '':'' , ''.'')';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'policy_group_permissions' AND column_name = 'action'
  ) THEN
    EXECUTE 'UPDATE public.policy_group_permissions SET action = replace(action, '':'' , ''.'')';
  END IF;

  -- Backfill onboarding_status for existing profiles that already have active actors
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_status'
  ) THEN
    UPDATE public.profiles p
    SET onboarding_status = 'ACTIVE'
    WHERE EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.profile_id = p.id
        AND a.status = 'active'
    );
  END IF;

END $$;



create or replace function get_ping_density(
  org_id text,
  start_ts timestamptz,
  end_ts timestamptz
)
returns table (
  vehicle_id text,
  broadcasting_minutes bigint,
  last_ping_at timestamptz,
  trip_count_estimated bigint
)
language sql
as $$
  SELECT
    vehicle_id,
    COUNT(DISTINCT DATE_TRUNC('minute', recorded_at)) AS broadcasting_minutes,
    MAX(recorded_at) AS last_ping_at,
    COUNT(*) FILTER (
      WHERE recorded_at - LAG(recorded_at) OVER (
        PARTITION BY vehicle_id ORDER BY recorded_at
      ) > INTERVAL '8 minutes'
    ) + 1 AS trip_count_estimated
  FROM trip_events
  WHERE
    org_id = get_ping_density.org_id
    AND recorded_at BETWEEN start_ts AND end_ts
    AND event_type IN ('GPS_PING', 'GENESIS_PING')
  GROUP BY vehicle_id;
$$;-- Skene Growth: event_log, failed_events, enrichment_map
-- 1. Schema tables
-- 2. enrich_event (BEFORE INSERT)
-- 3. pg_net + notify_event_log (AFTER INSERT)

CREATE SCHEMA IF NOT EXISTS skene_growth;

CREATE TABLE IF NOT EXISTS skene_growth.event_log (
  id bigserial PRIMARY KEY,
  org_id uuid,
  entity_id uuid,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  occurred_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz,
  attempts int DEFAULT 0 NOT NULL,
  last_error text
);

CREATE TABLE IF NOT EXISTS skene_growth.failed_events (
  id bigserial PRIMARY KEY,
  event_log_id bigint NOT NULL,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}',
  failure_reason text,
  moved_at timestamptz DEFAULT now() NOT NULL
);

DROP TABLE IF EXISTS skene_growth.enrichment_map;
CREATE TABLE skene_growth.enrichment_map (
  trigger_event text NOT NULL,
  metadata_key  text NOT NULL,
  enrich_sql    text,
  strip_after   boolean DEFAULT false,
  PRIMARY KEY (trigger_event, metadata_key)
);

CREATE OR REPLACE FUNCTION skene_growth.enrich_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, skene_growth
AS $$
DECLARE
  rule        RECORD;
  _result     jsonb;
  _strip_keys text[] := ARRAY[]::text[];
BEGIN
  FOR rule IN
    SELECT metadata_key, enrich_sql, strip_after
    FROM skene_growth.enrichment_map
    WHERE trigger_event = NEW.event_type
      AND NEW.metadata ? metadata_key
  LOOP
    BEGIN
      IF rule.enrich_sql IS NOT NULL THEN
        EXECUTE rule.enrich_sql INTO _result USING (NEW.metadata->>rule.metadata_key);
        IF _result IS NOT NULL THEN
          NEW.metadata = NEW.metadata || _result;
        END IF;
      END IF;
      IF rule.strip_after THEN
        _strip_keys := _strip_keys || rule.metadata_key;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
  IF array_length(_strip_keys, 1) > 0 THEN
    NEW.metadata = NEW.metadata - _strip_keys;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS skene_growth_enrich_event ON skene_growth.event_log;
CREATE TRIGGER skene_growth_enrich_event
  BEFORE INSERT ON skene_growth.event_log
  FOR EACH ROW
  EXECUTE FUNCTION skene_growth.enrich_event();

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION skene_growth.notify_event_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, skene_growth, net
AS $$
DECLARE
  payload jsonb;
  ingest_url text := 'https://YOUR_UPSTREAM_INGEST_URL/api/v1/cloud/ingest/db-trigger';
  proxy_secret text := 'YOUR_PROXY_SECRET';
BEGIN
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'event_log',
    'schema', 'skene_growth',
    'record', to_jsonb(NEW),
    'old_record', null
  );
  PERFORM net.http_post(
    url := ingest_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-skene-secret', proxy_secret
    ),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS skene_growth_webhook_event_log ON skene_growth.event_log;
CREATE TRIGGER skene_growth_webhook_event_log
  AFTER INSERT ON skene_growth.event_log
  FOR EACH ROW
  EXECUTE FUNCTION skene_growth.notify_event_log();CREATE OR REPLACE FUNCTION setup_passenger_profile(
  p_intent      text,
  p_first_name  text,
  p_last_name   text,
  p_phone       text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
    SET full_name  = p_first_name || ' ' || p_last_name,
        kyc_intent = p_intent,
        phone      = p_phone
    WHERE id = auth.uid();

  INSERT INTO actors (profile_id, type, status)
    VALUES (auth.uid(), 'PASSENGER', 'active')
    ON CONFLICT DO NOTHING;
END;
$$;-- Migration: Create org_news table for organization news & updates
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

-- migrations/20260327000006_profiles_phone_plan.sql
-- =========================================================
-- Adds phone number to profiles (needed for M-Pesa STK push).
-- Plan is derived from mpesa_customers.subscription_status —
-- no separate plan column needed. This migration only adds phone.
-- =========================================================

alter table public.profiles
  add column if not exists phone text;

comment on column public.profiles.phone is
  'E.164 format e.g. +254712345678. Used for M-Pesa STK push top-ups.';

create index if not exists idx_profiles_phone
  on public.profiles(phone)
  where phone is not null;


-- migrations/20260327000007_profiles_enrichment_fields.sql
-- =========================================================
-- Adds profile enrichment columns collected during create_profile.
-- These are stored as flat columns / jsonb arrays on profiles.
-- All nullable — optional fields in the form.
-- =========================================================

alter table public.profiles
  add column if not exists starting_locations    text,
  add column if not exists destinations          text,
  add column if not exists highway_corridors     text[],
  add column if not exists routes_to_track       text[],
  add column if not exists preferred_vehicle_type text[],
  add column if not exists social_media_links    text,
  add column if not exists emergency_contacts    text,
  add column if not exists languages_spoken      text[],
  add column if not exists time_zone             text default 'Africa/Nairobi',
  add column if not exists working_hours_start   time,
  add column if not exists working_hours_end     time;

comment on column public.profiles.starting_locations    is 'Typical boarding locations for this user';
comment on column public.profiles.destinations          is 'Common destinations for this user';
comment on column public.profiles.highway_corridors     is 'Highway corridors this user operates on';
comment on column public.profiles.routes_to_track       is 'Route IDs the user wants to follow';
comment on column public.profiles.preferred_vehicle_type is 'e.g. [Matatu, Bus]';
comment on column public.profiles.social_media_links    is 'LinkedIn, Twitter, etc.';
comment on column public.profiles.emergency_contacts    is 'Comma-separated E.164 numbers';
comment on column public.profiles.languages_spoken      is 'e.g. [English, Swahili]';
comment on column public.profiles.time_zone             is 'IANA tz e.g. Africa/Nairobi';
comment on column public.profiles.working_hours_start   is 'Preferred shift start (time)';
comment on column public.profiles.working_hours_end     is 'Preferred shift end (time)';






-- ── Geofences table ─────────────────────────────────────────────
create table if not exists public.geofences (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  -- [{ lat: number, lng: number }]
  coords jsonb not null,

  -- scope control
  scope text not null default 'personal'
    check (scope in ('personal', 'org')),

  profile_id uuid references public.profiles(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,

  created_at timestamptz default now()
);

-- ── Constraints ─────────────────────────────────────────────────
alter table public.geofences
  add constraint geofence_personal_needs_profile
    check (scope != 'personal' or profile_id is not null),

  add constraint geofence_org_needs_org
    check (scope != 'org' or org_id is not null);

-- ── Indexes ─────────────────────────────────────────────────────
create index if not exists idx_geofences_profile
  on public.geofences(profile_id);

create index if not exists idx_geofences_org
  on public.geofences(org_id);

create index if not exists idx_geofences_created
  on public.geofences(created_at desc);


-- Enable RLS
alter table public.geofences enable row level security;


create policy "Users can view their geofences"
on public.geofences for select
using (
  profile_id = auth.uid()
  OR
  org_id in (
    select organization_id
    from organization_members
    where actor_id in (
      select id from actors where profile_id = auth.uid()
    )
  )
);



create policy "Users can insert geofences"
on public.geofences for insert
with check (
  profile_id = auth.uid()
  OR
  org_id in (
    select organization_id
    from organization_members
    where actor_id in (
      select id from actors where profile_id = auth.uid()
    )
  )
);




create policy "Users can delete their geofences"
on public.geofences for delete
using (
  profile_id = auth.uid()
  OR
  org_id in (
    select organization_id
    from organization_members
    where actor_id in (
      select id from actors where profile_id = auth.uid()
    )
  )
);



DO $$
BEGIN

  -- personal → must have profile_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'geofence_personal_needs_profile'
  ) THEN
    ALTER TABLE public.geofences
      ADD CONSTRAINT geofence_personal_needs_profile
      CHECK (scope != 'personal' OR profile_id IS NOT NULL);
  END IF;

  -- org → must have org_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'geofence_org_needs_org'
  ) THEN
    ALTER TABLE public.geofences
      ADD CONSTRAINT geofence_org_needs_org
      CHECK (scope != 'org' OR org_id IS NOT NULL);
  END IF;

END $$;





CREATE TABLE IF NOT EXISTS public.mpesa_customers (
  user_id uuid PRIMARY KEY
    REFERENCES public.profiles(id) ON DELETE CASCADE,

  phone_number text,
  mpesa_customer_id text,
  subscription_code text,

  subscription_status text
    CHECK (subscription_status IN ('active', 'inactive', 'pending', 'cancelled')),

  updated_at timestamptz DEFAULT now()
);



CREATE INDEX IF NOT EXISTS idx_mpesa_customers_user_id
ON public.mpesa_customers(user_id);


CREATE OR REPLACE FUNCTION public.handle_org_news_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;



CREATE OR REPLACE FUNCTION public.update_hlf_queue_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;



CREATE OR REPLACE FUNCTION public.bump_permissions_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_profile_id uuid;
  target_actor_id   uuid;
BEGIN
  target_actor_id := coalesce(
    CASE tg_table_name
      WHEN 'actor_permissions'   THEN coalesce(NEW.actor_id, OLD.actor_id)
      WHEN 'actor_policy_groups' THEN coalesce(NEW.actor_id, OLD.actor_id)
      WHEN 'actor_jurisdictions' THEN coalesce(NEW.actor_id, OLD.actor_id)
      WHEN 'delegated_authority' THEN coalesce(
        (row_to_json(NEW) ->> 'to_actor_id')::uuid,
        (row_to_json(OLD) ->> 'to_actor_id')::uuid
      )
      ELSE NULL
    END
  );

  SELECT a.profile_id INTO target_profile_id
  FROM public.actors a
  WHERE a.id = target_actor_id;

  IF target_profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET permissions_version = permissions_version + 1
    WHERE id = target_profile_id;
  END IF;

  RETURN coalesce(NEW, OLD);
END;
$$;


DROP TABLE IF EXISTS public.contact_requests;

CREATE TABLE public.contact_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    first text NOT NULL,
    last text NOT NULL,
    email text NOT NULL,
    phone text,
    org text,
    type text,
    message text NOT NULL,
    ip_address text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_requests_insert
ON public.contact_requests
FOR INSERT
WITH CHECK (
    email IS NOT NULL AND message IS NOT NULL
);

-- If using the Supabase service role:
CREATE POLICY contact_requests_insert_service_role
ON public.contact_requests
FOR INSERT
TO authenticated
WITH CHECK (
    email IS NOT NULL AND message IS NOT NULL
);

DROP TABLE IF EXISTS public.stripe_customers;




ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kyc_intent text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_status text;
-- Enable RLS (probably already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy for self-updating intent and onboarding status
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Self update kyc_intent & onboarding_status"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  kyc_intent IS NOT NULL AND
  onboarding_status IS NOT NULL
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();



create or replace function public.get_my_permissions()
returns table (
  action text,
  level text,
  scope_id uuid,
  effect text
)
language sql
security definer
set search_path = public
as $$
  select action, level, scope_id, effect
  from public.my_permissions
$$;


create or replace function public.get_cached_actor_ids()
returns uuid[]
language sql
security definer
set search_path = public
as $$
  select coalesce(array_agg(id), '{}')
  from actors
  where profile_id = auth.uid()
$$;



revoke all on function public.get_my_permissions() from public;
grant execute on function public.get_my_permissions() to authenticated;

revoke all on function public.get_cached_actor_ids() from public;
grant execute on function public.get_cached_actor_ids() to authenticated;


create or replace function get_ping_density(
  org_id text,
  start_ts timestamptz,
  end_ts timestamptz
)
returns table (
  vehicle_id text,
  broadcasting_minutes bigint,
  last_ping_at timestamptz,
  trip_count_estimated bigint
)
language sql
as $$
  SELECT
    vehicle_id,
    COUNT(DISTINCT DATE_TRUNC('minute', recorded_at)) AS broadcasting_minutes,
    MAX(recorded_at) AS last_ping_at,
    COUNT(*) FILTER (
      WHERE recorded_at - LAG(recorded_at) OVER (
        PARTITION BY vehicle_id ORDER BY recorded_at
      ) > INTERVAL '8 minutes'
    ) + 1 AS trip_count_estimated
  FROM trip_events
  WHERE
    org_id = get_ping_density.org_id
    AND recorded_at BETWEEN start_ts AND end_ts
    AND event_type IN ('GPS_PING', 'GENESIS_PING')
  GROUP BY vehicle_id;
$$;
-- =========================================================
-- MIGRATION: Current Schema → Federated Governance
-- =========================================================
-- Run this in a TRANSACTION. Test on a staging DB first.
--
-- Migration strategy:
--   Phase 1: Add new tables (non-breaking)
--   Phase 2: Backfill data from old structure
--   Phase 3: Add new constraints and indexes
--   Phase 4: Create new functions and RLS policies
--   Phase 5: Drop old policies and objects
-- =========================================================

begin;

-- =========================================================
-- PHASE 1: ADD NEW TABLES
-- =========================================================

-- 1a. Jurisdiction level domain
do $$
begin
  create domain jurisdiction_level as text
    check (value in ('federal', 'org', 'branch', 'department'));
exception when duplicate_object then null;
end $$;

do $$
begin
  create domain permission_effect as text
    check (value in ('allow', 'deny'));
exception when duplicate_object then null;
end $$;

-- 1b. Organizations (if not exists from earlier schema)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text default 'active',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- 1c. Branches
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- 1d. Departments
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- 1e. Actor jurisdictions
create table if not exists actor_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references actors(id) on delete cascade,
  level jurisdiction_level not null,
  scope_id uuid,
  created_at timestamptz default now(),
  unique (actor_id, level, scope_id)
);

-- 1f. Permissions catalog
create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  action text not null unique,
  description text,
  federal_only boolean default false,
  created_at timestamptz default now()
);

-- 1g. Actor permissions
create table if not exists actor_permissions (
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

-- 1h. Policy groups
create table if not exists policy_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_id uuid references organizations(id) on delete cascade,
  description text,
  created_at timestamptz default now()
);

create table if not exists policy_group_permissions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references policy_groups(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  effect permission_effect default 'allow',
  unique (group_id, permission_id)
);

create table if not exists actor_policy_groups (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references actors(id) on delete cascade,
  group_id uuid not null references policy_groups(id) on delete cascade,
  level jurisdiction_level not null,
  scope_id uuid,
  created_at timestamptz default now(),
  unique (actor_id, group_id, level, scope_id)
);

-- 1i. Delegated authority
create table if not exists delegated_authority (
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

-- 1j. Bookings table (was missing entirely)
create table if not exists bookings (
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

-- 1k. Invite tokens
create table if not exists invite_tokens (
  token uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id),
  organization_id uuid references organizations(id),
  actor_type text references roles(id),
  metadata jsonb default '{}',
  expires_at timestamptz not null default (now() + interval '7 days'),
  used boolean default false,
  used_by uuid references profiles(id),
  used_at timestamptz,
  created_at timestamptz default now()
);

-- 1l. Audit logs
create table if not exists audit_logs (
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

-- 1m. Fleet ownership
create table if not exists fleet_ownership (
  actor_id uuid not null references actors(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  percentage numeric default 100 check (percentage > 0 and percentage <= 100),
  primary key (actor_id, vehicle_id)
);

-- 1n. Organization members (if not exists)
create table if not exists organization_members (
  actor_id uuid not null references actors(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null default 'member',
  primary key (actor_id, organization_id)
);


-- =========================================================
-- PHASE 2: ALTER EXISTING TABLES & BACKFILL
-- =========================================================

-- 2a. Add jurisdiction columns to vehicles
alter table vehicles
  add column if not exists branch_id uuid references branches(id) on delete set null,
  add column if not exists department_id uuid references departments(id) on delete set null;

-- If vehicles already has organization_id, ensure FK exists
do $$
begin
  alter table vehicles
    add constraint vehicles_organization_id_fkey
    foreign key (organization_id) references organizations(id) on delete set null;
exception when duplicate_object then null;
end $$;

-- 2b. Add FK to driver_assignments.vehicle_id if missing
do $$
begin
  alter table driver_assignments
    add constraint driver_assignments_vehicle_fkey
    foreign key (vehicle_id) references vehicles(id) on delete cascade;
exception when duplicate_object then null;
end $$;

-- 2c. Add FK to conductor_assignments.vehicle_id if missing
do $$
begin
  alter table conductor_assignments
    add constraint conductor_assignments_vehicle_fkey
    foreign key (vehicle_id) references vehicles(id) on delete cascade;
exception when duplicate_object then null;
end $$;

-- 2d. Add unsubscribed to profiles if missing
alter table profiles
  add column if not exists unsubscribed boolean not null default false;

-- 2e. Ensure updated_at default on profiles
alter table profiles
  alter column updated_at set default now();

-- 2f. Seed core permissions
insert into permissions (action, description, federal_only) values
  -- Vehicle permissions
  ('vehicle.view',       'View vehicle details',             false),
  ('vehicle.create',     'Register a new vehicle',           false),
  ('vehicle.update',     'Update vehicle info',              false),
  ('vehicle.delete',     'Remove a vehicle',                 false),
  -- Booking permissions
  ('booking.view',       'View booking details',             false),
  ('booking.create',     'Create a booking',                 false),
  ('booking.modify',     'Modify an existing booking',       false),
  ('booking.cancel',     'Cancel a booking',                 false),
  -- Compliance permissions
  ('compliance.view',    'View compliance events',           false),
  ('compliance.create',  'Log a compliance event',           false),
  ('compliance.resolve', 'Resolve a compliance event',       false),
  -- Reconciliation permissions
  ('reconciliation.view','View reconciliation data',         false),
  -- Driver/Conductor management
  ('assignment.view',    'View driver/conductor assignments',false),
  ('assignment.manage',  'Create/modify assignments',        false),
  -- Organization management
  ('org.manage',         'Manage organization settings',     false),
  ('org.members',        'Manage organization members',      false),
  -- Platform admin
  ('admin.full',         'Full platform access',             true)
on conflict (action) do nothing;

-- 2g. Backfill: Convert existing stage operators to jurisdictions
-- For each stage_assignment, create an actor_jurisdiction at org level
insert into actor_jurisdictions (actor_id, level, scope_id)
select distinct sa.operator_id, 'org', sa.organization_id
from stage_assignments sa
where sa.organization_id is not null
on conflict do nothing;

-- 2h. Backfill: Give existing org admins the 'org.manage' policy group
-- First create a default admin policy group
do $$
declare
  admin_group_id uuid;
begin
  insert into policy_groups (name, description)
  values ('Default Org Admin', 'Full access within an organization')
  returning id into admin_group_id;

  -- Add all non-federal permissions to this group
  insert into policy_group_permissions (group_id, permission_id, effect)
  select admin_group_id, p.id, 'allow'
  from permissions p
  where p.federal_only = false;

  -- Assign to existing org admins
  insert into actor_policy_groups (actor_id, group_id, level, scope_id)
  select om.actor_id, admin_group_id, 'org', om.organization_id
  from organization_members om
  where om.role = 'admin'
  on conflict do nothing;
end $$;

-- 2i. Backfill: Give platform ADMINs federal jurisdiction
insert into actor_jurisdictions (actor_id, level, scope_id)
select a.id, 'federal', null
from actors a
where a.type = 'ADMIN'
on conflict do nothing;


-- =========================================================
-- PHASE 3: INDEXES
-- =========================================================

create index if not exists idx_actors_profile on actors(profile_id);
create index if not exists idx_actors_type on actors(type);
create index if not exists idx_branches_org on branches(organization_id);
create index if not exists idx_departments_branch on departments(branch_id);
create index if not exists idx_actor_jurisdictions_actor on actor_jurisdictions(actor_id);
create index if not exists idx_permissions_action on permissions(action);
create index if not exists idx_actor_permissions_lookup on actor_permissions(actor_id, effect);
create index if not exists idx_actor_policy_groups_actor on actor_policy_groups(actor_id);
create index if not exists idx_delegated_authority_to on delegated_authority(to_actor_id);
create index if not exists idx_vehicles_org on vehicles(organization_id);
create index if not exists idx_vehicles_branch on vehicles(branch_id);
create index if not exists idx_bookings_org on bookings(organization_id);
create index if not exists idx_bookings_vehicle on bookings(vehicle_id);
create index if not exists idx_compliance_vehicle on compliance_events(vehicle_id);
create index if not exists idx_org_members_org on organization_members(organization_id);
create index if not exists idx_audit_logs_created on audit_logs(created_at desc);
create index if not exists idx_audit_logs_event on audit_logs(event_type, created_at desc);
create index if not exists idx_invite_tokens_org on invite_tokens(organization_id);
create index if not exists idx_stage_assignments_operator on stage_assignments(operator_id);


-- =========================================================
-- PHASE 4: DROP OLD RLS POLICIES (from Doc 1 schema)
-- =========================================================
-- These are the hardcoded stage-operator-based policies being replaced.

-- Vehicles old policies
drop policy if exists "Operators can view vehicles in their stage routes" on vehicles;
drop policy if exists "Operators can update compliance status for vehicles in their stage routes" on vehicles;
drop policy if exists "Vehicle insertion restricted to admin" on vehicles;
drop policy if exists "Vehicle deletion restricted to admin" on vehicles;

-- Driver assignments old policies
drop policy if exists "Operators can view driver assignments for their stage vehicles" on driver_assignments;
drop policy if exists "Driver assignments modification restricted to admin" on driver_assignments;
drop policy if exists "Driver assignments deletion restricted to admin" on driver_assignments;

-- Conductor assignments old policies
drop policy if exists "Operators can view conductor assignments for their stage vehicles" on conductor_assignments;
drop policy if exists "Conductor assignments modification restricted to admin" on conductor_assignments;
drop policy if exists "Conductor assignments deletion restricted to admin" on conductor_assignments;

-- Compliance events old policies
drop policy if exists "Operators can view compliance events for their stage vehicles" on compliance_events;
drop policy if exists "Operators can resolve compliance events for their stage vehicles" on compliance_events;

-- Reconciliation events old policies
drop policy if exists "Operators can view reconciliation events for their stage vehicles" on reconciliation_events;
drop policy if exists "Reconciliation events modification restricted to admin" on reconciliation_events;
drop policy if exists "Reconciliation events deletion restricted to admin" on reconciliation_events;

-- Stage assignments old policies
drop policy if exists "Operators can view their assigned stages" on stage_assignments;
drop policy if exists "Operators can insert their stage assignment" on stage_assignments;
drop policy if exists "Operators can update their stage assignment" on stage_assignments;
drop policy if exists "Stage assignment deletion restricted to admin" on stage_assignments;

-- Actor requests old policies
drop policy if exists "Actor requests are viewable by owner" on actor_requests;
drop policy if exists "Owner can create their request" on actor_requests;
drop policy if exists "Admins can view pending requests" on actor_requests;
drop policy if exists "Admins can update requests" on actor_requests;

-- Drop old bootstrap_session (will be recreated)
drop function if exists public.bootstrap_session();


-- =========================================================
-- PHASE 5: Apply new functions and policies
-- =========================================================
-- At this point, run 02_rls_and_functions.sql to create:
--   - get_actor_ids_for_user()
--   - scope_covers_resource()
--   - can_actor_perform() (fixed version)
--   - current_user_can()
--   - All new RLS policies
--   - bootstrap_session() (updated)
--   - Audit triggers

-- NOTE: The 02_rls_and_functions.sql file should be executed
-- immediately after this migration completes.


commit;

-- =========================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- =========================================================
-- Run these to verify the migration was successful:

-- Check all tables exist
-- select tablename from pg_tables where schemaname = 'public' order by tablename;

-- Check permissions were seeded
-- select * from permissions order by action;

-- Check existing actors got jurisdictions
-- select a.id, a.type, aj.level, aj.scope_id
-- from actors a
-- left join actor_jurisdictions aj on aj.actor_id = a.id
-- order by a.type;

-- Check org admins got policy groups
-- select a.type, pg.name, apg.level, apg.scope_id
-- from actor_policy_groups apg
-- join actors a on a.id = apg.actor_id
-- join policy_groups pg on pg.id = apg.group_id;




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

-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  company_name text,
  avatar_url text,
  website text,
  unsubscribed boolean NOT NULL DEFAULT false
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
  -- create a minimal profile record for the new user; actor bindings are created separately
  insert into public.profiles (id, full_name, avatar_url, updated_at)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', now());
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC: bootstrap_session
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

  select a.* into a from public.actors a
    join public.conductor_assignments ca on ca.actor_id = a.id
    where a.profile_id = p.id and ca.active_trip_id is not null
    limit 1;
  if found then
    landing := '/conductor/trip';
  else
    select a.* into a from public.actors a
      join public.driver_assignments da on da.actor_id = a.id
      where a.profile_id = p.id and da.active_trip_id is not null
      limit 1;
    if found then
      landing := '/driver/navigation';
    else
      select a.* into a from public.actors a
        join public.fleet_ownership fo on fo.actor_id = a.id
        where a.profile_id = p.id
        limit 1;
      if found then
        landing := '/owner/dashboard';
      else
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
  if not found then
    return jsonb_build_object('error','not_found');
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
