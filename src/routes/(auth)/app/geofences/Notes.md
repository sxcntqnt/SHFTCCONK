Create table in Supabase SQL editor:

create table geofences (
  id uuid primary key,
  name text not null,
  color text,
  owner_id uuid not null references auth.users(id) on delete cascade,
created_at timestamp with time zone default now()

);
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Enable Row-Level Security (CRITICAL)
alter table geofences enable row level security;

create policy "Users can access own geofences"
on geofences
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);