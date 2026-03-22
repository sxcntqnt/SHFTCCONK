// src/routes/(auth)/admin/dlq/[orgId]/replay/+server.ts
//
// POST /admin/dlq/[orgId]/replay
//
// Requeue specific DLQ event IDs back into the batch writer pipeline.
// Body: { ids: string[] }          — array of stream IDs to replay
// Returns: { replayed: number }
//
// Access: SUPER_ADMIN or ADMIN only (requireAdminAccess)

import type { RequestHandler } from "./$types"
import { json }                from "@sveltejs/kit"
import { requireAdminAccess }  from "$lib/security/authGuard"

export const POST: RequestHandler = async (event) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  try {
    await requireAdminAccess(event)
  } catch {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  const { params, request, locals } = event
  const { session } = await locals.safeGetSession()
  const supabase    = locals.supabase
  const { orgId }   = params

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const ids = (body as { ids?: unknown })?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return json({ error: "ids must be a non-empty array" }, { status: 400 })
  }
  if (ids.length > 100) {
    return json({ error: "Maximum 100 events per replay request" }, { status: 422 })
  }
  if (!ids.every((id) => typeof id === "string")) {
    return json({ error: "All ids must be strings" }, { status: 400 })
  }

  // ── Fetch original events ─────────────────────────────────────────────────
  const { data: events, error: fetchErr } = await supabase
    .from("dlq_events")
    .select("stream_id, original_event, vehicle_id")
    .eq("org_id", orgId)
    .in("stream_id", ids as string[])

  if (fetchErr) {
    return json({ error: `Fetch failed: ${fetchErr.message}` }, { status: 500 })
  }
  if (!events?.length) {
    return json({ error: "No matching events found for this org" }, { status: 404 })
  }

  // ── Mark as replaying ─────────────────────────────────────────────────────
  // In production: XADD each original_event back to gps:batch:{orgId} via
  // the Redis client, then delete from dlq_events on ACK.
  // Currently: mark status = 'replaying' so the background job picks it up.
  const { error: updateErr } = await supabase
    .from("dlq_events")
    .update({
      status:       "replaying",
      replayed_at:  new Date().toISOString(),
      replayed_by:  session!.user.id,
      attempts:     0,   // reset so batch writer gets fresh attempts
    })
    .eq("org_id", orgId)
    .in("stream_id", ids as string[])

  if (updateErr) {
    return json({ error: `Replay failed: ${updateErr.message}` }, { status: 500 })
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  await supabase.from("audit_logs").insert({
    event_type:   "dlq_replay",
    performed_by: session!.user.id,
    target_table: "dlq_events",
    details: {
      org_id:       orgId,
      event_count:  events.length,
      stream_ids:   ids,
    },
  })

  return json({ replayed: events.length }, { status: 200 })
}