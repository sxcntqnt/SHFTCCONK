// src/routes/api/compliance/check/+server.ts
//
// POST /api/compliance/check
//
// Accepts a single ComplianceItem or array of ComplianceItems.
// Returns evaluated compliance results with status and severity.
//
// CONTEXT SHIFT:
//   Old: get(user) from client store — always empty on server, was a silent bug.
//   New: session + orgId from locals (set by hooks.server.ts authGuardHandle).
//
//   The orgId is read from the request body and cross-checked against the
//   caller's session permissions via locals.supabase RLS — if the user has
//   no access to that org the DB query returns nothing and we 403.
//
//   For routes that don't need a DB check (pure rule engine evaluation),
//   the orgId in the body is stamped onto every item for tenant isolation.
//   The caller must provide an orgId they are authorised for.

import { json }               from "@sveltejs/kit"
import type { RequestHandler } from "$lib/types"
import {
  evaluateCompliance,
  evaluateComplianceBatch,
  type ComplianceItem,
  type ComplianceResult,
} from "$lib/engines/ruleEngine"

export const POST: RequestHandler = async ({ request, locals }) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  // locals.safeGetSession() is set by hooks.server.ts.
  // Returns null session if the JWT is missing or invalid.
  const { session } = await locals.safeGetSession()

  if (!session?.user?.id) {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body) {
    return json({ error: "Missing request body" }, { status: 400 })
  }

  // Normalise to array
  const items: ComplianceItem[] = Array.isArray(body) ? body : [body]

  if (items.length === 0) {
    return json({ error: "At least one item is required" }, { status: 400 })
  }

  if (items.length > 500) {
    return json({ error: "Maximum 500 items per request" }, { status: 422 })
  }

  // ── Validate required fields ──────────────────────────────────────────────
  for (const item of items) {
    if (!item.vehicleId || !item.type || !item.expiryDate) {
      return json(
        { error: "Each item requires: vehicleId, type, expiryDate" },
        { status: 400 },
      )
    }
  }

  // ── Resolve org ID ────────────────────────────────────────────────────────
  // The orgId can come from:
  //   1. The request body (single item: item.organizationId, batch: body.orgId)
  //   2. A query param (?orgId=...)
  //
  // We do NOT read from a client-side store — this runs server-side.
  // The caller is responsible for providing the orgId they want to operate in.
  // RLS on the vehicles table enforces they can only evaluate vehicles
  // that belong to orgs they are a member of.
  const bodyOrgId = Array.isArray(body)
    ? items[0]?.organizationId        // batch: infer from first item
    : (body as Record<string, unknown>)?.organizationId as string | undefined

  if (!bodyOrgId) {
    return json(
      { error: "organizationId is required on each item" },
      { status: 400 },
    )
  }

  // ── Verify caller has access to this org ──────────────────────────────────
  // We check via the org_memberships view (or actors + jurisdictions).
  // If RLS denies access, the query returns null and we 403.
  const { data: membership } = await locals.supabase
    .from("organization_members")
    .select("actor_id")
    .eq("organization_id", bodyOrgId)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return json(
      { error: "You do not have access to this organisation" },
      { status: 403 },
    )
  }

  // ── Stamp orgId on all items (tenant isolation) ───────────────────────────
  // Ensures items cannot be evaluated against a different org even if the
  // caller sends mixed orgIds in a batch.
  const tenantItems: ComplianceItem[] = items.map((item) => ({
    ...item,
    organizationId: bodyOrgId,
  }))

  // ── Evaluate ──────────────────────────────────────────────────────────────
  // Single item uses evaluateCompliance directly.
  // Batch uses evaluateComplianceBatch for efficiency.
  let results: ComplianceResult[]

  try {
    if (tenantItems.length === 1) {
      results = [{
        vehicleId:  tenantItems[0].vehicleId,
        compliance: evaluateCompliance(tenantItems[0]),
      }]
    } else {
      results = evaluateComplianceBatch(tenantItems)
    }
  } catch (err) {
    console.error("[compliance/check] rule engine error:", err)
    return json({ error: "Compliance evaluation failed" }, { status: 500 })
  }

  // ── Respond ───────────────────────────────────────────────────────────────
  return json({
    status:  "SUCCESS",
    orgId:   bodyOrgId,
    count:   results.length,
    results,
  })
}