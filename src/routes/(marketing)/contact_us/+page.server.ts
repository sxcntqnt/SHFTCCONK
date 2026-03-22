import { fail } from "@sveltejs/kit"
import type { Actions } from "./$types"

import { contactSchema } from "$lib/security/contact.schema"
import { verifyTurnstile } from "$lib/security/verifyTurnstile"
import { escapeHtml } from "$lib/security/sanitize"
import { rateLimit } from "$lib/security/rateLimit"
import { preventDuplicate } from "$lib/security/dedupe"
import { logSecurityEvent } from "$lib/utils/logger"
import { sendAdminEmail } from "$lib/mailer"
import { getPostHogClient } from "$lib/server/posthog"

export const actions: Actions = {
  default: async ({
    request,
    locals: { supabaseServiceRole },
    getClientAddress,
  }) => {
    const ip = getClientAddress()
    const formData = await request.formData()

    // ─────────────────────────────
    // 1. Honeypot
    // ─────────────────────────────
    if (formData.get("website")) {
      return { success: true }
    }

    // ─────────────────────────────
    // 2. Rate limiting
    // ─────────────────────────────
    const allowed = await rateLimit(ip)
    if (!allowed) {
      return fail(429, { error: "Too many requests" })
    }

    // ─────────────────────────────
    // 3. Cloudflare Turnstile
    // ─────────────────────────────
    const token = formData.get("cf-turnstile-response")?.toString() ?? ""

    let captchaValid = false

    try {
      captchaValid = await verifyTurnstile(token, ip)
    } catch (err) {
      logSecurityEvent("INVALID_RECAPTCHA", {
        provider: "turnstile",
        ip,
        reason: "verification_error",
      })
    }

    if (!captchaValid) {
      return fail(400, {
        error: "Security verification failed.",
      })
    }

    // ─────────────────────────────
    // 4. Extract & validate
    // ─────────────────────────────
    const raw = {
      first: formData.get("first")?.toString().trim() ?? "",
      last: formData.get("last")?.toString().trim() ?? "",
      email: formData.get("email")?.toString().trim() ?? "",
      phone: formData.get("phone")?.toString().trim() ?? "",
      org: formData.get("org")?.toString().trim() ?? "",
      type: formData.get("type")?.toString().trim() ?? "",
      message: formData.get("message")?.toString().trim() ?? "",
    }

    const parsed = contactSchema.safeParse(raw)

    if (!parsed.success) {
      logSecurityEvent("VALIDATION_FAILURE", { ip })
      return fail(400, {
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    // ─────────────────────────────
    // 5. Duplicate protection
    // ─────────────────────────────
    const notDuplicate = await preventDuplicate(ip, parsed.data.email)
    if (!notDuplicate) {
      return fail(429, { error: "Duplicate submission detected" })
    }

    // ─────────────────────────────
    // 6. Sanitize before storage
    // ─────────────────────────────
    const sanitized = {
      ...parsed.data,
      message: escapeHtml(parsed.data.message),
      first: escapeHtml(parsed.data.first),
      last: escapeHtml(parsed.data.last),
      org: escapeHtml(parsed.data.org ?? ""),
    }

    // ─────────────────────────────
    // 7. Database insert
    // ─────────────────────────────
    const { error } = await supabaseServiceRole
      .from("contact_requests")
      .insert({
        ...sanitized,
        ip_address: ip,
        created_at: new Date().toISOString(),
      })

    if (error) {
      logSecurityEvent("PAYLOAD_BLOCKED", { ip, error })
      return fail(500, { error: "Database error" })
    }

    // ─────────────────────────────
    // 8. Admin notification
    // ─────────────────────────────
    try {
      await sendAdminEmail({
        subject: `New Contact – ${sanitized.first} ${sanitized.last}`,
        body: JSON.stringify({ ...sanitized, ip }, null, 2),
      })
    } catch {
      // Email failure should never block user
    }

    // ─────────────────────────────
    // 9. PostHog — track lead
    // ─────────────────────────────
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: sanitized.email,
        event: "contact_form_submitted",
        properties: {
          contact_type: sanitized.type || "unknown",
          has_org: Boolean(sanitized.org),
          has_phone: Boolean(sanitized.phone),
        },
      })
      await posthog.flush()
    } catch {
      // Analytics failure should never block user
    }

    return { success: true }
  },
}
