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
