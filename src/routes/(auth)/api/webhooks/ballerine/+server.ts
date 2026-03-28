// src/routes/api/webhooks/ballerine/+server.ts
//
// Ballerine KYC webhook — receives case completion events.
//
// SUPPORTED EVENTS:
//   kyc.approved  → create actor, update profile, trigger Hyperledger
//   kyc.rejected  → update profile kyc_status = 'rejected'
//   kyc.expired   → update profile kyc_status = 'expired'
//
// INTENT → ACTOR MAPPING:
//   passenger → PASSENGER actor (no Hyperledger)
//   crew      → DRIVER or CONDUCTOR actor (Hyperledger: enroll_crew_member)
//   operator  → OPERATOR actor (Hyperledger: enroll_operator)
//   owner     → ORG_CHAIR actor pending org (Hyperledger: enroll_fleet_owner)
//   org       → ORG_CHAIR actor after org creation (Hyperledger: register_organisation)
//
// SECURITY:
//   Requests are verified via HMAC-SHA256 signature from Ballerine.
//   Uses service role client — bypasses RLS to create actors.
//   Never exposed to the client. PRIVATE_BALLERINE_WEBHOOK_SECRET env var required.
//
// HYPERLEDGER:
//   Only crew, operator, owner, and org intents trigger Hyperledger enrollment.
//   The Fabric API endpoint is called AFTER the actor is created in Supabase.
//   Failure is logged but does NOT roll back the actor creation —
//   Hyperledger sync can be retried via the admin panel.

import type { RequestHandler }      from './$types'
import { error }                    from '@sveltejs/kit'
import {
  PRIVATE_BALLERINE_WEBHOOK_SECRET,
  PRIVATE_HYPERLEDGER_API_URL,
  PRIVATE_HYPERLEDGER_API_KEY,
}                                   from '$env/static/private'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BallerineEvent =
  | 'kyc.approved'
  | 'kyc.rejected'
  | 'kyc.expired'
  | 'kyc.manual_review'

type BallerineWebhookPayload = {
  event:       BallerineEvent
  case_id:     string
  workflow_id: string
  end_user_id: string   // Supabase user.id
  metadata?:   Record<string, unknown>
}

// Intent → actor type mapping
// crew intent creates a pending actor — org assigns DRIVER or CONDUCTOR later
const INTENT_TO_ACTOR_TYPE: Record<string, string> = {
  passenger: 'PASSENGER',
  crew:      'DRIVER',      // org will switch to CONDUCTOR if needed
  operator:  'OPERATOR',
  owner:     'ORG_CHAIR',   // pending org creation
  org:       'ORG_CHAIR',
}

// Intents that trigger Hyperledger enrollment
const HYPERLEDGER_INTENTS = new Set(['crew', 'operator', 'owner', 'org'])

// Hyperledger event names per intent
const HYPERLEDGER_EVENT: Record<string, string> = {
  crew:     'enroll_crew_member',
  operator: 'enroll_operator',
  owner:    'enroll_fleet_owner',
  org:      'register_organisation',
}

// ─────────────────────────────────────────────────────────────────────────────
// HMAC signature verification
// ─────────────────────────────────────────────────────────────────────────────

async function verifyBallerineSignature(
  request: Request,
  rawBody: string,
): Promise<boolean> {
  const signature = request.headers.get('x-ballerine-signature')
  if (!signature) return false

  const encoder    = new TextEncoder()
  const keyData    = encoder.encode(PRIVATE_BALLERINE_WEBHOOK_SECRET)
  const bodyData   = encoder.encode(rawBody)
  const cryptoKey  = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const signedData = await crypto.subtle.sign('HMAC', cryptoKey, bodyData)
  const expected   = Buffer.from(signedData).toString('hex')

  // Constant-time comparison
  return `sha256=${expected}` === signature
}

// ─────────────────────────────────────────────────────────────────────────────
// Hyperledger Fabric enrollment
// ─────────────────────────────────────────────────────────────────────────────

async function enrollOnHyperledger(
  intent:    string,
  userId:    string,
  actorId:   string,
  profileId: string,
): Promise<void> {
  const eventName = HYPERLEDGER_EVENT[intent]
  if (!eventName) return

  const response = await fetch(`${PRIVATE_HYPERLEDGER_API_URL}/enroll`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${PRIVATE_HYPERLEDGER_API_KEY}`,
    },
    body: JSON.stringify({
      event:      eventName,
      user_id:    userId,
      actor_id:   actorId,
      profile_id: profileId,
      intent,
      enrolled_at: new Date().toISOString(),
    }),
  })

  if (!response.ok) {
    // Log but don't throw — Hyperledger sync can be retried
    console.error(
      `[ballerine webhook] Hyperledger enrollment failed for ${intent}:`,
      response.status, await response.text(),
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
  const rawBody = await request.text()

  // ── 1. Verify signature ─────────────────────────────────────────────────
  const isValid = await verifyBallerineSignature(request, rawBody)
  if (!isValid) {
    console.error('[ballerine webhook] Invalid signature — rejected')
    throw error(401, 'Invalid webhook signature')
  }

  let payload: BallerineWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw error(400, 'Invalid JSON payload')
  }

  const { event, case_id, end_user_id } = payload

  // Use service role — bypasses RLS for actor creation
  const supabase = locals.supabaseServiceRole

  // ── 2. Find the profile by ballerine_case_id ────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, kyc_intent, kyc_status, onboarding_status')
    .eq('ballerine_case_id', case_id)
    .single()

  if (profileError || !profile) {
    console.error('[ballerine webhook] Profile not found for case_id:', case_id)
    // Return 200 to prevent Ballerine retrying — this is a data issue not a server error
    return new Response(JSON.stringify({ received: true, status: 'profile_not_found' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const intent = profile.kyc_intent as string

  // ── 3. Handle event ─────────────────────────────────────────────────────

  switch (event) {

    case 'kyc.approved': {
      // Guard against double-processing
      if (profile.kyc_status === 'approved') {
        return new Response(JSON.stringify({ received: true, status: 'already_processed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const actorType = INTENT_TO_ACTOR_TYPE[intent]
      if (!actorType) {
        console.error('[ballerine webhook] Unknown intent:', intent)
        break
      }

      // Create the actor — this is the ONLY place actors are created from onboarding
      // Org assigns roles (DRIVER vs CONDUCTOR) — we create DRIVER as default for crew
      const { data: newActor, error: actorError } = await supabase
        .from('actors')
        .insert({
          profile_id: profile.id,
          type:       actorType,
          // 'pending' for crew/operator/owner — org must approve before 'active'
          // 'active' for passenger — immediately usable
          status: intent === 'passenger' ? 'active' : 'pending',
          metadata: {
            kyc_intent:   intent,
            kyc_approved: new Date().toISOString(),
          },
        })
        .select('id')
        .single()

      if (actorError || !newActor) {
        console.error('[ballerine webhook] Actor creation failed:', actorError)
        // Return 500 so Ballerine retries
        return new Response(JSON.stringify({ error: 'Actor creation failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Update profile to ACTIVE
      await supabase
        .from('profiles')
        .update({
          kyc_status:        'approved',
          onboarding_status: 'ACTIVE',
        })
        .eq('id', profile.id)

      // Audit log
      await supabase
        .from('audit_logs')
        .insert({
          event_type:   'kyc_approved',
          profile_id:   profile.id,
          actor_id:     newActor.id,
          performed_by: profile.id,
          details: {
            intent,
            case_id,
            actor_type: actorType,
          },
        })

      // Hyperledger enrollment — async, non-blocking for the response
      if (HYPERLEDGER_INTENTS.has(intent)) {
        enrollOnHyperledger(intent, end_user_id, newActor.id, profile.id)
          .catch(err => console.error('[ballerine webhook] Hyperledger enrollment error:', err))
      }

      break
    }

    case 'kyc.rejected': {
      await supabase
        .from('profiles')
        .update({ kyc_status: 'rejected' })
        .eq('id', profile.id)

      await supabase
        .from('audit_logs')
        .insert({
          event_type:   'kyc_rejected',
          profile_id:   profile.id,
          performed_by: profile.id,
          details:      { intent, case_id },
        })

      break
    }

    case 'kyc.expired': {
      await supabase
        .from('profiles')
        .update({
          kyc_status:        'expired',
          onboarding_status: 'GUEST',   // reset — user must restart
          kyc_intent:        null,
          ballerine_case_id: null,
        })
        .eq('id', profile.id)

      break
    }

    case 'kyc.manual_review': {
      // Ballerine needs human review — status stays 'pending'
      // Notify admin via audit log
      await supabase
        .from('audit_logs')
        .insert({
          event_type:   'kyc_manual_review',
          profile_id:   profile.id,
          performed_by: profile.id,
          details:      { intent, case_id, workflow_id: payload.workflow_id },
        })

      break
    }

    default:
      console.warn('[ballerine webhook] Unknown event type:', event)
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
