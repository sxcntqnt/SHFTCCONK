import { createSupabaseServerClient } from "$lib/server/db"
import { redis } from "$lib/server/redis"

import type { Database } from "$lib/types/supabase"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface LedgerGateStatus {
  org_id: string
  current_month_anchors: number
  free_tier_cap: number
  is_gated: boolean
  anchors_remaining: number
  reset_date: string
  subscription_tier: "FREE" | "STARTER" | "PRO" | "BUSINESS"
  per_event_eligible: boolean
}

const FREE_TIER_CAP = 5
const TIER_CAPS: Record<string, number> = {
  FREE: 5,
  STARTER: 30,
  PRO: 150,
  BUSINESS: Number.POSITIVE_INFINITY,
}

// ✅ Pass supabase client in (BEST PRACTICE)
export async function getLedgerGateStatus(
  supabase: SupabaseClient<Database>,
  orgId: string,
): Promise<LedgerGateStatus> {
  const cached = await redis.get(`ledger_gate:${orgId}`)
  if (cached) return JSON.parse(cached)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  // ✅ Supabase queries
  const [orgRes, anchorRes] = await Promise.all([
    supabase
      .from("organisations")
      .select("subscription_tier, mpesa_account_linked")
      .eq("id", orgId)
      .single(),

    supabase
      .from("fleet_bookings")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "LEDGER_ANCHORED")
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString()),
  ])

  const org = orgRes.data
  const anchorCount = anchorRes.count ?? 0

  const tier = (org?.subscription_tier ?? "FREE") as keyof typeof TIER_CAPS
  const cap = TIER_CAPS[tier] ?? FREE_TIER_CAP
  const isGated = anchorCount >= cap

  const status: LedgerGateStatus = {
    org_id: orgId,
    current_month_anchors: anchorCount,
    free_tier_cap: cap,
    is_gated: isGated,
    anchors_remaining: Math.max(0, cap - anchorCount),
    reset_date: monthEnd.toISOString(),
    subscription_tier: tier,
    per_event_eligible: !!org?.mpesa_account_linked,
  }

  await redis.set(`ledger_gate:${orgId}`, JSON.stringify(status), { ex: 300 })
  return status
}

export async function assertLedgerNotGated(
  supabase: SupabaseClient<Database>,
  orgId: string,
  bookingFareKes: number | null,
): Promise<{
  permitted: boolean
  route: "SUBSCRIPTION" | "PER_EVENT" | "BLOCKED"
}> {
  const gate = await getLedgerGateStatus(supabase, orgId)

  if (!gate.is_gated) return { permitted: true, route: "SUBSCRIPTION" }

  if (gate.per_event_eligible && bookingFareKes && bookingFareKes > 0) {
    return { permitted: true, route: "PER_EVENT" }
  }

  return { permitted: false, route: "BLOCKED" }
}