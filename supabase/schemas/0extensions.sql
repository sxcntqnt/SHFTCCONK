-- =========================================================
-- 00_extensions_domains.sql
-- =========================================================
-- Run first. Creates extensions and domain types used by all
-- subsequent files.
-- =========================================================

create extension if not exists "pgcrypto";

-- Jurisdiction scope levels (domain instead of enum for easy ALTER)
create domain jurisdiction_level as text
  check (value in ('federal', 'org', 'branch', 'department'));

-- Permission effect (allow / deny)
create domain permission_effect as text
  check (value in ('allow', 'deny'));

-- Storage bucket for avatars
insert into storage.buckets (id, name)
  values ('avatars', 'avatars')
  on conflict do nothing;

create policy "Avatar images are publicly accessible." on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Anyone can upload an avatar." on storage.objects
  for insert with check (bucket_id = 'avatars');