// src/lib/server/revenue-config.ts
//
// Centralised revenue distribution config for Matatu Pulse.
//
// ── FEE MODEL ─────────────────────────────────────────────────────────────────
//
// RESERVATION FEE (KES 19 per seat booked via app):
//
//   Recipient            KES    Rate
//   ──────────────────   ────   ────────────────────────────────────────────────
//   Platform (sxcntqnt)  15    15/19 ≈ 78.95%   ← primary platform revenue
//   Driver                2     2/19 ≈ 10.53%   ← motivation: accept digital bookings
//   Conductor             2     2/19 ≈ 10.53%   ← motivation: manage boarding
//   ──────────────────   ────
//   Total                19    100%
//
//   NOTE: SACCO and owner do NOT receive a share of the reservation fee.
//   Their revenue comes entirely from the daily fare collection.
//   This is intentional — the reservation fee is a platform + crew incentive,
//   and SACCOs benefit indirectly through higher trip counts and better
//   seat utilisation that digital bookings enable.
//
// DAILY COLLECTION (fare revenue from passengers):
//
//   Base settlement (up to daily target):
//     SACCO levy    ~21%  (4/19 of base)
//     Owner          ~16%  (3/19 of base)
//     Driver          ~11%  (2/19 of base)
//     Conductor       ~11%  (2/19 of base)
//     Platform        ~42%  (10/19 of base — remainder after others)
//
//   Excess above target:
//     Driver          10%
//     Conductor       10%
//     Platform        80%
//
// TIPS:
//   Driver          10%
//   Conductor       10%
//   Platform        80%

// ── Config shapes ─────────────────────────────────────────────────────────────

export interface DailyCollectionConfig {
  /** Fraction of base settlement owed to SACCO. Default: 4/19 ≈ 0.2105 */
  saccoLevyRate: number
  /** Fraction of base going to owner. Default: 3/19 ≈ 0.1579 */
  ownerRate: number
  /** Fraction of base going to driver. Default: 2/19 ≈ 0.1053 */
  driverBaseRate: number
  /** Fraction of base going to conductor. Default: 2/19 ≈ 0.1053 */
  conductorBaseRate: number
  /** Driver incentive on excess. Default: 0.10 */
  driverIncentiveRate: number
  /** Conductor incentive on excess. Default: 0.10 */
  conductorIncentiveRate: number
  /** Platform share of excess. Default: 0.80 */
  platformExcessRate: number
}

export interface ReservationFeeConfig {
  /** Total fee charged to passenger per seat in KES. Default: 19 */
  totalFeeKes: number
  /** Platform share. 15/19 ≈ 0.7895 → KES 15 */
  platformRate: number
  /** Driver motivation share. 2/19 ≈ 0.1053 → KES 2 */
  driverRate: number
  /** Conductor motivation share. 2/19 ≈ 0.1053 → KES 2 */
  conductorRate: number
}

export interface TipConfig {
  /** Driver's share of each tip. Default: 0.10 */
  driverRate: number
  /** Conductor's share of each tip. Default: 0.10 */
  conductorRate: number
  /** Platform's share of each tip. Default: 0.80 */
  platformRate: number
}

export interface RevenueConfig {
  daily: DailyCollectionConfig
  reservation: ReservationFeeConfig
  tip: TipConfig
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_REVENUE_CONFIG: RevenueConfig = {
  daily: {
    saccoLevyRate: 4 / 19, // ≈ 0.2105
    ownerRate: 3 / 19, // ≈ 0.1579
    driverBaseRate: 2 / 19, // ≈ 0.1053
    conductorBaseRate: 2 / 19, // ≈ 0.1053
    // Platform gets remainder of base (10/19 ≈ 42.11%)
    driverIncentiveRate: 0.1,
    conductorIncentiveRate: 0.1,
    platformExcessRate: 0.8,
  },

  reservation: {
    totalFeeKes: 19,
    platformRate: 15 / 19, // ≈ 0.7895 → KES 15
    driverRate: 2 / 19, // ≈ 0.1053 → KES 2
    conductorRate: 2 / 19, // ≈ 0.1053 → KES 2
  },

  tip: {
    driverRate: 0.1,
    conductorRate: 0.1,
    platformRate: 0.8,
  },
}

// ── Org override loader ───────────────────────────────────────────────────────

export async function loadOrgRevenueConfig(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  orgId: string,
): Promise<RevenueConfig> {
  const { data: org } = await supabase
    .from("organizations")
    .select("metadata")
    .eq("id", orgId)
    .maybeSingle()

  const overrides =
    (org?.metadata as { revenue_config?: Partial<RevenueConfig> } | null)
      ?.revenue_config ?? {}

  return deepMerge(DEFAULT_REVENUE_CONFIG, overrides)
}

// ── Daily distribution ────────────────────────────────────────────────────────

export interface DailyDistributionResult {
  baseSettlement: number // KES — portion up to target
  excess: number // KES — portion above target
  saccoLevy: number // KES — SACCO cut of base
  ownerAmount: number // KES — owner cut of base
  driverBase: number // KES — driver cut of base
  conductorBase: number // KES — conductor cut of base
  platformBase: number // KES — platform remainder of base
  driverIncentive: number // KES — 10% of excess
  conductorIncentive: number // KES — 10% of excess
  platformExcess: number // KES — 80% of excess
  driverTotal: number // KES — base + incentive
  conductorTotal: number // KES — base + incentive
}

/**
 * Distribute a vehicle's daily collection among stakeholders.
 * Base (≤ target) → SACCO + owner + driver + conductor + platform (remainder).
 * Excess (> target) → 10% driver, 10% conductor, 80% platform.
 */
export function calculateDailyDistribution(
  totalCollected: number,
  target: number,
  config: DailyCollectionConfig = DEFAULT_REVENUE_CONFIG.daily,
): DailyDistributionResult {
  totalCollected = Math.max(0, totalCollected)
  target = Math.max(0, target)

  const baseSettlement = Math.min(totalCollected, target)
  const excess = Math.max(totalCollected - target, 0)

  const saccoLevy = Math.floor(baseSettlement * config.saccoLevyRate)
  const ownerAmount = Math.floor(baseSettlement * config.ownerRate)
  const driverBase = Math.floor(baseSettlement * config.driverBaseRate)
  const conductorBase = Math.floor(baseSettlement * config.conductorBaseRate)
  // Platform absorbs rounding remainder on base
  const platformBase =
    baseSettlement - saccoLevy - ownerAmount - driverBase - conductorBase

  const driverIncentive = Math.floor(excess * config.driverIncentiveRate)
  const conductorIncentive = Math.floor(excess * config.conductorIncentiveRate)
  const platformExcess = excess - driverIncentive - conductorIncentive

  return {
    baseSettlement,
    excess,
    saccoLevy,
    ownerAmount,
    driverBase,
    conductorBase,
    platformBase,
    driverIncentive,
    conductorIncentive,
    platformExcess,
    driverTotal: driverBase + driverIncentive,
    conductorTotal: conductorBase + conductorIncentive,
  }
}

// ── Reservation fee split ─────────────────────────────────────────────────────

export interface ReservationSplitResult {
  totalKes: number // seats × KES 19
  platformKes: number // platform share (remainder after driver + conductor)
  driverKes: number // driver motivation share
  conductorKes: number // conductor motivation share
  perSeat: {
    platformKes: number
    driverKes: number
    conductorKes: number
  }
}

/**
 * Split the KES 19 reservation fee for N seats.
 *
 * Only platform, driver, and conductor receive a share.
 * SACCO and owner are excluded — their revenue comes from daily collections.
 *
 * @example
 *   calculateReservationSplit(config.reservation, 2)
 *   // { totalKes: 38, platformKes: 30, driverKes: 4, conductorKes: 4 }
 */
export function calculateReservationSplit(
  config: ReservationFeeConfig = DEFAULT_REVENUE_CONFIG.reservation,
  seats = 1,
): ReservationSplitResult {
  seats = Math.max(1, Math.floor(seats))
  const totalKes = config.totalFeeKes * seats

  const perDriver = Math.floor(config.totalFeeKes * config.driverRate)
  const perConductor = Math.floor(config.totalFeeKes * config.conductorRate)
  // Platform gets everything else — absorbs rounding remainder
  const perPlatform = config.totalFeeKes - perDriver - perConductor

  return {
    totalKes,
    platformKes: perPlatform * seats,
    driverKes: perDriver * seats,
    conductorKes: perConductor * seats,
    perSeat: {
      platformKes: perPlatform,
      driverKes: perDriver,
      conductorKes: perConductor,
    },
  }
}

// ── Tip split ─────────────────────────────────────────────────────────────────

export interface TipSplitResult {
  totalKes: number
  driverKes: number // 10%
  conductorKes: number // 10%
  platformKes: number // 80%
}

/**
 * Split a tip: 10% driver, 10% conductor, 80% platform.
 *
 * @example
 *   calculateTipSplit(100)
 *   // { totalKes: 100, driverKes: 10, conductorKes: 10, platformKes: 80 }
 */
export function calculateTipSplit(
  totalKes: number,
  config: TipConfig = DEFAULT_REVENUE_CONFIG.tip,
): TipSplitResult {
  totalKes = Math.max(0, totalKes)
  const driverKes = Math.floor(totalKes * config.driverRate)
  const conductorKes = Math.floor(totalKes * config.conductorRate)
  return {
    totalKes,
    driverKes,
    conductorKes,
    platformKes: totalKes - driverKes - conductorKes,
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateReservationConfig(c: ReservationFeeConfig): boolean {
  const sum = c.platformRate + c.driverRate + c.conductorRate
  return Math.abs(sum - 1.0) < 0.001
}

export function validateDailyConfig(c: DailyCollectionConfig): boolean {
  const excessSum =
    c.driverIncentiveRate + c.conductorIncentiveRate + c.platformExcessRate
  return Math.abs(excessSum - 1.0) < 0.001
}

export function validateTipConfig(c: TipConfig): boolean {
  return Math.abs(c.driverRate + c.conductorRate + c.platformRate - 1.0) < 0.001
}

// ── Utility ───────────────────────────────────────────────────────────────────

function deepMerge<T extends object>(base: T, overrides: Partial<T>): T {
  const result = { ...base }
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const val = overrides[key]
    if (
      val !== undefined &&
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val)
    ) {
      result[key] = deepMerge(
        result[key] as object,
        val as object,
      ) as T[typeof key]
    } else if (val !== undefined) {
      result[key] = val as T[typeof key]
    }
  }
  return result
}
