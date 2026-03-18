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