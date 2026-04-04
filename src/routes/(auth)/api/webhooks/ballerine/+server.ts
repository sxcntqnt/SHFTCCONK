// src/routes/api/webhooks/ballerine/+server.ts
//
// Ballerine KYC webhook — receives case completion events.
//
// AUTOMATION CHANGE:
//   Previously called enrollOnHyperledger() directly (fire-and-forget).
//   Now inserts into hyperledger_enrollment_queue instead.
//   Queue processor (/api/jobs/process-hyperledger-queue) handles retries.
//   This means the webhook returns 200 immediately without blocking on
//   the Fabric CA call — webhook reliability is no longer coupled to
//   Hyperledger availability.

import type { RequestHandler } from "./$types"
import { error } from "@sveltejs/kit"
import { PRIVATE_BALLERINE_WEBHOOK_SECRET } from "$env/static/private"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BallerineEvent =
  | "kyc.approved"
  | "kyc.rejected"
  | "kyc.expired"
  | "kyc.manual_review"

type BallerineWebhookPayload = {
  event: BallerineEvent
  case_id: string
  workflow_id: string
  end_user_id: string
  metadata?: Record<string, unknown>
}

const INTENT_TO_ACTOR_TYPE: Record<string, string> = {
  passenger: "PASSENGER",
  crew: "DRIVER",
  operator: "OPERATOR",
  owner: "ORG_CHAIR",
  org: "ORG_CHAIR",
}

// Intents that need Hyperledger enrollment — passenger does not
const HYPERLEDGER_EVENT: Record<string, string> = {
  crew: "enroll_crew_member",
  operator: "enroll_operator",
  owner: "enroll_fleet_owner",
  org: "register_organisation",
}

// ─────────────────────────────────────────────────────────────────────────────
// HMAC verification
// ─────────────────────────────────────────────────────────────────────────────

async function verifySignature(
  request: Request,
  rawBody: string,
): Promise<boolean> {
  const signature = request.headers.get("x-ballerine-signature")
  if (!signature) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(PRIVATE_BALLERINE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody))
  const expected = `sha256=${Buffer.from(signed).toString("hex")}`

  return expected === signature
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
  const rawBody = await request.text()

  if (!(await verifySignature(request, rawBody))) {
    console.error("[ballerine] Invalid signature")
    throw error(401, "Invalid webhook signature")
  }

  let payload: BallerineWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw error(400, "Invalid JSON")
  }

  const { event, case_id } = payload
  const supabase = locals.supabaseServiceRole

  // ── Find profile by case_id ──────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, kyc_intent, kyc_status, onboarding_status")
    .eq("ballerine_case_id", case_id)
    .single()

  if (!profile) {
    console.error("[ballerine] Profile not found for case_id:", case_id)
    // Return 200 — prevents Ballerine retrying on a data issue
    return new Response(
      JSON.stringify({ received: true, status: "profile_not_found" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  const intent = profile.kyc_intent as string

  switch (event) {
    case "kyc.approved": {
      // Guard against double-processing
      if (profile.kyc_status === "approved") {
        return new Response(
          JSON.stringify({ received: true, status: "already_processed" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }

      const actorType = INTENT_TO_ACTOR_TYPE[intent]
      if (!actorType) {
        console.error("[ballerine] Unknown intent:", intent)
        break
      }

      // ── Create actor ───────────────────────────────────────────────────
      const { data: newActor, error: actorError } = await supabase
        .from("actors")
        .insert({
          profile_id: profile.id,
          type: actorType,
          status: intent === "passenger" ? "active" : "pending",
          metadata: {
            kyc_intent: intent,
            kyc_approved: new Date().toISOString(),
          },
        })
        .select("id")
        .single()

      if (actorError || !newActor) {
        console.error("[ballerine] Actor creation failed:", actorError)
        return new Response(
          JSON.stringify({ error: "Actor creation failed" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      // ── Update profile ─────────────────────────────────────────────────
      await supabase
        .from("profiles")
        .update({
          kyc_status: "approved",
          onboarding_status: "ACTIVE",
        })
        .eq("id", profile.id)

      // ── Audit log ──────────────────────────────────────────────────────
      await supabase.from("audit_logs").insert({
        event_type: "kyc_approved",
        profile_id: profile.id,
        actor_id: newActor.id,
        performed_by: profile.id,
        details: { intent, case_id, actor_type: actorType },
      })

      // ── Queue Hyperledger enrollment (non-blocking) ────────────────────
      // Passenger KYC does not require Fabric enrollment.
      // All other intents are queued — processor handles retries.
      const fabricEvent = HYPERLEDGER_EVENT[intent]
      if (fabricEvent) {
        const { error: queueError } = await supabase
          .from("hyperledger_enrollment_queue")
          .insert({
            actor_id: newActor.id,
            profile_id: profile.id,
            intent,
            event_name: fabricEvent,
            status: "pending",
          })

        if (queueError) {
          // Non-fatal — log and continue. Admin dashboard shows pending items.
          console.error(
            "[ballerine] Failed to queue Hyperledger enrollment:",
            queueError,
          )
        }
      }

      break
    }

    case "kyc.rejected": {
      await supabase
        .from("profiles")
        .update({ kyc_status: "rejected" })
        .eq("id", profile.id)

      await supabase.from("audit_logs").insert({
        event_type: "kyc_rejected",
        profile_id: profile.id,
        performed_by: profile.id,
        details: { intent, case_id },
      })
      break
    }

    case "kyc.expired": {
      await supabase
        .from("profiles")
        .update({
          kyc_status: "expired",
          onboarding_status: "GUEST",
          kyc_intent: null,
          ballerine_case_id: null,
        })
        .eq("id", profile.id)
      break
    }

    case "kyc.manual_review": {
      await supabase.from("audit_logs").insert({
        event_type: "kyc_manual_review",
        profile_id: profile.id,
        performed_by: profile.id,
        details: { intent, case_id, workflow_id: payload.workflow_id },
      })
      break
    }

    default:
      console.warn("[ballerine] Unknown event:", event)
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}
