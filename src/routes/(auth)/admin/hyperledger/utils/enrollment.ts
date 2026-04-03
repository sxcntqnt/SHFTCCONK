// src/routes/admin/hyperledger/enrollment.ts
// Admin enrollment helpers — collocated with the admin route folder.
// This is a thin domain wrapper over $lib/hyperledger/ca.ts.
// It adds admin-route-specific logic: logging, audit trail, error messaging.
// The actual CA calls live in the lib layer.

import {
  enrollAdmin as libEnrollAdmin,
  registerAndEnrollUser as libRegisterUser,
  registerDevice as libRegisterDevice,
  revokeIdentity as libRevokeIdentity,
  type EnrollUserPayload,
  type EnrollDevicePayload,
} from "$lib/hyperledger/ca"

import { recordPlatformComplianceEvent } from "./transactions"

// Re-export types so callers only need to import from this file
export type { EnrollUserPayload, EnrollDevicePayload }

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * One-time bootstrap: enroll the platform admin identity.
 * Should be called from a startup script, not an HTTP endpoint.
 * Safe to call again — will throw if admin is already enrolled at CA.
 */
export async function bootstrapAdmin(): Promise<void> {
  console.log("[Enrollment] Bootstrapping platform admin...")
  await libEnrollAdmin()
  console.log("[Enrollment] Platform admin ready.")
}

// ─── User / driver enrollment ─────────────────────────────────────────────────

/**
 * Register and enroll an org user (driver, fleet-manager, org-admin).
 * Stores identity in Vault. Records event on ledger.
 */
export async function enrollUser(payload: EnrollUserPayload) {
  const result = await libRegisterUser(payload)

  // Write an audit event to the ledger (non-blocking — don't fail enrollment if this fails)
  recordPlatformComplianceEvent(
    payload.userId,
    "driver", // closest entity type for ledger
    "USER_ENROLLED",
    `Role: ${payload.role}, Org: ${payload.orgId}`,
  ).catch((err) =>
    console.warn("[Enrollment] Ledger audit write failed (non-fatal):", err),
  )

  return result
}

// ─── Device enrollment ────────────────────────────────────────────────────────

/**
 * Register and enroll an IoT device.
 * Returns the raw private key — caller must securely transmit to device once.
 */
export async function enrollDevice(payload: EnrollDevicePayload) {
  const result = await libRegisterDevice(payload)

  // Flag on ledger that this device was registered
  recordPlatformComplianceEvent(
    payload.deviceId,
    "device",
    "DEVICE_ENROLLED",
    `Vehicle: ${payload.vehicleId ?? "unassigned"}, Org: ${payload.orgId}`,
  ).catch((err) =>
    console.warn("[Enrollment] Ledger audit write failed (non-fatal):", err),
  )

  return result
}

// ─── Revocation ───────────────────────────────────────────────────────────────

/**
 * Revoke an identity at the CA level and soft-mark it in Vault.
 * Also flags the entity on the ledger if it's a device.
 */
export async function revokeUser(
  userId: string,
  reason: string = "privilegewithdrawn",
  entityType: "org" | "vehicle" | "driver" | "device" = "driver",
) {
  await libRevokeIdentity(userId, reason)

  // If it's a device, flag it on-chain so chaincode rejects future txs
  if (entityType === "device") {
    await recordPlatformComplianceEvent(
      userId,
      "device",
      "DEVICE_REVOKED",
      `Reason: ${reason}`,
    ).catch((err) =>
      console.warn(
        "[Enrollment] On-chain device flag failed (non-fatal):",
        err,
      ),
    )
  } else {
    await recordPlatformComplianceEvent(
      userId,
      entityType,
      "IDENTITY_REVOKED",
      `Reason: ${reason}`,
    ).catch((err) =>
      console.warn(
        "[Enrollment] On-chain revocation event failed (non-fatal):",
        err,
      ),
    )
  }
}
