export type MatatuPartner = { name: string; logo: string }
export type IconKey = "tracking" | "routes" | "notifications" | "analytics"

export type PlatformCapability = {
  name: string
  description: string
  icon: IconKey
  image: string
  audience: string[]
}

export type PlatformActor = {
  role: string
  goal: string
  benefits: string[]
  icon: string
}

export type CommuterWorkflow = { icon: IconKey; title: string; description: string; link: string }

export type Testimonial = { name: string; userType: string; testimony: string; rating: number }

/**
 * auth.types.ts
 *
 * Canonical TypeScript types for the Matatu Pulse auth system.
 * These mirror the Supabase database schema and RPC return shapes.
 *
 * ⚠️  Roles are NEVER assigned from the client.
 *     The only sources of role truth are:
 *       1. bootstrap_session() RPC   — post-login identity resolution
 *       2. redeem_invite() RPC       — invitation redemption (org roles)
 *       3. Supabase service-role admin  — ADMIN + initial ORG_CHAIR setup
 */

import type { Role } from "$lib/features/auth/stores/auth"

/* ─────────────────────────────────────────────────────────────────────
   bootstrap_session() RPC
   Called immediately after every sign-in event (all flows).
   Returns the resolved identity and the dashboard route to redirect to.
───────────────────────────────────────────────────────────────────── */
export interface BootstrapSessionPayload {
  profile_id:      string
  actor_id:        string | null
  actor_type:      Role
  name:            string
  email:           string | null
  organizationId:  string | null
  sacco:           string | null
  permissions:     string[]
  route:           string    // e.g. "/account", "/operator/dashboard", "/driver/trips"
}

/* ─────────────────────────────────────────────────────────────────────
   redeem_invite() RPC
   Called from /login/invite/[token] after the user sets their password.
   Server validates token, assigns role+org, creates profile, marks redeemed.
───────────────────────────────────────────────────────────────────── */
export interface RedeemInviteParams {
  p_token:    string   // the raw invite token/code
  p_password: string   // the user's chosen password (set via auth.admin.updateUserById)
}

export interface RedeemInviteResult {
  success:         boolean
  profile_id:      string
  role:            Role
  organization_id: string
}

/* ─────────────────────────────────────────────────────────────────────
   pending_invites table row (read-only from server +page.server.ts)
───────────────────────────────────────────────────────────────────── */
export interface PendingInvite {
  id:              string
  token:           string
  email:           string
  role:            Role             // pre-assigned, immutable
  organization_id: string
  invited_by:      string
  expires_at:      string           // ISO 8601
  redeemed_at:     string | null
}

/* ─────────────────────────────────────────────────────────────────────
   Route resolution map (mirrors bootstrap_session SQL logic)
   Used to determine where to send each role after login.
───────────────────────────────────────────────────────────────────── */
export const ROLE_ROUTES: Record<Role, string> = {
  PASSENGER:           "/account",
  DRIVER:              "/driver/dashboard",
  CONDUCTOR:           "/driver/dashboard",          // shared driver UI
  OWNER:               "/operator/fleet",
  VEHICLE_OWNER:       "/operator/vehicles",
  ORGANIZATION:        "/operator/dashboard",
  ORG_CHAIR:           "/operator/dashboard",
  OPERATIONS_MANAGER:  "/operator/operations",
  COMPLIANCE_OFFICER:  "/operator/compliance",
  ACCOUNTANT:          "/operator/finance",
  ROUTE_SUPERVISOR:    "/operator/routes",
  STAGE_OPERATOR:      "/operator/stages",
  REGULATOR:           "/regulator/dashboard",
  PLANNER:             "/planner/dashboard",
  ADMIN:               "/admin/dashboard",
}

/* ─────────────────────────────────────────────────────────────────────
   SQL: bootstrap_session RPC
   Paste into Supabase SQL editor as a new function.
   Called with auth.uid() resolved by Supabase automatically.
───────────────────────────────────────────────────────────────────── */
export const BOOTSTRAP_SESSION_SQL = `
CREATE OR REPLACE FUNCTION bootstrap_session()
RETURNS TABLE (
  profile_id      uuid,
  actor_id        uuid,
  actor_type      text,
  name            text,
  email           text,
  organization_id uuid,
  sacco           text,
  permissions     text[],
  route           text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_profile    record;
  v_actor      record;
  v_route      text;
BEGIN
  -- 1. Load core profile (created on first sign-in via trigger)
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = v_uid
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile found for user %', v_uid;
  END IF;

  -- 2. Resolve route by role (server-side — never from client)
  v_route := CASE v_profile.role
    WHEN 'PASSENGER'          THEN '/account'
    WHEN 'DRIVER'             THEN '/driver/dashboard'
    WHEN 'CONDUCTOR'          THEN '/driver/dashboard'
    WHEN 'OWNER'              THEN '/operator/fleet'
    WHEN 'VEHICLE_OWNER'      THEN '/operator/vehicles'
    WHEN 'ORGANIZATION'       THEN '/operator/dashboard'
    WHEN 'ORG_CHAIR'          THEN '/operator/dashboard'
    WHEN 'OPERATIONS_MANAGER' THEN '/operator/operations'
    WHEN 'COMPLIANCE_OFFICER' THEN '/operator/compliance'
    WHEN 'ACCOUNTANT'         THEN '/operator/finance'
    WHEN 'ROUTE_SUPERVISOR'   THEN '/operator/routes'
    WHEN 'STAGE_OPERATOR'     THEN '/operator/stages'
    WHEN 'REGULATOR'          THEN '/regulator/dashboard'
    WHEN 'PLANNER'            THEN '/planner/dashboard'
    WHEN 'ADMIN'              THEN '/admin/dashboard'
    ELSE '/account'
  END;

  RETURN QUERY
  SELECT
    v_profile.id,
    v_profile.actor_id,
    v_profile.role::text,
    v_profile.full_name,
    v_profile.email,
    v_profile.organization_id,
    v_profile.sacco,
    v_profile.permissions,
    v_route
  ;
END;
$$;

-- Revoke direct access; only AUTHENTICATED can call via RPC
REVOKE ALL ON FUNCTION bootstrap_session() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bootstrap_session() TO authenticated;
`

/* ─────────────────────────────────────────────────────────────────────
   SQL: redeem_invite RPC
   Paste into Supabase SQL editor as a new function.
   Validates token server-side, creates profile with pre-assigned role,
   marks invite redeemed. Password is set separately via auth.admin API
   called from the SvelteKit server action.
───────────────────────────────────────────────────────────────────── */
export const REDEEM_INVITE_SQL = `
CREATE OR REPLACE FUNCTION redeem_invite(
  p_token    text,
  p_password text    -- received but password is set via auth.admin in the server action
                     -- this param exists so the RPC signature is complete; password
                     -- update is done server-side before calling this function.
)
RETURNS TABLE (
  success         boolean,
  profile_id      uuid,
  role            text,
  organization_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite   record;
  v_uid      uuid := auth.uid();
BEGIN
  -- Fetch and lock the invite row
  SELECT * INTO v_invite
  FROM pending_invites
  WHERE token = upper(trim(p_token))
    AND redeemed_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITE_INVALID: Token not found, already redeemed, or expired.';
  END IF;

  -- Ensure the signed-in user's email matches the invite
  -- (prevents token sharing / account takeover)
  IF v_invite.email != (SELECT email FROM auth.users WHERE id = v_uid) THEN
    RAISE EXCEPTION 'INVITE_EMAIL_MISMATCH: Signed-in email does not match invitation.';
  END IF;

  -- Create or update the profile with the pre-assigned role
  -- Role comes from the invite row — NEVER from p_role param
  INSERT INTO profiles (
    id,
    full_name,
    email,
    role,                    -- from invite, not user input
    organization_id,         -- from invite, not user input
    permissions,
    actor_id,
    actor_type
  )
  SELECT
    v_uid,
    split_part(v_invite.email, '@', 1),  -- placeholder; user can update in settings
    v_invite.email,
    v_invite.role,
    v_invite.organization_id,
    ARRAY[]::text[],         -- permissions resolved at query time via RBAC policies
    null,
    v_invite.role
  ON CONFLICT (id) DO UPDATE
    SET role            = EXCLUDED.role,
        organization_id = EXCLUDED.organization_id;

  -- Mark invite as redeemed
  UPDATE pending_invites
  SET redeemed_at = now()
  WHERE id = v_invite.id;

  RETURN QUERY SELECT true, v_uid, v_invite.role::text, v_invite.organization_id;
END;
$$;

REVOKE ALL ON FUNCTION redeem_invite(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_invite(text, text) TO authenticated;
`