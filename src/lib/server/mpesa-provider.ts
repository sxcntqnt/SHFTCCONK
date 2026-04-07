// src/lib/server/mpesa-provider.ts
import {
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_BUSINESS_SHORT_CODE,
  MPESA_API_PASS_KEY,
  MPESA_INITIATOR_NAME,
  MPESA_INITIATOR_PASSWORD,
  MPESA_B2C_SHORT_CODE,
  MPESA_B2B_SHORT_CODE,
  MPESA_CALLBACK_URL,
} from "$env/static/private";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// ── Token Cache ─────────────────────────────────────────────────────────────
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");

  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`M-Pesa OAuth failed: ${res.status} - ${err}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in as number) * 1000 - 60_000; // 60s buffer

  return cachedToken!;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function generateTimestamp(): string {
  return new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}

function generatePassword(timestamp: string): string {
  return Buffer.from(
    `${MPESA_BUSINESS_SHORT_CODE}${MPESA_API_PASS_KEY}${timestamp}`
  ).toString("base64");
}

/**
 * Normalizes Kenyan phone number to 2547XXXXXXXX format
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.startsWith("254")) return digits;
  if (digits.length === 9 && digits.startsWith("7")) return "254" + digits;
  return digits;
}

// ── Response Interfaces ─────────────────────────────────────────────────────
export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface StkStatusResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode?: string;
  ResultDesc?: string;
}

export interface AsyncResponse {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

// ── Main M-Pesa Service Object ──────────────────────────────────────────────
export const mpesa = {
  // ── STK Push ─────────────────────────────────────────────────────────────
  async stkPush(params: {
    phone: string;
    amount: number;
    account_reference?: string;
    transaction_desc?: string;
    callback_url?: string; // optional override
  }): Promise<{ success: boolean; checkout_request_id: string | null; data?: StkPushResponse }> {
    const token = await getAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(timestamp);

    const payload = {
      BusinessShortCode: MPESA_BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(params.amount),
      PartyA: formatPhone(params.phone),
      PartyB: MPESA_BUSINESS_SHORT_CODE,
      PhoneNumber: formatPhone(params.phone),
      CallBackURL: params.callback_url || `${MPESA_CALLBACK_URL}/stk-callback`,
      AccountReference: (params.account_reference || "MATATU_PULSE").slice(0, 12),
      TransactionDesc: (params.transaction_desc || "Payment").slice(0, 13),
    };

    const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || data.ResponseCode !== "0") {
      console.error("STK Push failed:", data);
      return {
        success: false,
        checkout_request_id: null,
        data,
      };
    }

    return {
      success: true,
      checkout_request_id: data.CheckoutRequestID,
      data: data as StkPushResponse,
    };
  },

  // ── Query STK Status ─────────────────────────────────────────────────────
  async queryStkStatus(checkoutRequestId: string): Promise<StkStatusResponse> {
    const token = await getAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(timestamp);

    const payload = {
      BusinessShortCode: MPESA_BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return res.json();
  },

  // ── B2C Payment (Tips, etc.) ─────────────────────────────────────────────
  async sendB2CPayment(params: {
    phoneNumber: string;
    amount: number;
    remarks?: string;
    occasion?: string;
  }): Promise<AsyncResponse> {
    const token = await getAccessToken();

    const payload = {
      InitiatorName: MPESA_INITIATOR_NAME,
      SecurityCredential: MPESA_INITIATOR_PASSWORD,
      CommandID: "BusinessPayment",
      Amount: Math.round(params.amount),
      PartyA: MPESA_B2C_SHORT_CODE,
      PartyB: formatPhone(params.phoneNumber),
      Remarks: (params.remarks ?? "Tip payout").slice(0, 100),
      QueueTimeOutURL: `${MPESA_CALLBACK_URL}/b2c-timeout`,
      ResultURL: `${MPESA_CALLBACK_URL}/b2c-callback`,
      Occasion: (params.occasion ?? "Tip payout").slice(0, 100),
    };

    const res = await fetch(`${BASE_URL}/mpesa/b2c/v1/paymentrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.ResponseCode !== "0") {
      throw new Error(data?.errorMessage ?? data?.ResponseDescription ?? "B2C failed");
    }

    return data as AsyncResponse;
  },

  // ── B2B Payment (SACCO settlements) ───────────────────────────────────────
  async sendB2BPayment(params: {
    shortcode: string;
    amount: number;
    remarks?: string;
    accountReference?: string;
  }): Promise<AsyncResponse> {
    const token = await getAccessToken();

    const payload = {
      Initiator: MPESA_INITIATOR_NAME,
      SecurityCredential: MPESA_INITIATOR_PASSWORD,
      CommandID: "BusinessPayBill",
      SenderIdentifierType: "4",
      RecieverIdentifierType: "4",
      Amount: Math.round(params.amount),
      PartyA: MPESA_B2B_SHORT_CODE,
      PartyB: params.shortcode,
      AccountReference: (params.accountReference ?? "SETTLEMENT").slice(0, 12),
      Remarks: (params.remarks ?? "Revenue share settlement").slice(0, 100),
      QueueTimeOutURL: `${MPESA_CALLBACK_URL}/b2b-timeout`,
      ResultURL: `${MPESA_CALLBACK_URL}/b2b-callback`,
    };

    const res = await fetch(`${BASE_URL}/mpesa/b2b/v1/paymentrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.ResponseCode !== "0") {
      throw new Error(data?.errorMessage ?? data?.ResponseDescription ?? "B2B failed");
    }

    return data as AsyncResponse;
  },

  // ── Transaction Status Query ─────────────────────────────────────────────
  async queryTransactionStatus(transactionId: string) {
    const token = await getAccessToken();

    const payload = {
      Initiator: MPESA_INITIATOR_NAME,
      SecurityCredential: MPESA_INITIATOR_PASSWORD,
      CommandID: "TransactionStatusQuery",
      TransactionID: transactionId,
      PartyA: MPESA_BUSINESS_SHORT_CODE,
      IdentifierType: "4",
      ResultURL: `${MPESA_CALLBACK_URL}/status-callback`,
      QueueTimeOutURL: `${MPESA_CALLBACK_URL}/status-timeout`,
      Remarks: "Status check",
      Occasion: "Status",
    };

    const res = await fetch(`${BASE_URL}/mpesa/transactionstatus/v1/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return res.json();
  },
};