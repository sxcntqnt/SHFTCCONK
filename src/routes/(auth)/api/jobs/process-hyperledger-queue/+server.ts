// src/routes/(auth)/api/jobs/process-hyperledger-queue/+server.ts

import type { RequestHandler } from "./$types"
import { error } from "@sveltejs/kit"
import {
  PRIVATE_CRON_SECRET,
  PRIVATE_HYPERLEDGER_API_URL,
  PRIVATE_HYPERLEDGER_API_KEY,
} from "$env/static/private"
import { withServiceRoleTx } from "$lib/server/pg"

const RETRY_DELAYS_MINUTES: Record<number, number> = {
  1: 2,
  2: 10,
  3: 60,
  4: 360,
}

const MAX_ATTEMPTS = 5

type EnrollResult = {
  success: boolean
  fabricUserId?: string
  mspId?: string
  error?: string
}

async function callHyperledgerEnroll(
  eventName: string,
  actorId: string,
  profileId: string,
  intent: string,
): Promise<EnrollResult> {
  try {
    const response = await fetch(`${PRIVATE_HYPERLEDGER_API_URL}/enroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PRIVATE_HYPERLEDGER_API_KEY}`,
      },
      body: JSON.stringify({
        event: eventName,
        actor_id: actorId,
        profile_id: profileId,
        intent,
        enrolled_at: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${body}` }
    }

    const data = await response.json()
    return {
      success: true,
      fabricUserId: data.userId ?? data.enrollmentId ?? actorId,
      mspId: data.mspId ?? "MataPulseMSP",
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

type QueueItem = {
  id: string
  actor_id: string
  profile_id: string
  intent: string
  event_name: string
  attempts: number
  max_attempts: number
}

export const POST: RequestHandler = async ({ request }) => {
  // ── Auth ──────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${PRIVATE_CRON_SECRET}`) {
    throw error(401, "Unauthorized")
  }

  // ── Fetch due items ───────────────────────────────────────────────────
  const dueItems = await withServiceRoleTx<QueueItem[]>(async (tx) => {
    return tx<QueueItem[]>`
      SELECT id, actor_id, profile_id, intent, event_name, attempts, max_attempts
      FROM hyperledger_enrollment_queue
      WHERE status IN ('pending', 'retrying')
        AND (next_retry_at IS NULL OR next_retry_at <= now())
      LIMIT 20
    `
  })

  if (!dueItems || dueItems.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  // ── Process each item ────────────────────────────────────────────────
  const results = await Promise.allSettled(
    dueItems.map(async (item) => {
      // Mark as processing to prevent double-processing on parallel runs
      await withServiceRoleTx(async (tx) => {
        await tx`
          UPDATE hyperledger_enrollment_queue
          SET status = 'processing'
          WHERE id = ${item.id}
        `
      })

      const attempt = item.attempts + 1
      const result = await callHyperledgerEnroll(
        item.event_name,
        item.actor_id,
        item.profile_id,
        item.intent,
      )

      if (result.success) {
        await withServiceRoleTx(async (tx) => {
          await tx`
            UPDATE hyperledger_enrollment_queue
            SET status = 'success',
                attempts = ${attempt},
                fabric_user_id = ${result.fabricUserId},
                msp_id = ${result.mspId},
                enrolled_at = now(),
                last_error = NULL
            WHERE id = ${item.id}
          `

          await tx`
            INSERT INTO audit_logs (event_type, actor_id, profile_id, performed_by, details)
            VALUES (
              'hyperledger_enrolled',
              ${item.actor_id},
              ${item.profile_id},
              ${item.profile_id},
              ${JSON.stringify({
                intent: item.intent,
                event_name: item.event_name,
                fabric_user_id: result.fabricUserId,
                msp_id: result.mspId,
                attempt,
              })}::jsonb
            )
          `
        })

        return { id: item.id, status: "success" }
      } else {
        const isExhausted = attempt >= MAX_ATTEMPTS
        const delayMins = RETRY_DELAYS_MINUTES[attempt] ?? 360
        const nextRetry = isExhausted
          ? null
          : new Date(Date.now() + delayMins * 60 * 1000).toISOString()

        await withServiceRoleTx(async (tx) => {
          await tx`
            UPDATE hyperledger_enrollment_queue
            SET status = ${isExhausted ? "exhausted" : "retrying"},
                attempts = ${attempt},
                last_error = ${result.error ?? null},
                next_retry_at = ${nextRetry}
            WHERE id = ${item.id}
          `
        })

        if (isExhausted) {
          console.error(
            `[hlf-queue] Exhausted after ${attempt} attempts:`,
            item.id,
            result.error,
          )
        }

        return {
          id: item.id,
          status: isExhausted ? "exhausted" : "retrying",
          error: result.error,
        }
      }
    }),
  )

  const summary = {
    processed: results.length,
    success: results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).status === "success",
    ).length,
    retrying: results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).status === "retrying",
    ).length,
    exhausted: results.filter(
      (r) =>
        r.status === "fulfilled" && (r.value as any).status === "exhausted",
    ).length,
    errors: results.filter((r) => r.status === "rejected").length,
  }

  console.log("[hlf-queue] Processed:", summary)

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}
