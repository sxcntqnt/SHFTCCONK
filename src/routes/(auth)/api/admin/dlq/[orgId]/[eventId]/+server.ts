// src/routes/(auth)/admin/dlq/[orgId]/[eventId]/+server.ts
//
// DELETE /admin/dlq/[orgId]/[eventId]
//
// Permanently discard a single DLQ event.
// This cannot be undone — the original GPS data is lost.
//
// Returns: { discarded: true, id: string }
//
// Access: SUPER_ADMIN or ADMIN only (requireAdminAccess)

import type { RequestHandler } from "./$types"
import { json } from "@sveltejs/kit"
import { requireAdminAccess } from "$lib/security/authGuard"

export const DELETE: RequestHandler = async (event) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  try {
    await requireAdminAccess(event)
  } catch {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  const { params, locals } = event
  const { session } = await locals.safeGetSession()
  const supabase = locals.supabase
  const { orgId, eventId } = params

  if (!eventId) {
    return json({ error: "Missing eventId" }, { status: 400 })
  }

  // ── Verify the event belongs to this org before deleting ──────────────────
  // Prevents an admin of org A from deleting events that belong to org B
  // by crafting a request with a mismatched orgId/eventId pair.
  const { data: existing, error: checkErr } = await supabase
    .from("dlq_events")
    .select("stream_id, vehicle_id, org_id")
    .eq("org_id", orgId)
    .eq("stream_id", eventId)
    .maybeSingle()

  if (checkErr) {
    return json(
      { error: `Lookup failed: ${checkErr.message}` },
      { status: 500 },
    )
  }
  if (!existing) {
    return json(
      { error: "Event not found or does not belong to this org" },
      { status: 404 },
    )
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const { error: deleteErr } = await supabase
    .from("dlq_events")
    .delete()
    .eq("org_id", orgId)
    .eq("stream_id", eventId)

  if (deleteErr) {
    return json(
      { error: `Discard failed: ${deleteErr.message}` },
      { status: 500 },
    )
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  await supabase.from("audit_logs").insert({
    event_type: "dlq_discard",
    performed_by: session!.user.id,
    target_table: "dlq_events",
    details: {
      org_id: orgId,
      stream_id: eventId,
      vehicle_id: existing.vehicle_id,
    },
  })

  return json({ discarded: true, id: eventId }, { status: 200 })
}
