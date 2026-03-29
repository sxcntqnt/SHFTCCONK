// src/routes/admin/hyperledger/+page.server.ts

import { redirect }              from '@sveltejs/kit'
import type { PageServerLoad }   from './$types'
import { listIdentities, loadIdentity } from '$lib/hyperledger/vault'
import { getLedgerStats }        from './utils/queries'
import { ACTOR_TYPES }           from '$lib/features/auth/contexts/context.template'

export const load: PageServerLoad = async ({ locals }) => {
  const { userState, supabase } = locals

  // ── Gate ──────────────────────────────────────────────────────────────────
  if (!userState) throw redirect(303, '/login')

  const isAdmin = userState.activeContexts.some(
    ctx =>
      [ACTOR_TYPES.SUPER_ADMIN, ACTOR_TYPES.ADMIN].includes(
        ctx.type as typeof ACTOR_TYPES.SUPER_ADMIN
      ) && ctx.status === 'active'
  )
  if (!isAdmin) throw redirect(303, '/admin/dashboard')

  // ── Queue summary — the new data admins need ───────────────────────────────
  const [
    vaultIds,
    queueSummaryResult,
    exhaustedResult,
  ] = await Promise.all([
    listIdentities(),

    // Count by status for the dashboard stat cards
    supabase
      .from('hyperledger_enrollment_queue')
      .select('status')
      .in('status', ['pending', 'retrying', 'success', 'exhausted', 'failed']),

    // Recent exhausted items — need admin attention
    supabase
      .from('hyperledger_enrollment_queue')
      .select(`
        id, actor_id, profile_id, intent, event_name,
        attempts, last_error, created_at,
        profiles ( full_name ),
        actors ( type, status )
      `)
      .eq('status', 'exhausted')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // ── Vault identities ───────────────────────────────────────────────────────
  const identities = (
    await Promise.all(vaultIds.map(id => loadIdentity(id)))
  )
    .filter(Boolean)
    .map(id => ({
      userId:     id!.userId,
      mspId:      id!.mspId,
      attributes: id!.attributes,
      enrolledAt: id!.enrolledAt,
      revoked:    id!.revoked ?? false,
    }))

  // ── Ledger stats ───────────────────────────────────────────────────────────
  let ledgerStats: Record<string, unknown> | null = null
  try {
    const res = await getLedgerStats()
    if (res.success) ledgerStats = res.data as Record<string, unknown>
  } catch {
    // peer unreachable — dashboard degrades gracefully
  }

  // ── Queue stat counts ──────────────────────────────────────────────────────
  const queueRows   = queueSummaryResult.data ?? []
  const queueCounts = queueRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  const active  = identities.filter(i => !i.revoked)
  const revoked = identities.filter(i => i.revoked)
  const byRole  = active.reduce<Record<string, number>>((acc, id) => {
    const role = id.attributes?.role ?? 'unknown'
    acc[role]  = (acc[role] ?? 0) + 1
    return acc
  }, {})

  return {
    identities: identities.slice(0, 10),
    stats: {
      total:   identities.length,
      active:  active.length,
      revoked: revoked.length,
      byRole,
    },
    ledgerStats,
    // NEW: queue visibility
    queueStats: {
      pending:   (queueCounts.pending   ?? 0) + (queueCounts.retrying ?? 0),
      success:   queueCounts.success    ?? 0,
      exhausted: queueCounts.exhausted  ?? 0,
    },
    exhaustedItems: exhaustedResult.data ?? [],
  }
}