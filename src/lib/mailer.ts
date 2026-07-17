import { Resend } from "resend"
import { env } from "$env/dynamic/private"
import handlebars from "handlebars"
import { randomInt, createHash, timingSafeEqual } from "node:crypto"
import { withProfileContext } from "$lib/server/pg"

// Sends an email to the admin email address.
// Does not throw errors, but logs them.
export const sendAdminEmail = async ({
  subject,
  body,
}: {
  subject: string
  body: string
}) => {
  // Check admin email is setup
  if (!env.PRIVATE_ADMIN_EMAIL) {
    return
  }

  try {
    const resend = new Resend(env.PRIVATE_RESEND_API_KEY)
    const resp = await resend.emails.send({
      from: env.PRIVATE_FROM_ADMIN_EMAIL || env.PRIVATE_ADMIN_EMAIL,
      to: [env.PRIVATE_ADMIN_EMAIL],
      subject: "ADMIN_MAIL: " + subject,
      text: body,
    })

    if (resp.error) {
      console.log("Failed to send admin email, error:", resp.error)
    }
  } catch (e) {
    console.log("Failed to send admin email, error:", e)
  }
}

/**
 * Sends a templated email to a user, gated on two checks that used to go
 * through Supabase (auth.admin.getUserById() for verification status,
 * PostgREST for unsubscribed) — both now resolved directly against Neon.
 *
 * "Email verified" = there exists a used, method='email' row in
 * actor_verification_tokens whose destination matches the email being
 * sent to. That's a deliberate redefinition, not a 1:1 port of Supabase's
 * email_confirmed_at/email_verified flags — see the OTP shim below for
 * how that row gets created (verifyOtpCode marks used_at on success).
 * If a user changes their email, the old verified row's destination
 * won't match the new address, so this correctly requires re-verification
 * of the new address rather than carrying trust forward.
 *
 * profileId/actorId must already be resolved via a trusted path (same
 * invariant as pg.ts and the OTP functions below) — never pass values
 * straight from a request parameter.
 */
export const sendUserEmail = async ({
  profileId,
  actorId,
  email,
  subject,
  from_email,
  template_name,
  template_properties,
}: {
  profileId: string
  actorId: string
  email: string
  subject: string
  from_email: string
  template_name: string
  template_properties: Record<string, string>
}) => {
  if (!email) {
    console.log("No email for user. Aborting email. ", profileId)
    return
  }

  const { verified, unsubscribed } = await withProfileContext(
    profileId,
    async (tx) => {
      const [verifiedRow] = await tx<{ exists: boolean }[]>`
        select exists (
          select 1 from actor_verification_tokens
          where actor_id = ${actorId}
            and method = 'email'
            and destination = ${email}
            and used_at is not null
        ) as exists
      `

      const [profileRow] = await tx<{ unsubscribed: boolean | null }[]>`
        select unsubscribed from profiles where id = ${profileId}
      `

      return {
        verified: verifiedRow?.exists ?? false,
        unsubscribed: profileRow?.unsubscribed ?? false,
      }
    },
  )

  if (!verified) {
    console.log("User email not verified. Aborting email. ", profileId, email)
    return
  }

  if (unsubscribed) {
    console.log("User unsubscribed. Aborting email. ", profileId, email)
    return
  }

  await sendTemplatedEmail({
    subject,
    to_emails: [email],
    from_email,
    template_name,
    template_properties,
  })
}

export const sendTemplatedEmail = async ({
  subject,
  to_emails,
  from_email,
  template_name,
  template_properties,
}: {
  subject: string
  to_emails: string[]
  from_email: string
  template_name: string
  template_properties: Record<string, string>
}) => {
  if (!env.PRIVATE_RESEND_API_KEY) {
    // email not configured.  Emails are optional so no error is thrown
    return
  }

  let plaintextBody: string | undefined = undefined
  try {
    const textTemplate = await import(
      `./emails/${template_name}_text.hbs?raw`
    ).then((mod) => mod.default)
    const template = handlebars.compile(textTemplate)
    plaintextBody = template(template_properties)
  } catch {
    plaintextBody = undefined
  }

  let htmlBody: string | undefined = undefined
  try {
    const htmlTemplate = await import(
      `./emails/${template_name}_html.hbs?raw`
    ).then((mod) => mod.default)
    const template = handlebars.compile(htmlTemplate)
    htmlBody = template(template_properties)
  } catch {
    htmlBody = undefined
  }

  if (!plaintextBody && !htmlBody) {
    console.log(
      "No email body: requires plaintextBody or htmlBody. Template: ",
      template_name,
    )
    return
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const email: any = {
      from: from_email,
      to: to_emails,
      subject: subject,
    }
    if (plaintextBody) {
      email.text = plaintextBody
    }
    if (htmlBody) {
      email.html = htmlBody
    }
    const resend = new Resend(env.PRIVATE_RESEND_API_KEY)
    const resp = await resend.emails.send(email)

    if (resp.error) {
      console.log("Failed to send email, error:", resp.error)
    }
  } catch (e) {
    console.log("Failed to send email, error:", e)
  }
}


/* ════════════════════════════════════════════════════════════
   OTP VERIFICATION SHIM
   ════════════════════════════════════════════════════════════
   (unchanged — already Neon-native, see previous version's comment
   block for the full rationale)
════════════════════════════════════════════════════════════ */

const OTP_LENGTH = 6
const OTP_TTL_MINUTES = 15

type OtpMethod = "email" | "sms"

function generateOtpCode(): string {
  const min = 10 ** (OTP_LENGTH - 1)
  const max = 10 ** OTP_LENGTH
  return randomInt(min, max).toString()
}

function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex")
}

async function generateAndStoreOtp({
  profileId,
  actorId,
  method,
  destination,
}: {
  profileId: string
  actorId: string
  method: OtpMethod
  destination: string
}): Promise<string> {
  const code = generateOtpCode()
  const tokenHash = hashOtpCode(code)

  await withProfileContext(profileId, (tx) =>
    tx`
      insert into actor_verification_tokens
        (actor_id, profile_id, method, token_hash, destination, expires_at, used_at, created_at)
      values
        (${actorId}, ${profileId}, ${method}, ${tokenHash}, ${destination},
         now() + make_interval(mins => ${OTP_TTL_MINUTES}), null, now())
      on conflict (actor_id, method) do update
        set token_hash = excluded.token_hash,
            destination = excluded.destination,
            expires_at = excluded.expires_at,
            used_at = null,
            created_at = now()
    `,
  )

  return code
}

export async function sendOtpCode({
  profileId,
  actorId,
  email,
}: {
  profileId: string
  actorId: string
  email: string
}): Promise<{ sent: boolean }> {
  const code = await generateAndStoreOtp({
    profileId,
    actorId,
    method: "email",
    destination: email,
  })

  if (!env.PRIVATE_RESEND_API_KEY) {
    console.log("Email not configured — OTP stored but not sent for", email)
    return { sent: false }
  }

  await sendTemplatedEmail({
    subject: "Your verification code",
    to_emails: [email],
    from_email: env.PRIVATE_FROM_ADMIN_EMAIL || env.PRIVATE_ADMIN_EMAIL || "",
    template_name: "otp_code",
    template_properties: {
      code,
      expires_in_minutes: String(OTP_TTL_MINUTES),
    },
  })

  return { sent: true }
}

export async function verifyOtpCode({
  profileId,
  actorId,
  method,
  code,
}: {
  profileId: string
  actorId: string
  method: OtpMethod
  code: string
}): Promise<{ valid: boolean; reason?: "not_found" | "expired" | "used" | "mismatch" }> {
  return withProfileContext(profileId, async (tx) => {
    const [row] = await tx
      { token_hash: string; expires_at: Date; used_at: Date | null }[]
    >`
      select token_hash, expires_at, used_at
      from actor_verification_tokens
      where actor_id = ${actorId}
        and method = ${method}
    `

    if (!row) return { valid: false, reason: "not_found" as const }
    if (row.used_at) return { valid: false, reason: "used" as const }
    if (row.expires_at.getTime() < Date.now()) {
      return { valid: false, reason: "expired" as const }
    }

    const submittedHash = Buffer.from(hashOtpCode(code), "hex")
    const storedHash = Buffer.from(row.token_hash, "hex")
    const matches =
      submittedHash.length === storedHash.length &&
      timingSafeEqual(submittedHash, storedHash)

    if (!matches) return { valid: false, reason: "mismatch" as const }

    await tx`
      update actor_verification_tokens
      set used_at = now()
      where actor_id = ${actorId}
        and method = ${method}
    `

    return { valid: true }
  })
}
