-- =========================================================
-- 00_extensions_domains.sql
-- =========================================================
-- Run first. Creates extensions and domain types used by all
-- subsequent files.
-- =========================================================

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────
-- APP_BACKEND ROLE
-- ─────────────────────────────────────────────────────────
-- The sole DB role used by the auth-service for every request.
-- Created here (not in 08_privileges.sql) because 06_rls.sql
-- creates policies scoped `to app_backend` — the role must exist
-- before that file runs. Table/function grants for it live in
-- 08_privileges.sql, after the objects they reference exist.
--
-- NOBYPASSRLS is deliberate: app_backend is subject to RLS like any
-- other role, so every table it needs to write through must have an
-- explicit `to app_backend` policy (see 06_rls.sql — stripe_customers,
-- contact_requests, and the profiles admin/manager policies).
-- Password is a placeholder; replace via Vault before deploy.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_backend') then
    create role app_backend with
      login
      password 'CHANGE_ME_VIA_VAULT'
      nosuperuser
      nobypassrls
      nocreatedb
      nocreaterole;
  end if;
end
$$;

-- Jurisdiction scope levels (domain instead of enum for easy ALTER)
create domain jurisdiction_level as text
  check (value in ('federal', 'org', 'branch', 'department'));

-- Permission effect (allow / deny)
create domain permission_effect as text
  check (value in ('allow', 'deny'));

-- NEON MIGRATION: the Supabase Storage bucket/policy block that used to
-- live here (storage.buckets / storage.objects) has been removed.
-- storage.* is Supabase's proprietary storage schema — it does not
-- exist on Neon, so `insert into storage.buckets` would fail with
-- "schema storage does not exist" and stop the entire migration run
-- on this file. profiles.avatar_url remains a plain text column
-- (a URL); avatar upload/serving is now the app layer's
-- responsibility against whatever object storage backs it
-- (e.g. S3/R2, provisioned and secreted via Vault), not Postgres.
-- Note the old "Anyone can upload an avatar" policy also had no
-- ownership check at all — don't reintroduce that unscoped write
-- if/when the replacement storage layer is wired up.
