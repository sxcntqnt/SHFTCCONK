// src/lib/features/wallet/wallet.types.ts
//
// Shared types across all wallet pages.
// Each wallet has the same transaction shape but different
// sources, allowed actions, and display configuration.

// ── Transaction ───────────────────────────────────────────────────────────────

export type WalletTxType =
  // Inflows
  | "tip_share" // crew: 10% of tip
  | "reservation_share" // crew/operator: KES 2/seat motivation
  | "sacco_levy" // org: 4/19 of base daily collection
  | "platform_cut" // admin: KES 15/seat + 80% tips/excess
  | "operator_fee" // operator: trip organisation fee
  | "booking_refund" // passenger: refund from cancelled booking
  | "cashback" // passenger: loyalty cashback
  | "top_up" // passenger: M-Pesa STK top-up
  | "settlement_received" // org: B2B received from platform
  // Outflows
  | "withdrawal" // crew/operator: to personal M-Pesa
  | "booking_payment" // passenger: paid for a booking
  | "b2b_settlement" // org/admin: outgoing B2B to paybill
  | "b2c_payout" // admin: tip payout sent to crew

export type WalletTxStatus = "completed" | "pending" | "failed" | "processing"

export interface WalletTransaction {
  id: string
  type: WalletTxType
  description: string
  amountKes: number
  direction: "in" | "out"
  status: WalletTxStatus
  mpesaRef: string | null
  counterpart?: string // who paid / who received
  createdAt: string
}

// ── Summary ───────────────────────────────────────────────────────────────────

export interface WalletSummary {
  availableKes: number
  pendingKes: number
  totalEarnedKes: number
  totalSpentKes: number
  /** Currency label — always KES for now */
  currency: "KES"
}

// ── Wallet config — drives rendering differences per role ─────────────────────

export type WalletRole = "passenger" | "crew" | "operator" | "org" | "admin"

export interface WalletConfig {
  role: WalletRole
  title: string
  subtitle: string
  accentColor: string // CSS color or var()
  accentRgb: string // "r,g,b" for rgba() usage
  canWithdraw: boolean // personal M-Pesa withdrawal
  canTopUp: boolean // STK Push top-up
  canSettle: boolean // B2B settlement to paybill
  withdrawLabel: string
}

export const WALLET_CONFIGS: Record<WalletRole, WalletConfig> = {
  passenger: {
    role: "passenger",
    title: "My Wallet",
    subtitle: "Top up and pay for bookings.",
    accentColor: "#a78bfa",
    accentRgb: "167,139,250",
    canWithdraw: false,
    canTopUp: true,
    canSettle: false,
    withdrawLabel: "",
  },
  crew: {
    role: "crew",
    title: "Earnings Wallet",
    subtitle: "Tips and reservation shares.",
    accentColor: "var(--teal)",
    accentRgb: "0,176,155",
    canWithdraw: true,
    canTopUp: false,
    canSettle: false,
    withdrawLabel: "Withdraw to M-Pesa",
  },
  operator: {
    role: "operator",
    title: "Operator Wallet",
    subtitle: "Fleet management earnings.",
    accentColor: "#fb923c",
    accentRgb: "251,146,60",
    canWithdraw: true,
    canTopUp: false,
    canSettle: true,
    withdrawLabel: "Withdraw",
  },
  org: {
    role: "org",
    title: "SACCO Treasury",
    subtitle: "Levy income and settlement tracking.",
    accentColor: "#38bdf8",
    accentRgb: "56,189,248",
    canWithdraw: false,
    canTopUp: false,
    canSettle: true,
    withdrawLabel: "",
  },
  admin: {
    role: "admin",
    title: "Platform Revenue",
    subtitle: "sxcntqnt platform earnings.",
    accentColor: "#fbbf24",
    accentRgb: "251,191,36",
    canWithdraw: false,
    canTopUp: false,
    canSettle: false,
    withdrawLabel: "",
  },
}

// ── TX display helpers ────────────────────────────────────────────────────────

export const TX_LABELS: Record<WalletTxType, string> = {
  tip_share: "Tip share",
  reservation_share: "Reservation share",
  sacco_levy: "SACCO levy",
  platform_cut: "Platform cut",
  operator_fee: "Operator fee",
  booking_refund: "Booking refund",
  cashback: "Cashback",
  top_up: "M-Pesa top-up",
  settlement_received: "Settlement received",
  withdrawal: "Withdrawal",
  booking_payment: "Booking payment",
  b2b_settlement: "B2B settlement",
  b2c_payout: "Crew tip payout",
}

export const TX_DIRECTION: Record<WalletTxType, "in" | "out"> = {
  tip_share: "in",
  reservation_share: "in",
  sacco_levy: "in",
  platform_cut: "in",
  operator_fee: "in",
  booking_refund: "in",
  cashback: "in",
  top_up: "in",
  settlement_received: "in",
  withdrawal: "out",
  booking_payment: "out",
  b2b_settlement: "out",
  b2c_payout: "out",
}

export function fmtKes(n: number): string {
  return `KES ${Math.abs(n).toLocaleString("en-KE")}`
}

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  const diffH = (Date.now() - d.getTime()) / 3_600_000
  if (diffH < 1) return "Just now"
  if (diffH < 24) return `${Math.floor(diffH)}h ago`
  if (diffH < 48) return "Yesterday"
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short" })
}
