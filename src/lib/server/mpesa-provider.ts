// src/lib/server/mpesa-provider.ts
//
// Centralised M-Pesa provider — Safaricom Daraja API.
//
// METHODS:
//   processMpesaPush()       STK Push — passenger pays reservation fee / plan
//   queryStkStatus()         Poll STK Push result (fallback if callback is slow)
//   sendB2CPayment()         B2C — tip payouts to drivers / conductors (10% each)
//   sendB2BPayment()         B2B — SACCO → paybill revenue share settlement
//   queryTransactionStatus() General transaction status query

import {
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  MPESA_INITIATOR_NAME,
  MPESA_INITIATOR_PASSWORD,
  MPESA_B2C_SHORTCODE,
  MPESA_B2B_SHORTCODE,
  MPESA_CALLBACK_URL,
} from "$env/static/private"

// ── Environment switch ────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke"

// ── OAuth token cache ─────────────────────────────────────────────────────────

let cachedToken: string | null = null
let tokenExpiry = 0

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && now < tokenExpiry) return cachedToken

  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64")

  const res = await fetch(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } },
  )

  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.status}`)

  const data = await res.json()
  cachedToken = data.access_token as string
  tokenExpiry = now + (data.expires_in as number) * 1000 - 60_000 // 60s buffer
  return cachedToken!
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateTimestamp(): string {
  return new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)
}

function generatePassword(timestamp: string): string {
  return Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString("base64")
}

/**
 * Normalise a Kenyan phone to 2547XXXXXXXX (Daraja format).
 * Accepts: 07XX, +2547XX, 2547XX
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("0"))   return "254" + digits.slice(1)
  if (digits.startsWith("254")) return digits
  return digits
}

// ── Daraja response types ─────────────────────────────────────────────────────

export interface StkPushResponse {
  MerchantRequestID:   string
  CheckoutRequestID:   string
  ResponseCode:        string
  ResponseDescription: string
  CustomerMessage:     string
}

export interface StkStatusResponse {
  ResponseCode:        string
  ResponseDescription: string
  MerchantRequestID:   string
  CheckoutRequestID:   string
  ResultCode:          string
  ResultDesc:          string
}

export interface AsyncDarajaResponse {
  ConversationID:           string
  OriginatorConversationID: string
  ResponseCode:             string
  ResponseDescription:      string
}

// ── 1. STK Push (Customer → Platform) ────────────────────────────────────────

/**
 * Initiate an M-Pesa STK Push to a passenger's phone.
 *
 * Used for:
 *   - Seat reservation fee (KES 19 × seats)
 *   - Plan subscription payment (KES 1,499 / custom)
 *
 * @param phoneNumber       Kenyan phone in any format
 * @param amount            KES whole number
 * @param accountReference  Shows on customer M-Pesa receipt (max 12 chars)
 * @param transactionDesc   Short description on STK prompt (max 13 chars)
 */
export async function processMpesaPush(
  phoneNumber:       string,
  amount:            number,
  accountReference = "MATATU_PULSE",
  transactionDesc  = "Payment",
): Promise<StkPushResponse> {
  const token     = await getAccessToken()
  const timestamp = generateTimestamp()
  const password  = generatePassword(timestamp)

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password:          password,
    Timestamp:         timestamp,
    TransactionType:   "CustomerPayBillOnline",
    Amount:            Math.round(amount),
    PartyA:            formatPhone(phoneNumber),
    PartyB:            MPESA_SHORTCODE,
    PhoneNumber:       formatPhone(phoneNumber),
    CallBackURL:       `${MPESA_CALLBACK_URL}/stk-callback`,
    AccountReference:  accountReference.slice(0, 12),
    TransactionDesc:   transactionDesc.slice(0, 13),
  }

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok || data.ResponseCode !== "0") {
    throw new Error(data?.errorMessage ?? data?.ResponseDescription ?? "STK Push failed")
  }

  return data as StkPushResponse
}

/**
 * Poll STK Push result by CheckoutRequestID.
 * Use if the STK callback hasn't arrived within ~30s.
 */
export async function queryStkStatus(checkoutRequestId: string): Promise<StkStatusResponse> {
  const token     = await getAccessToken()
  const timestamp = generateTimestamp()
  const password  = generatePassword(timestamp)

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password:          password,
    Timestamp:         timestamp,
    CheckoutRequestID: checkoutRequestId,
  }

  const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  })

  return res.json() as Promise<StkStatusResponse>
}

// ── 2. B2C (Platform → Customer) — Tip payouts ───────────────────────────────

/**
 * Send an M-Pesa B2C payment to a driver or conductor.
 *
 * Fee model: each gets 10% of the tip total.
 * e.g. KES 100 tip → driver KES 10, conductor KES 10, platform KES 80.
 *
 * Call this twice per tip — once for driver, once for conductor.
 * Result arrives asynchronously via b2c-callback webhook.
 */
export async function sendB2CPayment({
  phoneNumber,
  amount,
  remarks,
  occasion,
}: {
  phoneNumber: string
  amount:      number
  remarks?:    string
  occasion?:   string
}): Promise<AsyncDarajaResponse> {
  const token = await getAccessToken()

  const payload = {
    InitiatorName:      MPESA_INITIATOR_NAME,
    SecurityCredential: MPESA_INITIATOR_PASSWORD,
    CommandID:          "BusinessPayment",
    Amount:             Math.round(amount),
    PartyA:             MPESA_B2C_SHORTCODE,
    PartyB:             formatPhone(phoneNumber),
    Remarks:            (remarks  ?? "Tip payout").slice(0, 100),
    QueueTimeOutURL:    `${MPESA_CALLBACK_URL}/b2c-timeout`,
    ResultURL:          `${MPESA_CALLBACK_URL}/b2c-callback`,
    Occasion:           (occasion ?? "Tip payout").slice(0, 100),
  }

  const res = await fetch(`${BASE_URL}/mpesa/b2c/v1/paymentrequest`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok || data.ResponseCode !== "0") {
    throw new Error(data?.errorMessage ?? data?.ResponseDescription ?? "B2C payment failed")
  }

  return data as AsyncDarajaResponse
}

// ── 3. B2B (Platform → Business) — Revenue share settlement ──────────────────

/**
 * Send an M-Pesa B2B payment to a SACCO paybill or till number.
 *
 * Used for daily/weekly SACCO share settlements.
 * SACCO receives their cut of the reservation fee (4/19 ≈ KES 4 per seat).
 *
 * Result arrives asynchronously via b2b-callback webhook.
 */
export async function sendB2BPayment({
  shortcode,
  amount,
  remarks,
  accountReference,
}: {
  shortcode:         string
  amount:            number
  remarks?:          string
  accountReference?: string
}): Promise<AsyncDarajaResponse> {
  const token = await getAccessToken()

  const payload = {
    Initiator:              MPESA_INITIATOR_NAME,
    SecurityCredential:     MPESA_INITIATOR_PASSWORD,
    CommandID:              "BusinessPayBill",
    SenderIdentifierType:   "4",
    RecieverIdentifierType: "4",
    Amount:                 Math.round(amount),
    PartyA:                 MPESA_B2B_SHORTCODE,
    PartyB:                 shortcode,
    AccountReference:       (accountReference ?? "SETTLEMENT").slice(0, 12),
    Remarks:                (remarks ?? "Revenue share settlement").slice(0, 100),
    QueueTimeOutURL:        `${MPESA_CALLBACK_URL}/b2b-timeout`,
    ResultURL:              `${MPESA_CALLBACK_URL}/b2b-callback`,
  }

  const res = await fetch(`${BASE_URL}/mpesa/b2b/v1/paymentrequest`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok || data.ResponseCode !== "0") {
    throw new Error(data?.errorMessage ?? data?.ResponseDescription ?? "B2B payment failed")
  }

  return data as AsyncDarajaResponse
}

// ── 4. Transaction status query ───────────────────────────────────────────────

export async function queryTransactionStatus(transactionId: string): Promise<unknown> {
  const token = await getAccessToken()

  const payload = {
    Initiator:          MPESA_INITIATOR_NAME,
    SecurityCredential: MPESA_INITIATOR_PASSWORD,
    CommandID:          "TransactionStatusQuery",
    TransactionID:      transactionId,
    PartyA:             MPESA_SHORTCODE,
    IdentifierType:     "4",
    ResultURL:          `${MPESA_CALLBACK_URL}/status-callback`,
    QueueTimeOutURL:    `${MPESA_CALLBACK_URL}/status-timeout`,
    Remarks:            "Status check",
    Occasion:           "Status",
  }

  const res = await fetch(`${BASE_URL}/mpesa/transactionstatus/v1/query`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  })

  return res.json()
}