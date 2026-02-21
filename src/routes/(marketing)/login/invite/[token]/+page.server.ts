import type { PageServerLoad } from "./$types"
import { error as kitError } from "@sveltejs/kit"

/**
 * +page.server.ts for /login/invite/[token]
 *
 * Validates the invite token server-side before the page renders.
 * No role or org data is ever trusted from the client.
 *
 * The `pending_invites` table schema (Supabase):
 *
 *   CREATE TABLE pending_invites (
 *     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     token           text UNIQUE NOT NULL,       -- signed token / code
 *     email           text NOT NULL,
 *     role            text NOT NULL,              -- from ROLES enum
 *     organization_id uuid REFERENCES organizations(id),
 *     invited_by      text NOT NULL,              -- name of inviter
 *     expires_at      timestamptz NOT NULL,
 *     redeemed_at     timestamptz,                -- null until used
 *     created_at      timestamptz DEFAULT now()
 *   );
 *
 *   -- RLS: only the service role can read/write pending_invites.
 *   -- Never expose this table to anon or authenticated roles directly.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
  const { token } = params

  if (!token || token.length < 8) {
    return {
      token,
      invite: { valid: false, error: "Invalid invitation code format." },
    }
  }

  // Use the service-role client (server only — never expose to browser)
  const supabase = locals.supabaseServiceRole

  const { data: invite, error: dbErr } = await supabase
    .from("pending_invites")
    .select(`
      id,
      email,
      role,
      organization_id,
      invited_by,
      expires_at,
      redeemed_at,
      organizations ( name )
    `)
    .eq("token", token.toUpperCase())
    .maybeSingle()

  // Token not found
  if (dbErr || !invite) {
    return {
      token,
      invite: { valid: false, error: "This invitation code was not found." },
    }
  }

  // Already redeemed
  if (invite.redeemed_at) {
    return {
      token,
      invite: { valid: false, error: "This invitation has already been used." },
    }
  }

  // Expired
  if (new Date(invite.expires_at) < new Date()) {
    return {
      token,
      invite: { valid: false, error: "This invitation has expired. Invitation links are valid for 72 hours." },
    }
  }

  // Valid — return the pre-assigned identity. Role is READ-ONLY from here.
  return {
    token,
    invite: {
      valid:            true,
      email:            invite.email,
      role:             invite.role,               // never from user input
      organizationId:   invite.organization_id,    // never from user input
      organizationName: (invite.organizations as any)?.name ?? "Your Organisation",
      invitedBy:        invite.invited_by,
      expiresAt:        invite.expires_at,
      error:            null,
    },
  }
}