alter table contact_requests
add column ip_address text,
add column created_at timestamptz default now();

-- Prevent mass spam bursts
create index on contact_requests (ip_address);

-- Optional dedupe constraint
create unique index contact_dedupe_idx
on contact_requests (email, ip_address, date_trunc('minute', created_at));


alter table contact_requests enable row level security;

create policy "service_role_only"
on contact_requests
for all
using (auth.role() = 'service_role');