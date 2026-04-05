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
$$;