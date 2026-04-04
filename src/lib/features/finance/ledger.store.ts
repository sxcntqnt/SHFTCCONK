// src/lib/features/finance/ledger.ts
//
// Ledger entry model, fee splits, and distribution logic.
// All amounts in KES (Kenyan Shillings).
//
// ── FEE MODEL ─────────────────────────────────────────────────────────────────
//
// RESERVATION FEE (KES 19 per seat):
//   Platform   KES 15   15/19 ≈ 78.95%
//   Driver     KES  2    2/19 ≈ 10.53%   motivation share
//   Conductor  KES  2    2/19 ≈ 10.53%   motivation share
//   Total      KES 19   100%
//
//   SACCO and owner are excluded from the reservation fee.
//   Their revenue comes entirely from daily fare collections.
//
// DAILY EXCESS + TIPS:
//   Driver      10%
//   Conductor   10%
//   Platform    80%

import { v4 as uuidv4 } from "uuid"

// ── Fee constants ─────────────────────────────────────────────────────────────

export const RESERVATION_FEE = {
  totalFeeKes: 19,
  platformKes: 15, // 15/19 — platform gets the bulk
  driverKes: 2, // 2/19
  conductorKes: 2, // 2/19

  platformRate: 15 / 19,
  driverRate: 2 / 19,
  conductorRate: 2 / 19,
} as const

/** Each crew member gets 10% of tips and excess; platform keeps 80% */
export const CREW_INCENTIVE_RATE = 0.1
export const PLATFORM_EXCESS_RATE = 0.8

// ── Entry types ───────────────────────────────────────────────────────────────

export type LedgerEntryType =
  | "MPESA_COLLECTION" // Fare collected via M-Pesa STK Push
  | "CASH_COLLECTION" // Fare collected in cash
  | "RESERVATION_FEE" // KES 19 booking fee (full amount before split)
  | "PLATFORM_SHARE" // Platform's cut (reservation fee or excess)
  | "SACCO_LEVY" // SACCO's cut of daily base settlement
  | "OWNER_SHARE" // Vehicle owner's cut of daily base settlement
  | "DRIVER_SHARE" // Driver's reservation fee share (KES 2)
  | "CONDUCTOR_SHARE" // Conductor's reservation fee share (KES 2)
  | "DRIVER_INCENTIVE" // Driver's 10% of excess / tips
  | "CONDUCTOR_INCENTIVE" // Conductor's 10% of excess / tips
  | "FUEL_DEDUCTION" // Fuel cost deducted from driver payout
  | "PENALTY" // Fine or compliance penalty
  | "REFUND" // M-Pesa reversal or cash refund

// ── Entry model ───────────────────────────────────────────────────────────────

export interface LedgerEntry {
  id: string
  vehicleId: string
  driverId: string
  organizationId: string
  date: string // ISO 8601
  type: LedgerEntryType
  amount: number // KES, always positive
  reference?: string // M-Pesa code or internal ref
  mpesaPhone?: string // +254 format — on MPESA_COLLECTION entries
  notes?: string
}

// ── Distribution models ───────────────────────────────────────────────────────

/**
 * How a KES 19 reservation fee is split.
 * No SACCO or owner share — they earn from daily collections only.
 */
export interface ReservationFeeSplit {
  totalFee: number // 19
  platform: number // 15
  driver: number //  2
  conductor: number //  2
}

/**
 * How a day's total vehicle collection is distributed.
 */
export interface DistributionResult {
  baseSettlement: number // KES — up to daily target
  excess: number // KES — above target
  saccoLevy: number // KES — SACCO cut of base
  ownerAmount: number // KES — owner cut of base
  driverBase: number // KES — driver cut of base (2/19)
  conductorBase: number // KES — conductor cut of base (2/19)
  platformBase: number // KES — platform remainder of base (10/19)
  driverIncentive: number // KES — 10% of excess
  conductorIncentive: number // KES — 10% of excess
  platformExcess: number // KES — 80% of excess
  driverTotal: number // base + incentive
  conductorTotal: number // base + incentive
}

export interface TipSplit {
  totalTip: number
  driverShare: number // 10%
  conductorShare: number // 10%
  platformShare: number // 80%
}

// ── Core calculations ─────────────────────────────────────────────────────────

/**
 * Split the KES 19 reservation fee.
 * Platform gets 15, driver gets 2, conductor gets 2.
 * SACCO and owner receive nothing from this fee.
 *
 * @example
 *   splitReservationFee()
 *   // { totalFee: 19, platform: 15, driver: 2, conductor: 2 }
 */
export function splitReservationFee(
  feeKes = RESERVATION_FEE.totalFeeKes,
): ReservationFeeSplit {
  const driver = Math.floor(feeKes * RESERVATION_FEE.driverRate)
  const conductor = Math.floor(feeKes * RESERVATION_FEE.conductorRate)
  // Platform absorbs rounding remainder
  const platform = feeKes - driver - conductor

  return { totalFee: feeKes, platform, driver, conductor }
}

/**
 * Distribute a vehicle's daily collection.
 *
 * Base (≤ target): SACCO 4/19, owner 3/19, driver 2/19, conductor 2/19,
 *                  platform 10/19 (remainder).
 * Excess (> target): driver 10%, conductor 10%, platform 80%.
 *
 * @example
 *   calculateDistribution(8500, 7000)
 *   // baseSettlement: 7000, excess: 1500
 *   // saccoLevy: 1473, ownerAmount: 1105, driverBase: 736, conductorBase: 736
 *   // platformBase: 1950 (remainder)
 *   // driverIncentive: 150, conductorIncentive: 150, platformExcess: 1200
 */
export function calculateDistribution(
  totalCollected: number,
  target: number,
): DistributionResult {
  totalCollected = Math.max(0, totalCollected)
  target = Math.max(0, target)

  const SACCO_RATE = 4 / 19
  const OWNER_RATE = 3 / 19
  const DRIVER_BASE_RATE = 2 / 19
  const CONDUCTOR_BASE_RATE = 2 / 19

  const baseSettlement = Math.min(totalCollected, target)
  const excess = Math.max(totalCollected - target, 0)

  const saccoLevy = Math.floor(baseSettlement * SACCO_RATE)
  const ownerAmount = Math.floor(baseSettlement * OWNER_RATE)
  const driverBase = Math.floor(baseSettlement * DRIVER_BASE_RATE)
  const conductorBase = Math.floor(baseSettlement * CONDUCTOR_BASE_RATE)
  const platformBase =
    baseSettlement - saccoLevy - ownerAmount - driverBase - conductorBase

  const driverIncentive = Math.floor(excess * CREW_INCENTIVE_RATE)
  const conductorIncentive = Math.floor(excess * CREW_INCENTIVE_RATE)
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

/**
 * Split a tip: 10% driver, 10% conductor, 80% platform.
 *
 * @example
 *   splitTip(100)
 *   // { totalTip: 100, driverShare: 10, conductorShare: 10, platformShare: 80 }
 */
export function splitTip(totalTip: number): TipSplit {
  totalTip = Math.max(0, totalTip)
  const driverShare = Math.floor(totalTip * CREW_INCENTIVE_RATE)
  const conductorShare = Math.floor(totalTip * CREW_INCENTIVE_RATE)
  return {
    totalTip,
    driverShare,
    conductorShare,
    platformShare: totalTip - driverShare - conductorShare,
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createLedgerEntry(
  params: Omit<LedgerEntry, "id" | "date"> & { date?: string },
): LedgerEntry {
  return {
    ...params,
    id: uuidv4(),
    date: params.date ?? new Date().toISOString(),
  }
}

export function createMpesaEntry(
  vehicleId: string,
  driverId: string,
  organizationId: string,
  amount: number,
  mpesaRef: string,
  mpesaPhone: string,
): LedgerEntry {
  return createLedgerEntry({
    vehicleId,
    driverId,
    organizationId,
    type: "MPESA_COLLECTION",
    amount,
    reference: mpesaRef,
    mpesaPhone,
  })
}

/**
 * Generate ledger entries for a single reservation fee payment.
 * Creates one entry per recipient (platform, driver, conductor).
 * SACCO and owner are NOT included — they have no reservation fee share.
 */
export function createReservationFeeEntries(
  vehicleId: string,
  driverId: string,
  organizationId: string,
  bookingRef: string,
): LedgerEntry[] {
  const split = splitReservationFee()
  const base = { vehicleId, driverId, organizationId, reference: bookingRef }

  return [
    createLedgerEntry({
      ...base,
      type: "PLATFORM_SHARE",
      amount: split.platform,
    }),
    createLedgerEntry({ ...base, type: "DRIVER_SHARE", amount: split.driver }),
    createLedgerEntry({
      ...base,
      type: "CONDUCTOR_SHARE",
      amount: split.conductor,
    }),
  ]
}

// ── Aggregation utilities ─────────────────────────────────────────────────────

export function aggregateLedger(
  entries: LedgerEntry[],
  by: keyof Pick<LedgerEntry, "type" | "vehicleId" | "driverId"> = "type",
): Record<string, number> {
  return entries.reduce(
    (acc, e) => {
      const key = String(e[by])
      acc[key] = (acc[key] ?? 0) + e.amount
      return acc
    },
    {} as Record<string, number>,
  )
}

export function todayEntries(entries: LedgerEntry[]): LedgerEntry[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return entries.filter((e) => new Date(e.date) >= today)
}

export function totalCollected(entries: LedgerEntry[]): number {
  return entries
    .filter(
      (e) => e.type === "MPESA_COLLECTION" || e.type === "CASH_COLLECTION",
    )
    .reduce((sum, e) => sum + e.amount, 0)
}

export function totalPlatformRevenue(entries: LedgerEntry[]): number {
  return entries
    .filter((e) => e.type === "PLATFORM_SHARE")
    .reduce((sum, e) => sum + e.amount, 0)
}

export function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`
}
