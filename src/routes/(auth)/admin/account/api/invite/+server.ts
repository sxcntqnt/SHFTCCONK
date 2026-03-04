// src/routes/api/invite/+server.ts
//
// Invite Management — Federated Governance Edition
//
// Replaces the old flat invite system. Key differences:
//
//   OLD                              NEW
//   ───────────────────────────────   ──────────────────────────────────
//   Custom `db` helper               Supabase client (RLS-aware)
//   Flat role strings                 Actor types + policy groups
//   requirePermission('INVITE_OP')   can_actor_perform('org.invite')
//   POST_accept endpoint             Handled by redeem_invite() RPC
//   SHA256 password hashing          Supabase Auth (server-managed)
//   Manual user creation             auth.users + handle_new_user trigger
//
// Flow:
//   1. Admin/org-manager calls POST /api/invite with email + actor_type
//   2. Server verifies org.invite permission via RPC (user's JWT)
//   3. Server inserts into invite_tokens via service role (no INSERT RLS)
//   4. Server sends email with invite link
//   5. Recipient clicks link → /login/sign_in?invite=TOKEN
//   6. After auth, callback calls redeem_invite() RPC
//      → creates actor, jurisdiction, org membership, policy group binding
//
// There is no accept-invite endpoint. The auth callback + redeem_invite
// RPC handle everything atomically inside Postgres.

import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

// ─── POST /api/invite ──────────────────────────────────────────
// Create and send an invitation.
//
// Body: {
//   email: string          — recipient email
//   actor_type: string     — role to assign (DRIVER, CONDUCTOR, OWNER, etc.)
//   organization_id: string — target org UUID
//   metadata?: object      — optional extra data (department, notes, etc.)
// }
export const POST: RequestHandler = async ({
  request,
  locals: { supabase, supabaseServiceRole, session },
  url,
}) => {
  if (!session) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  // ─── Parse and validate input ─────────────────────────────
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

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Invalid email format" }, { status: 400 })
  }

  // ─── Verify caller has org.invite permission ──────────────
  // This uses the user-scoped client (their JWT), so the
  // permission check runs through the real engine:
  //   can_actor_perform → my_permissions → double-gate
  //
  // We check against the target org's scope to ensure the
  // caller has jurisdiction over THAT specific organization.
  const { data: actors } = await supabase
    .from("actors")
    .select("id")
    .eq("profile_id", session.user.id)
    .eq("status", "active")

  if (!actors || actors.length === 0) {
    return json({ error: "No active actor found" }, { status: 403 })
  }

  // Check if ANY of the caller's actors can invite in this org
  let hasPermission = false
  for (const actor of actors) {
    const { data: canInvite } = await supabase.rpc("can_actor_perform", {
      p_actor_id: actor.id,
      p_action: "org.invite",
      p_org_id: organization_id,
      p_branch_id: null,
      p_dept_id: null,
    })

    if (canInvite === true) {
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

  // ─── Validate actor_type exists in roles table ────────────
  const { data: roleExists } = await supabaseServiceRole
    .from("roles")
    .select("id")
    .eq("id", actor_type)
    .single()

  if (!roleExists) {
    return json(
      { error: `Invalid actor_type: ${actor_type}` },
      { status: 400 },
    )
  }

  // ─── Validate organization exists ─────────────────────────
  const { data: orgExists } = await supabaseServiceRole
    .from("organizations")
    .select("id, name")
    .eq("id", organization_id)
    .single()

  if (!orgExists) {
    return json(
      { error: "Organization not found" },
      { status: 404 },
    )
  }

  // ─── Check for existing pending invite ────────────────────
  // Prevent duplicate invites for same email + org + role
  const { data: existingInvite } = await supabaseServiceRole
    .from("invite_tokens")
    .select("token, expires_at")
    .eq("organization_id", organization_id)
    .eq("actor_type", actor_type)
    .eq("used", false)
    .filter("metadata->>email", "eq", email)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  if (existingInvite) {
    return json(
      {
        error: "A pending invite already exists for this email and role",
        existing_token: existingInvite.token,
        expires_at: existingInvite.expires_at,
      },
      { status: 409 },
    )
  }

  // ─── Create invite token ──────────────────────────────────
  // Uses service role because invite_tokens has no INSERT RLS
  // policy (by design — creation is server-only).
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() // 7 days

  const { data: invite, error: insertError } = await supabaseServiceRole
    .from("invite_tokens")
    .insert({
      created_by: session.user.id,
      organization_id,
      actor_type,
      metadata: {
        email,
        invited_by_name: session.user.user_metadata?.full_name ?? "Unknown",
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
  // The link goes to the login page with the invite token.
  // After signup/login, the auth callback picks up ?invite=TOKEN
  // and calls redeem_invite() RPC.
  const appUrl = url.origin
  const inviteLink = `${appUrl}/login/sign_in?invite=${invite.token}`

  try {
    // Use Supabase Auth admin to send a custom invite email
    // This is the recommended approach — Supabase handles
    // the magic link + redirect, and we pass the invite token
    // through the URL.
    //
    // Option A: Send via Supabase Auth (magic link invite)
    const { error: emailError } = await supabaseServiceRole.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${appUrl}/auth/callback?invite=${invite.token}`,
        data: {
          invite_token: invite.token,
          organization_name: orgExists.name,
          actor_type,
        },
      },
    )

    if (emailError) {
      // If Supabase email fails (user already exists, rate limit, etc.),
      // fall back to a simple notification approach
      console.warn("[api/invite] Supabase invite email failed:", emailError)

      // For existing users, we could send a custom email instead.
      // For now, return the invite link so the UI can handle it.
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

    // ─── Audit log ────────────────────────────────────────────
    await supabaseServiceRole.from("audit_logs").insert({
      event_type: "INVITE_SENT",
      profile_id: session.user.id,
      performed_by: session.user.id,
      details: {
        invite_token: invite.token,
        email,
        actor_type,
        organization_id,
        organization_name: orgExists.name,
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
    // Invite was created successfully, just email failed
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

// ─── GET /api/invite?org=UUID ──────────────────────────────────
// List invites visible to the current user.
// RLS handles visibility (creator sees own, org.manage sees org's).
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
    .select("token, organization_id, actor_type, metadata, expires_at, used, used_by, used_at, created_at")
    .order("created_at", { ascending: false })

  if (orgId) {
    query = query.eq("organization_id", orgId)
  }

  const { data, error } = await query

  if (error) {
    console.error("[api/invite] List failed:", error)
    return json({ error: "Failed to fetch invites" }, { status: 500 })
  }

  // Enrich with status for UI
  const now = new Date()
  const enriched = (data ?? []).map((inv) => ({
    ...inv,
    email: (inv.metadata as Record<string, unknown>)?.email ?? null,
    status: inv.used
      ? "accepted"
      : new Date(inv.expires_at) < now
        ? "expired"
        : "pending",
  }))

  return json({ invites: enriched })
}

// ─── DELETE /api/invite?token=UUID ─────────────────────────────
// Revoke a pending invite.
export const DELETE: RequestHandler = async ({
  url: reqUrl,
  locals: { supabase, supabaseServiceRole, session },
}) => {
  if (!session) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = reqUrl.searchParams.get("token")
  if (!token) {
    return json({ error: "token parameter required" }, { status: 400 })
  }

  // Fetch the invite to check ownership / org permission
  const { data: invite } = await supabaseServiceRole
    .from("invite_tokens")
    .select("token, organization_id, created_by, used")
    .eq("token", token)
    .single()

  if (!invite) {
    return json({ error: "Invite not found" }, { status: 404 })
  }

  if (invite.used) {
    return json({ error: "Cannot revoke an already-used invite" }, { status: 400 })
  }

  // Check: either the creator or someone with org.manage
  const isCreator = invite.created_by === session.user.id

  if (!isCreator) {
    // Check org.manage permission
    const { data: actors } = await supabase
      .from("actors")
      .select("id")
      .eq("profile_id", session.user.id)
      .eq("status", "active")

    let canManage = false
    for (const actor of actors ?? []) {
      const { data: result } = await supabase.rpc("can_actor_perform", {
        p_actor_id: actor.id,
        p_action: "org.manage",
        p_org_id: invite.organization_id,
        p_branch_id: null,
        p_dept_id: null,
      })
      if (result === true) {
        canManage = true
        break
      }
    }

    if (!canManage) {
      return json({ error: "Permission denied" }, { status: 403 })
    }
  }

  // Soft-revoke: mark as used with a revocation note
  const { error: revokeError } = await supabaseServiceRole
    .from("invite_tokens")
    .update({
      used: true,
      used_at: new Date().toISOString(),
      metadata: {
        ...(invite as Record<string, unknown>).metadata,
        revoked: true,
        revoked_by: session.user.id,
        revoked_at: new Date().toISOString(),
      } as unknown as Record<string, unknown>,
    })
    .eq("token", token)

  if (revokeError) {
    console.error("[api/invite] Revoke failed:", revokeError)
    return json({ error: "Failed to revoke invite" }, { status: 500 })
  }

  // Audit
  await supabaseServiceRole.from("audit_logs").insert({
    event_type: "INVITE_REVOKED",
    profile_id: session.user.id,
    performed_by: session.user.id,
    details: { invite_token: token, organization_id: invite.organization_id },
  })

  return json({ status: "revoked" })
}