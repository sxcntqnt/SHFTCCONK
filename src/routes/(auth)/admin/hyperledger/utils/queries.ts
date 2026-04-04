// src/routes/admin/hyperledger/queries.ts
// Admin read-only ledger queries.
// Called from +page.server.ts load functions to populate the admin UI.
// Uses evaluateTransaction (no consensus, no ledger write).

import { adminQuery } from "./contractHelper"

// ─── Platform-wide queries ────────────────────────────────────────────────────

/**
 * Get all registered orgs on the ledger.
 * Used on the admin hyperledger dashboard.
 */
export async function getAllOrgs() {
  return adminQuery("platform-contract", "GetAllOrgs", [])
}

/**
 * Get all fleet vehicles across all orgs.
 * Admin-level visibility — org users only see their own via org routes.
 */
export async function getAllVehicles() {
  return adminQuery("fleet-contract", "GetAllVehicles", [])
}

/**
 * Get all vehicles for a specific org.
 */
export async function getOrgVehicles(orgId: string) {
  return adminQuery("fleet-contract", "GetOrgVehicles", [orgId])
}

/**
 * Get all drivers across all orgs.
 */
export async function getAllDrivers() {
  return adminQuery("fleet-contract", "GetAllDrivers", [])
}

/**
 * Get full trip history for a vehicle (immutable audit trail).
 */
export async function getVehicleTripHistory(vehicleId: string) {
  return adminQuery("fleet-contract", "GetVehicleHistory", [vehicleId])
}

/**
 * Get platform-wide wallet transaction history.
 */
export async function getPlatformWalletHistory() {
  return adminQuery("finance-contract", "GetPlatformWalletHistory", [])
}

/**
 * Get all compliance events platform-wide (or filtered by orgId).
 */
export async function getComplianceEvents(orgId?: string) {
  const args = orgId ? [orgId] : []
  return adminQuery("compliance-contract", "GetAllComplianceEvents", args)
}

/**
 * Get full audit log for a specific user/device identity.
 * Links blockchain actions to a specific enrolled userId.
 */
export async function getIdentityAuditLog(userId: string) {
  return adminQuery("platform-contract", "GetIdentityAuditLog", [userId])
}

/**
 * Get ledger stats summary (total txs, active orgs, vehicles, etc.).
 * Useful for the admin dashboard header cards.
 */
export async function getLedgerStats() {
  return adminQuery("platform-contract", "GetLedgerStats", [])
}
