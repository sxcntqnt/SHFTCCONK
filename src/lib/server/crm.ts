import { env } from "$env/dynamic/private"

// ─────────────────────────────
// Types
// ─────────────────────────────

export interface ContactSubmission {
  first: string
  last: string
  email: string
  phone?: string
  org?: string
  type?: string
  message: string
}

export interface CreateLeadPayload {
  title: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  status: "new"
  source: "website_form"
  custom_fields: {
    enquiry_type: string
    organisation: string
    message: string
    source_page: string
    ip_address: string
    submitted_at: string
    has_phone: boolean
  }
}

export interface BottleCrmLead {
  id: string
  title: string
  first_name: string
  last_name: string
  email: string
  status: string
  source: string
  custom_fields: Record<string, unknown>
  created_at: string
}

export class CrmError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    super(`CRM request failed with status ${status}`)
    this.name = "CrmError"
    this.status = status
    this.body = body
  }
}

// ─────────────────────────────
// Title generation
// ─────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  "Operator / Sacco Demo": "Operator Demo",
  "Partnership Enquiry": "Partnership Enquiry",
  "Press / Media": "Press Enquiry",
  "Technical Support": "Technical Support",
  "API / Developer Access": "API Access Request",
  "Rider Question": "Rider Question",
  Other: "General Enquiry",
}

function buildTitle(sanitized: ContactSubmission): string {
  const label = TYPE_LABELS[sanitized.type ?? ""] ?? "Website Enquiry"

  if (sanitized.org) {
    return `${label} — ${sanitized.org}`
  }

  return `${label} — ${sanitized.first} ${sanitized.last}`
}

// ─────────────────────────────
// Payload mapping
// ─────────────────────────────

export function toLeadPayload(
  sanitized: ContactSubmission,
  ip: string,
): CreateLeadPayload {
  return {
    title: buildTitle(sanitized),
    first_name: sanitized.first,
    last_name: sanitized.last,
    email: sanitized.email,
    phone: sanitized.phone || undefined,
    status: "new",
    source: "website_form",
    custom_fields: {
      enquiry_type: sanitized.type || "unknown",
      organisation: sanitized.org || "",
      message: sanitized.message,
      source_page: "/contact_us",
      ip_address: ip,
      submitted_at: new Date().toISOString(),
      has_phone: Boolean(sanitized.phone),
    },
  }
}

// ─────────────────────────────
// CRM client
// ─────────────────────────────

const CRM_URL = env.CRM_URL
const CRM_TOKEN = env.CRM_TOKEN
const CRM_TIMEOUT_MS = 8000

async function crmFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CRM_TIMEOUT_MS)

  try {
    return await fetch(`${CRM_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${CRM_TOKEN}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Creates a lead in BottleCRM from a validated, sanitized contact
 * submission. Throws CrmError on any non-2xx response so the caller
 * can decide how to log/fail.
 */
export async function createLead(
  sanitized: ContactSubmission,
  ip: string,
): Promise<BottleCrmLead> {
  const payload = toLeadPayload(sanitized, ip)

  const response = await crmFetch("/api/leads/", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      // non-JSON error body, ignore
    }
    throw new CrmError(response.status, body)
  }

  return response.json()
}
