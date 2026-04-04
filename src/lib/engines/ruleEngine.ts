// lib/compliance/ruleEngine.ts
export type ComplianceType = "INSURANCE" | "INSPECTION" | "PSV_LICENSE"
export type ComplianceStatus = "OK" | "WARNING" | "EXPIRED"
export type ComplianceSeverity = "LOW" | "MEDIUM" | "CRITICAL"

export interface ComplianceItem {
  vehicleId: string
  organizationId?: string // Optional tenant context for logging or multi-tenant use
  type: ComplianceType
  expiryDate: string
  metadata?: Record<string, any>
}

export interface ComplianceResult {
  vehicleId: string
  type: ComplianceType
  status: ComplianceStatus
  severity: ComplianceSeverity
  daysUntilExpiry: number
}

/* ============================================================
   EVALUATE A SINGLE COMPLIANCE ITEM
   Returns status, severity, and days until expiry
============================================================ */
export function evaluateCompliance(item: ComplianceItem): ComplianceResult {
  if (!item.vehicleId || !item.type || !item.expiryDate) {
    throw new Error("Invalid ComplianceItem: missing required fields")
  }

  const today = new Date()
  const expiry = new Date(item.expiryDate)

  if (isNaN(expiry.getTime())) {
    throw new Error(`Invalid expiryDate for vehicle ${item.vehicleId}`)
  }

  const diffDays = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )

  let status: ComplianceStatus = "OK"
  let severity: ComplianceSeverity = "LOW"

  if (diffDays < 0) {
    status = "EXPIRED"
    severity = "CRITICAL"
  } else if (diffDays <= 30) {
    status = "WARNING"
    severity = "MEDIUM"
  }

  return {
    vehicleId: item.vehicleId,
    type: item.type,
    status,
    severity,
    daysUntilExpiry: diffDays,
  }
}

/* ============================================================
   BATCH EVALUATION UTILITY
   Returns results for an array of compliance items
============================================================ */
export function evaluateComplianceBatch(
  items: ComplianceItem[],
): ComplianceResult[] {
  return items.map((item) => evaluateCompliance(item))
}
