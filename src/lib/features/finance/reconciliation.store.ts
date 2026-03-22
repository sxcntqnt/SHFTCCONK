// src/lib/features/finance/reconciliation.ts
//
// Reconciliation logic for daily vehicle collections.
// Payments are M-Pesa STK Push transactions or cash entries logged by conductors.
// All amounts in KES.
//
// RECONCILIATION STATUSES (align with reconciliation_events.status in DB):
//   MATCHED   — collected === expected (within KES 1 tolerance for rounding)
//   SHORTFALL — collected < expected
//   OVERAGE   — collected > expected (driver exceeded target — calculate incentive)

// ── M-Pesa payment transaction ────────────────────────────────────────────────

export interface MpesaTransaction {
  /** M-Pesa transaction code e.g. "MPESA4G8K2L" */
  reference:  string

  /** Amount in KES */
  amount:     number

  /** M-Pesa phone in +254 format */
  phone:      string

  /** ISO timestamp from Daraja callback */
  timestamp:  string

  /** Vehicle this payment is attributed to (set by conductor at boarding) */
  vehicleId?: string

  /** Passenger actor ID if the booking was pre-booked */
  bookingId?: string
}

// ── Cash transaction ──────────────────────────────────────────────────────────

export interface CashTransaction {
  reference:  string  // internal UUID
  amount:     number  // KES
  timestamp:  string
  vehicleId?: string
  loggedBy:   string  // conductor actor ID
}

export type PaymentTransaction = MpesaTransaction | CashTransaction

export function isMpesa(t: PaymentTransaction): t is MpesaTransaction {
  return 'phone' in t
}

// ── Remittance target ─────────────────────────────────────────────────────────

export interface RemittanceRecord {
  vehicleId:      string
  expectedAmount: number  // KES — daily target set by SACCO
  saccoPercentage: number // 0–1
}

// ── Reconciliation result ─────────────────────────────────────────────────────

export type ReconciliationStatus = 'MATCHED' | 'SHORTFALL' | 'OVERAGE'

export interface ReconciliationResult {
  vehicleId:        string
  status:           ReconciliationStatus
  expectedAmount:   number  // KES
  collectedAmount:  number  // KES
  variance:         number  // positive = overage, negative = shortfall
  mpesaAmount:      number  // KES collected via M-Pesa
  cashAmount:       number  // KES collected in cash
  transactionRefs:  string[]
  mpesaPhones:      string[] // unique phones that paid (for audit trail)
}

// ── Summary ───────────────────────────────────────────────────────────────────

export interface ReconciliationSummary {
  totalExpected:   number
  totalCollected:  number
  totalVariance:   number
  totalMpesa:      number
  totalCash:       number
  matchedCount:    number
  shortfallCount:  number
  overageCount:    number
  /** KES shortfall needing follow-up */
  totalShortfall:  number
  /** KES excess to distribute as driver incentives */
  totalExcess:     number
}

// ── Core reconciliation ───────────────────────────────────────────────────────

/**
 * Reconcile M-Pesa and cash payments against expected daily targets per vehicle.
 *
 * Supports:
 *   - Exact matches (MATCHED)
 *   - Underpayment (SHORTFALL)
 *   - Overpayment / exceeded target (OVERAGE)
 *   - Mixed M-Pesa + cash collections per vehicle
 *   - Multiple payments per vehicle
 *
 * @example
 *   reconcilePayments(todaysPayments, dailyTargets)
 */
export function reconcilePayments(
  payments:    PaymentTransaction[],
  remittances: RemittanceRecord[],
): ReconciliationResult[] {
  const MATCH_TOLERANCE = 1 // KES — rounding tolerance

  return remittances.map((remit) => {
    const vehiclePayments = payments.filter((p) => p.vehicleId === remit.vehicleId)

    const mpesaPayments = vehiclePayments.filter(isMpesa)
    const cashPayments  = vehiclePayments.filter((p) => !isMpesa(p))

    const mpesaAmount     = mpesaPayments.reduce((sum, p) => sum + p.amount, 0)
    const cashAmount      = cashPayments.reduce((sum, p) => sum + p.amount, 0)
    const collectedAmount = mpesaAmount + cashAmount

    const variance = collectedAmount - remit.expectedAmount

    let status: ReconciliationStatus
    if (Math.abs(variance) <= MATCH_TOLERANCE) {
      status = 'MATCHED'
    } else if (variance > 0) {
      status = 'OVERAGE'
    } else {
      status = 'SHORTFALL'
    }

    const mpesaPhones = [
      ...new Set(mpesaPayments.map((p) => (p as MpesaTransaction).phone)),
    ]

    return {
      vehicleId:       remit.vehicleId,
      status,
      expectedAmount:  remit.expectedAmount,
      collectedAmount,
      variance,
      mpesaAmount,
      cashAmount,
      transactionRefs: vehiclePayments.map((p) => p.reference),
      mpesaPhones,
    }
  })
}

// ── Summary aggregation ───────────────────────────────────────────────────────

/**
 * Summarise a full set of reconciliation results for an org dashboard.
 */
export function summarizeReconciliation(
  results: ReconciliationResult[],
): ReconciliationSummary {
  return results.reduce(
    (acc, r) => {
      acc.totalExpected  += r.expectedAmount
      acc.totalCollected += r.collectedAmount
      acc.totalVariance  += r.variance
      acc.totalMpesa     += r.mpesaAmount
      acc.totalCash      += r.cashAmount

      if (r.status === 'MATCHED')   acc.matchedCount++
      if (r.status === 'SHORTFALL') {
        acc.shortfallCount++
        acc.totalShortfall += Math.abs(r.variance)
      }
      if (r.status === 'OVERAGE') {
        acc.overageCount++
        acc.totalExcess += r.variance
      }

      return acc
    },
    {
      totalExpected:  0,
      totalCollected: 0,
      totalVariance:  0,
      totalMpesa:     0,
      totalCash:      0,
      matchedCount:   0,
      shortfallCount: 0,
      overageCount:   0,
      totalShortfall: 0,
      totalExcess:    0,
    } as ReconciliationSummary,
  )
}

// ── Revenue trend ─────────────────────────────────────────────────────────────

/**
 * Generate a simple daily revenue trend array for charting.
 * Returns [collected, collected, ...] ordered by remittance input.
 *
 * For a real trend, pass remittances ordered by date and the
 * consumer maps index → date label.
 */
export function getRevenueTrend(results: ReconciliationResult[]): number[] {
  return results.map((r) => r.collectedAmount)
}

/**
 * Group results by status for a summary pie/bar chart.
 */
export function groupByStatus(
  results: ReconciliationResult[],
): Record<ReconciliationStatus, ReconciliationResult[]> {
  return {
    MATCHED:   results.filter((r) => r.status === 'MATCHED'),
    SHORTFALL: results.filter((r) => r.status === 'SHORTFALL'),
    OVERAGE:   results.filter((r) => r.status === 'OVERAGE'),
  }
}