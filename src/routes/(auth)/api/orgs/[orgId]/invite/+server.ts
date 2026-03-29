// src/routes/(auth)/org/orgId/api/invite/+server.ts
//
// Invite Management — Federated Governance (Production)
//
// Aligned with:
//   - DatabaseDefinitions.ts (full schema types)
//   - hooks.server.ts (safeGetSession → locals.session + locals.user)
//   - can_actor_perform() actual signature (actor_uuid, action_text, res_org)
//   - Optimized my_permissions view (aggregated, deny-wins, federal-aware)
//   - auth.ts patterns (canInOrg, canManageOrg)
//
// Endpoints:
//   POST   /api/invite          — create + send invitation
//   GET    /api/invite?org=UUID — list invites (RLS-gated)
//   DELETE /api/invite?token=UUID — revoke pending invite

import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

/* ============================================================
   POST /api/invite
   Create and send an invitation.

   Body: {
     email: string
     actor_type: string        — DRIVER, CONDUCTOR, OWNER, etc. (roles.id)
     organization_id: string   — target org UUID
     metadata?: object         — optional extra (department, notes)
   }

   Permission: org.invite scoped to the target organization.
   Any of the caller's active actors can satisfy this.
============================================================ */
export const POST: RequestHandler = async ({
  request,
  locals: { supabase, supabaseServiceRole, session, user },
  url,
}) => {
  // hooks.server.ts authGuardHandle already verified session + user
  // for /api/* routes, returning 401 if missing. Belt-and-suspenders:
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  // ─── Parse & validate ─────────────────────────────────────
  let body: {
    email?: string
    actor_type?: string
    organization_id?: string
    metadata?: Record<string, unknown>
  }

  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { email, actor_type, organization_id, metadata } = body

  if (!email || !actor_type || !organization_id) {
    return json(
      { error: "email, actor_type, and organization_id are required" },
      { status: 400 },
    )
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Invalid email format" }, { status: 400 })
  }

  // ─── Permission check: org.invite ─────────────────────────
  // Fetch caller's active actors, then check if ANY can invite
  // in the target org via can_actor_perform() RPC.
  //
  // can_actor_perform is SECURITY DEFINER — it reads
  // my_permissions (aggregated, deny-wins) and enforces:
  //   - JWT version = DB version (kill-switch)
  //   - Jurisdiction covers the target org (double-gate)
  //   - Deny precedence at all scope levels
  const { data: callerActors } = await supabase
    .from("actors")
    .select("id")
    .eq("profile_id", user.id)
    .eq("status", "active")

  if (!callerActors || callerActors.length === 0) {
    return json({ error: "No active actor found" }, { status: 403 })
  }

  let hasPermission = false
  for (const actor of callerActors) {
    const { data: allowed } = await supabase.rpc("can_actor_perform", {
      actor_uuid: actor.id,
      action_text: "org.invite",
      res_org: organization_id,
    })
    if (allowed === true) {
      hasPermission = true
      break
    }
  }

  if (!hasPermission) {
    return json(
      { error: "You do not have permission to send invites for this organization" },
      { status: 403 },
    )
  }

  // ─── Validate actor_type ──────────────────────────────────
  const { data: roleRow } = await supabaseServiceRole
    .from("roles")
    .select("id")
    .eq("id", actor_type)
    .single()

  if (!roleRow) {
    return json(
      { error: `Invalid actor_type: ${actor_type}` },
      { status: 400 },
    )
  }

  // ─── Validate organization ────────────────────────────────
  const { data: orgRow } = await supabaseServiceRole
    .from("organizations")
    .select("id, name")
    .eq("id", organization_id)
    .single()

  if (!orgRow) {
    return json({ error: "Organization not found" }, { status: 404 })
  }

  // ─── Duplicate check ──────────────────────────────────────
  const { data: existing } = await supabaseServiceRole
    .from("invite_tokens")
    .select("token, expires_at")
    .eq("organization_id", organization_id)
    .eq("actor_type", actor_type)
    .eq("used", false)
    .filter("metadata->>email", "eq", email)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  if (existing) {
    return json(
      {
        error: "A pending invite already exists for this email and role",
        existing_token: existing.token,
        expires_at: existing.expires_at,
      },
      { status: 409 },
    )
  }

  // ─── Create invite token ──────────────────────────────────
  // Service role: invite_tokens has no INSERT policy by design
  // (contact_requests pattern — server-only writes).
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString()

  const { data: invite, error: insertError } = await supabaseServiceRole
    .from("invite_tokens")
    .insert({
      created_by: user.id,
      organization_id,
      actor_type,
      metadata: {
        email,
        invited_by_name: user.user_metadata?.full_name ?? "Unknown",
        ...(metadata ?? {}),
      },
      expires_at: expiresAt,
    })
    .select("token, expires_at, created_at")
    .single()

  if (insertError || !invite) {
    console.error("[api/invite] Insert failed:", insertError)
    return json({ error: "Failed to create invite" }, { status: 500 })
  }

  // ─── Send invite email ────────────────────────────────────
  // inviteUserByEmail creates the user if new, or sends a
  // login link if they exist. The redirect URL includes the
  // invite token for the auth callback to redeem.
  const appUrl = url.origin
  const inviteLink = `${appUrl}/login/sign_in?invite=${invite.token}`

  try {
    const { error: emailError } =
      await supabaseServiceRole.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${appUrl}/auth/callback?invite=${invite.token}`,
        data: {
          invite_token: invite.token,
          organization_name: orgRow.name,
          actor_type,
        },
      })

    if (emailError) {
      console.warn("[api/invite] Supabase invite email failed:", emailError)
      return json({
        status: "created",
        token: invite.token,
        expires_at: invite.expires_at,
        invite_link: inviteLink,
        email_sent: false,
        email_error: emailError.message,
        note: "User may already have an account. Share the invite link directly.",
      })
    }

    // Audit
    await supabaseServiceRole.from("audit_logs").insert({
      event_type: "INVITE_SENT",
      profile_id: user.id,
      performed_by: user.id,
      details: {
        invite_token: invite.token,
        email,
        actor_type,
        organization_id,
        organization_name: orgRow.name,
      },
    })

    return json({
      status: "sent",
      token: invite.token,
      expires_at: invite.expires_at,
      invite_link: inviteLink,
      email_sent: true,
    })
  } catch (err) {
    console.error("[api/invite] Email send failed:", err)
    return json({
      status: "created",
      token: invite.token,
      expires_at: invite.expires_at,
      invite_link: inviteLink,
      email_sent: false,
      note: "Invite created but email delivery failed. Share the link manually.",
    })
  }
}

/* ============================================================
   GET /api/invite?org=UUID
   List invites visible to the current user.

   RLS handles visibility:
     - invite_tokens_select_creator: created_by = auth.uid()
     - invite_tokens_select_org: org.manage at org scope
   So this endpoint just queries — no manual permission check needed.
============================================================ */
export const GET: RequestHandler = async ({
  url: reqUrl,
  locals: { supabase, session },
}) => {
  if (!session) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = reqUrl.searchParams.get("org")

  let query = supabase
    .from("invite_tokens")
    .select(
      "token, organization_id, actor_type, metadata, expires_at, used, used_by, used_at, created_at",
    )
    .order("created_at", { ascending: false })

  if (orgId) {
    query = query.eq("organization_id", orgId)
  }

  const { data, error } = await query

  if (error) {
    console.error("[api/invite] List failed:", error)
    return json({ error: "Failed to fetch invites" }, { status: 500 })
  }

  const now = new Date()
  const enriched = (data ?? []).map((inv) => {
    // Safely extract email from Json metadata
    const meta =
      inv.metadata &&
      typeof inv.metadata === "object" &&
      !Array.isArray(inv.metadata)
        ? (inv.metadata as Record<string, unknown>)
        : {}

    return {
      token: inv.token,
      organization_id: inv.organization_id,
      actor_type: inv.actor_type,
      email: (meta.email as string) ?? null,
      invited_by: (meta.invited_by_name as string) ?? null,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
      status: inv.used
        ? "accepted"
        : new Date(inv.expires_at) < now
          ? "expired"
          : "pending",
    }
  })

  return json({ invites: enriched })
}

/* ============================================================
   DELETE /api/invite?token=UUID
   Revoke a pending invite.

   Authorization: creator OR org.manage for the invite's org.
============================================================ */
export const DELETE: RequestHandler = async ({
  url: reqUrl,
  locals: { supabase, supabaseServiceRole, session, user },
}) => {
  if (!session || !user) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = reqUrl.searchParams.get("token")
  if (!token) {
    return json({ error: "token parameter required" }, { status: 400 })
  }

  // Fetch via service role (RLS SELECT might not cover all callers)
  const { data: invite } = await supabaseServiceRole
    .from("invite_tokens")
    .select("token, organization_id, created_by, used, metadata")
    .eq("token", token)
    .single()

  if (!invite) {
    return json({ error: "Invite not found" }, { status: 404 })
  }

  if (invite.used) {
    return json(
      { error: "Cannot revoke an already-used invite" },
      { status: 400 },
    )
  }

  // Authorization: creator OR org.manage
  const isCreator = invite.created_by === user.id

  if (!isCreator) {
    const { data: callerActors } = await supabase
      .from("actors")
      .select("id")
      .eq("profile_id", user.id)
      .eq("status", "active")

    let canManage = false
    for (const actor of callerActors ?? []) {
      const { data: allowed } = await supabase.rpc("can_actor_perform", {
        actor_uuid: actor.id,
        action_text: "org.manage",
        res_org: invite.organization_id ?? "",
      })
      if (allowed === true) {
        canManage = true
        break
      }
    }

    if (!canManage) {
      return json({ error: "Permission denied" }, { status: 403 })
    }
  }

  // Safely extract existing metadata
  const existingMeta =
    invite.metadata &&
    typeof invite.metadata === "object" &&
    !Array.isArray(invite.metadata)
      ? (invite.metadata as Record<string, unknown>)
      : {}

  // Soft-revoke: mark used with revocation context
  const { error: revokeError } = await supabaseServiceRole
    .from("invite_tokens")
    .update({
      used: true,
      used_at: new Date().toISOString(),
      metadata: {
        ...existingMeta,
        revoked: true,
        revoked_by: user.id,
        revoked_at: new Date().toISOString(),
      },
    })
    .eq("token", token)

  if (revokeError) {
    console.error("[api/invite] Revoke failed:", revokeError)
    return json({ error: "Failed to revoke invite" }, { status: 500 })
  }

  // Audit
  await supabaseServiceRole.from("audit_logs").insert({
    event_type: "INVITE_REVOKED",
    profile_id: user.id,
    performed_by: user.id,
    details: {
      invite_token: token,
      organization_id: invite.organization_id,
    },
  })

  return json({ status: "revoked" })
}