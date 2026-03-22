/**
 * src/routes/(auth)/admin/users/+page.server.ts
 *
 * ADMIN FUNCTIONS FOR USERS:
 *   1. update_profile     — edit full_name, company_name
 *   2. send_verification  — trigger OTP (SMS via Africa's Talking)
 *                           or magic link (email via Supabase)
 *   3. deactivate_actor   — active → inactive
 *   4. reactivate_actor   — inactive → active
 *
 * ACTOR LIFECYCLE:
 *   Sign up → GUEST actor, status = 'unverified'
 *   Admin reviews name + phone + email
 *   Admin sends OTP (SMS) or magic link (email)
 *   User enters OTP at /verify OR clicks email link
 *   → actor.status = 'active'
 *   → bootstrap_session() returns actor
 *   → user can join SACCO
 *
 * SMS PATH:
 *   Admin picks phone → 6-digit OTP generated →
 *   hash stored in actor_verification_tokens →
 *   Africa's Talking sends SMS →
 *   user goes to /verify → enters code → verified
 *
 * EMAIL PATH:
 *   Admin picks email → opaque token generated →
 *   hash stored in actor_verification_tokens →
 *   Supabase sends magic link to /verify?token=<raw> →
 *   user clicks link → auto-verified
 *
 * ENV VARS REQUIRED:
 *   AT_API_KEY     — Africa's Talking API key
 *   AT_USERNAME    — Africa's Talking username (sandbox = "sandbox")
 *   AT_SENDER_ID   — optional alphanumeric sender ID e.g. "SXCNTQNT"
 *   AT_PUBLIC_APP_URL — your app base URL e.g. https://sxcntqnt.com
 */

import type { PageServerLoad, Actions } from './$types'
import { fail, redirect }               from '@sveltejs/kit'
import { createHash, randomBytes }       from 'crypto'
import { AT_API_KEY, AT_USERNAME }       from '$env/static/private'
import { AT_PUBLIC_APP_URL }                from '$env/static/public'

/* ============================================================
   LOAD
============================================================ */
export const load: PageServerLoad = async ({ locals, url }) => {
  const { supabase } = locals

  const justUpdated      = url.searchParams.get('updated')      === '1'
  const justSentSms      = url.searchParams.get('sent_sms')     === '1'
  const justSentEmail    = url.searchParams.get('sent_email')   === '1'
  const justActorUpdated = url.searchParams.get('actor_updated')=== '1'

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name, company_name, avatar_url, unsubscribed, permissions_version, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (pErr) console.error('[users] profiles load error:', pErr)

  const profileList = profiles ?? []
  const profileIds  = profileList.map((p) => p.id)
  let actorsByProfile: Record<string, any[]> = {}

  if (profileIds.length > 0) {
    const { data: actors, error: aErr } = await supabase
      .from('actors')
      .select('id, type, status, profile_id, created_at, metadata')
      .in('profile_id', profileIds)
      .order('created_at', { ascending: true })

    if (aErr) console.error('[users] actors error:', aErr)
    for (const a of actors ?? []) {
      if (!actorsByProfile[a.profile_id]) actorsByProfile[a.profile_id] = []
      actorsByProfile[a.profile_id].push(a)
    }
  }

  let orgMembershipsByProfile: Record<string, any[]> = {}
  const allActorIds = Object.values(actorsByProfile).flat().map((a: any) => a.id)

  if (allActorIds.length > 0) {
    const { data: memberships, error: mErr } = await supabase
      .from('organization_members')
      .select('actor_id, organization_id, role, organizations ( name )')
      .in('actor_id', allActorIds)

    if (mErr) console.error('[users] memberships error:', mErr)

    const actorToProfile: Record<string, string> = {}
    for (const [pid, actors] of Object.entries(actorsByProfile))
      for (const a of actors as any[]) actorToProfile[a.id] = pid

    for (const m of memberships ?? []) {
      const pid = actorToProfile[m.actor_id]
      if (!pid) continue
      if (!orgMembershipsByProfile[pid]) orgMembershipsByProfile[pid] = []
      orgMembershipsByProfile[pid].push(m)
    }
  }

  const unverifiedCount = Object.values(actorsByProfile)
    .flat()
    .filter((a: any) => a.status === 'unverified').length

  return {
    profiles: profileList,
    actorsByProfile,
    orgMembershipsByProfile,
    unverifiedCount,
    justUpdated,
    justSentSms,
    justSentEmail,
    justActorUpdated,
  }
}

/* ============================================================
   HELPERS
============================================================ */
async function _requireAdmin(locals: App.Locals): Promise<boolean> {
  const { supabase, user } = locals
  if (!user) return false
  const { data } = await supabase
    .from('actors').select('id')
    .eq('profile_id', user.id)
    .in('type', ['ADMIN', 'SUPER_ADMIN'])
    .eq('status', 'active').limit(1)
  return !!(data?.length)
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

async function sendAtSms(phone: string, message: string): Promise<void> {
  const body = new URLSearchParams({ username: AT_USERNAME, to: phone, message })
  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      apiKey: AT_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  })
  if (!res.ok) throw new Error(`AT error: ${res.status} ${await res.text()}`)
  const json = await res.json()
  const failed = (json?.SMSMessageData?.Recipients ?? []).filter((r: any) => r.status !== 'Success')
  if (failed.length) throw new Error(`SMS failed for: ${failed.map((r: any) => r.number).join(', ')}`)
}

/* ============================================================
   ACTIONS
============================================================ */
export const actions: Actions = {

  /* ── 1. Edit profile ─────────────────────────────────────── */
  update_profile: async ({ request, locals }) => {
    const { supabase } = locals
    if (!(await _requireAdmin(locals))) return fail(403, { error: 'Admin access required' })

    const form         = await request.formData()
    const id           = (form.get('id')           as string)?.trim()
    const full_name    = (form.get('full_name')    as string)?.trim() || null
    const company_name = (form.get('company_name') as string)?.trim() || null

    if (!id) return fail(400, { error: 'Missing profile id' })

    const { error } = await supabase
      .from('profiles')
      .update({ full_name, company_name, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return fail(500, { error: error.message })
    throw redirect(303, '/admin/users?updated=1')
  },

  /* ── 2. Send verification ────────────────────────────────── */
  send_verification: async ({ request, locals }) => {
    const { supabase, user } = locals
    if (!(await _requireAdmin(locals))) return fail(403, { error: 'Admin access required' })

    const form     = await request.formData()
    const actor_id = (form.get('actor_id')    as string)?.trim()
    const method   = (form.get('method')      as 'sms' | 'email')
    const dest     = (form.get('destination') as string)?.trim()

    if (!actor_id) return fail(400, { error: 'Missing actor id' })
    if (!method || !['sms', 'email'].includes(method))
      return fail(400, { error: 'Method must be sms or email' })
    if (!dest) return fail(400, { error: `Missing ${method === 'sms' ? 'phone number' : 'email address'}` })

    // Phone validation for SMS (Kenya numbers)
    if (method === 'sms' && !/^(\+?254|0)[17]\d{8}$/.test(dest.replace(/\s/g, ''))) {
      return fail(400, { error: 'Invalid phone number. Use: 0712345678 or +254712345678' })
    }

    // Actor must exist and be unverified
    const { data: actor } = await supabase
      .from('actors').select('id, status, profile_id').eq('id', actor_id).single()

    if (!actor)                      return fail(404, { error: 'Actor not found' })
    if (actor.status === 'active')   return fail(409, { error: 'Actor is already verified' })
    if (actor.status === 'inactive') return fail(409, { error: 'Actor is deactivated — reactivate first' })

    // Invalidate any previous token for this actor + method
    await supabase.from('actor_verification_tokens')
      .delete().eq('actor_id', actor_id).eq('method', method)

    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    // ── SMS ───────────────────────────────────────────────────
    if (method === 'sms') {
      const otp  = generateOtp()
      const hash = hashToken(otp)

      const { error: insertErr } = await supabase
        .from('actor_verification_tokens')
        .insert({ actor_id, profile_id: actor.profile_id, method: 'sms', token_hash: hash, destination: dest, expires_at: expires })

      if (insertErr) return fail(500, { error: 'Could not create verification record' })

      try {
        await sendAtSms(dest, `Your sxcntqnt verification code is: ${otp}\n\nExpires in 15 minutes. Do not share.`)
      } catch (err) {
        await supabase.from('actor_verification_tokens').delete().eq('actor_id', actor_id).eq('method', 'sms')
        return fail(502, { error: `SMS failed: ${(err as Error).message}` })
      }

      await supabase.from('audit_logs').insert({
        event_type: 'verification_sent_sms', actor_id, profile_id: actor.profile_id,
        performed_by: user?.id, details: { phone: dest.slice(0, 6) + '****' },
      })

      throw redirect(303, '/admin/users?sent_sms=1')
    }

    // ── EMAIL ─────────────────────────────────────────────────
    const rawToken  = generateToken()
    const tokenHash = hashToken(rawToken)

    const { error: insertErr } = await supabase
      .from('actor_verification_tokens')
      .insert({ actor_id, profile_id: actor.profile_id, method: 'email', token_hash: tokenHash, destination: dest, expires_at: expires })

    if (insertErr) return fail(500, { error: 'Could not create verification record' })

    const verifyUrl = `${PUBLIC_APP_URL}/verify?token=${rawToken}&method=email`

    // Try admin generateLink first, fall back to signInWithOtp
    const { error: linkErr } = await (supabase.auth as any).admin?.generateLink?.({
      type: 'magiclink', email: dest, options: { redirectTo: verifyUrl },
    }) ?? { error: new Error('generateLink not available') }

    if (linkErr) {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: dest, options: { emailRedirectTo: verifyUrl },
      })
      if (otpErr) {
        await supabase.from('actor_verification_tokens').delete().eq('actor_id', actor_id).eq('method', 'email')
        return fail(502, { error: `Email failed: ${otpErr.message}` })
      }
    }

    await supabase.from('audit_logs').insert({
      event_type: 'verification_sent_email', actor_id, profile_id: actor.profile_id,
      performed_by: user?.id, details: { email: dest },
    })

    throw redirect(303, '/admin/users?sent_email=1')
  },

  /* ── 3. Deactivate actor ─────────────────────────────────── */
  deactivate_actor: async ({ request, locals }) => {
    const { supabase, user } = locals
    if (!(await _requireAdmin(locals))) return fail(403, { error: 'Admin access required' })

    const actor_id = ((await request.formData()).get('actor_id') as string)?.trim()
    if (!actor_id) return fail(400, { error: 'Missing actor id' })

    const { data: actor } = await supabase
      .from('actors').select('id, type, status, profile_id').eq('id', actor_id).single()
    if (!actor) return fail(404, { error: 'Actor not found' })

    if (actor.type === 'SUPER_ADMIN' && actor.profile_id === user?.id)
      return fail(400, { error: 'Cannot deactivate your own SUPER_ADMIN actor' })

    await supabase.from('actors').update({ status: 'inactive' }).eq('id', actor_id)
    await supabase.from('audit_logs').insert({
      event_type: 'actor_deactivated', actor_id, profile_id: actor.profile_id,
      performed_by: user?.id, details: { actor_type: actor.type },
    })

    throw redirect(303, '/admin/users?actor_updated=1')
  },

  /* ── 4. Reactivate actor ─────────────────────────────────── */
  reactivate_actor: async ({ request, locals }) => {
    const { supabase, user } = locals
    if (!(await _requireAdmin(locals))) return fail(403, { error: 'Admin access required' })

    const actor_id = ((await request.formData()).get('actor_id') as string)?.trim()
    if (!actor_id) return fail(400, { error: 'Missing actor id' })

    const { data: actor } = await supabase
      .from('actors').select('id, type, profile_id').eq('id', actor_id).single()
    if (!actor) return fail(404, { error: 'Actor not found' })

    await supabase.from('actors').update({ status: 'active' }).eq('id', actor_id)
    await supabase.from('audit_logs').insert({
      event_type: 'actor_reactivated', actor_id, profile_id: actor.profile_id,
      performed_by: user?.id, details: { actor_type: actor.type },
    })

    throw redirect(303, '/admin/users?actor_updated=1')
  },
}