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