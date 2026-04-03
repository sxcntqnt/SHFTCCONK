/**
 * src/routes/verify/+page.server.ts
 *
 * HANDLES BOTH VERIFICATION PATHS:
 *
 *   EMAIL PATH (auto):
 *     User clicks magic link → arrives at /verify?token=<raw>&method=email
 *     load() detects token + method=email → auto-verifies → redirects to /app
 *
 *   SMS PATH (manual):
 *     User navigates to /verify (or is sent there) → sees OTP entry form
 *     User submits 6-digit code → ?/verify action → verified → redirects to /app
 *
 * WHAT VERIFICATION DOES:
 *   1. Finds actor_verification_tokens row by SHA-256(submitted token/OTP)
 *   2. Checks not expired, not already used
 *   3. Sets actor.status = 'active'
 *   4. Marks token row used_at = now()
 *   5. Writes audit log
 *   6. Redirects to /app (or /org/select if they have org access)
 *
 * PUBLIC ROUTE — no auth required. User may not even be logged in
 * (magic link case). The token itself is the auth.
 */

import type { PageServerLoad, Actions } from "./$types"
import { fail, redirect } from "@sveltejs/kit"
import { createHash } from "crypto"

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

/* ============================================================
   LOAD — auto-verify email tokens
============================================================ */
export const load: PageServerLoad = async ({ url, locals }) => {
  const { supabase } = locals

  const token = url.searchParams.get("token")
  const method = url.searchParams.get("method")

  // ── EMAIL AUTO-VERIFY ────────────────────────────────────────
  // If both params present and method=email, verify immediately
  if (token && method === "email") {
    const tokenHash = hashToken(token)

    const { data: record } = await supabase
      .from("actor_verification_tokens")
      .select("id, actor_id, profile_id, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .eq("method", "email")
      .single()

    if (!record) {
      return {
        mode: "email_error",
        error: "This verification link is invalid or has already been used.",
      }
    }

    if (record.used_at) {
      return {
        mode: "email_error",
        error: "This verification link has already been used.",
      }
    }

    if (new Date(record.expires_at) < new Date()) {
      return {
        mode: "email_error",
        error:
          "This verification link has expired. Ask your admin to send a new one.",
      }
    }

    // ── Activate actor ──────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from("actors")
      .update({ status: "active" })
      .eq("id", record.actor_id)

    if (updateErr) {
      console.error("[verify] actor update error:", updateErr)
      return {
        mode: "email_error",
        error: "Verification failed. Please try again.",
      }
    }

    // Mark token used
    await supabase
      .from("actor_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", record.id)

    // Audit
    await supabase.from("audit_logs").insert({
      event_type: "actor_verified_email",
      actor_id: record.actor_id,
      profile_id: record.profile_id,
      details: { method: "email" },
    })

    // Redirect to app — they're now verified
    throw redirect(303, "/app?verified=1")
  }

  // ── SMS FORM ─────────────────────────────────────────────────
  // No token in URL → show the OTP entry form
  return { mode: "sms_form", error: null }
}

/* ============================================================
   ACTIONS — SMS OTP submission
============================================================ */
export const actions: Actions = {
  verify: async ({ request, locals }) => {
    const { supabase } = locals
    const form = await request.formData()

    // User may submit their profile_id to scope the lookup,
    // or we find by OTP hash alone (safe since OTP is 6 digits + 15min expiry)
    const otp = (form.get("otp") as string)?.trim().replace(/\s/g, "")
    const profile_id = (form.get("profile_id") as string)?.trim() || null

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return fail(400, { error: "Enter the 6-digit code from your SMS." })
    }

    const tokenHash = hashToken(otp)

    // Find matching token — scope by profile_id if provided for extra safety
    let query = supabase
      .from("actor_verification_tokens")
      .select("id, actor_id, profile_id, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .eq("method", "sms")

    if (profile_id) query = query.eq("profile_id", profile_id)

    const { data: record } = await query.single()

    if (!record) {
      return fail(400, {
        error: "Incorrect code. Check your SMS and try again.",
      })
    }

    if (record.used_at) {
      return fail(400, { error: "This code has already been used." })
    }

    if (new Date(record.expires_at) < new Date()) {
      return fail(400, {
        error: "This code has expired. Ask your admin to send a new one.",
      })
    }

    // ── Activate actor ──────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from("actors")
      .update({ status: "active" })
      .eq("id", record.actor_id)

    if (updateErr) {
      console.error("[verify] actor update error:", updateErr)
      return fail(500, { error: "Verification failed. Please try again." })
    }

    // Mark token used
    await supabase
      .from("actor_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", record.id)

    // Audit
    await supabase.from("audit_logs").insert({
      event_type: "actor_verified_sms",
      actor_id: record.actor_id,
      profile_id: record.profile_id,
      details: { method: "sms" },
    })

    throw redirect(303, "/app?verified=1")
  },
}
