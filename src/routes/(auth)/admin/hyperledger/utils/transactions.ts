// src/routes/admin/hyperledger/transactions.ts
// Admin-level ledger write operations.
// These are platform-wide actions only the admin identity can submit.
// Org-level writes live in org/[orgId]/hyperledger/transactions.ts.

import { adminSubmit } from './contractHelper';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrgOnboardPayload {
  orgId: string;
  orgName: string;
  adminUserId: string;
  plan?: string; // e.g. 'basic' | 'enterprise'
}

export interface VehicleCreatePayload {
  vehicleId: string;
  orgId: string;
  plate: string;
  make: string;
  model: string;
  year: string;
}

// ─── Platform-wide transactions ───────────────────────────────────────────────

/**
 * Register a new org on the ledger when they onboard to the platform.
 * Call this after org is created in your DB.
 */
export async function onboardOrgToLedger(payload: OrgOnboardPayload) {
  const { orgId, orgName, adminUserId, plan = 'basic' } = payload;
  return adminSubmit('platform-contract', 'RegisterOrg', [
    orgId,
    orgName,
    adminUserId,
    plan,
    new Date().toISOString(),
  ]);
}

/**
 * Deactivate an org on the ledger (offboarding / suspension).
 * Does not delete — ledger is immutable. Sets status to INACTIVE.
 */
export async function deactivateOrgOnLedger(orgId: string, reason: string) {
  return adminSubmit('platform-contract', 'DeactivateOrg', [
    orgId,
    reason,
    new Date().toISOString(),
  ]);
}

/**
 * Register a vehicle on the ledger (admin creates, org uses).
 * Called when fleet manager adds a vehicle — admin countersigns on-chain.
 */
export async function createVehicleOnLedger(payload: VehicleCreatePayload) {
  const { vehicleId, orgId, plate, make, model, year } = payload;
  return adminSubmit('fleet-contract', 'CreateVehicle', [
    vehicleId,
    orgId,
    plate,
    make,
    model,
    year,
    new Date().toISOString(),
  ]);
}

/**
 * Flag a device as compromised on the ledger (after CA revocation).
 * Chaincode will reject any future txs from this deviceId.
 */
export async function flagDeviceCompromised(deviceId: string, reason: string) {
  return adminSubmit('fleet-contract', 'FlagDeviceCompromised', [
    deviceId,
    reason,
    new Date().toISOString(),
  ]);
}

/**
 * Record a platform-level compliance violation for audit purposes.
 */
export async function recordPlatformComplianceEvent(
  entityId: string,
  entityType: 'org' | 'vehicle' | 'driver' | 'device',
  eventType: string,
  details: string
) {
  return adminSubmit('compliance-contract', 'RecordPlatformEvent', [
    entityId,
    entityType,
    eventType,
    details,
    new Date().toISOString(),
  ]);
}