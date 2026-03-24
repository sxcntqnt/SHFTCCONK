// src/routes/org/[orgId]/hyperledger/transactions.ts
// Org-scoped ledger write operations.
// Each function maps to a typed chaincode call via contracts.ts.
// Called from the POST /submit +server.ts and from +page.server.ts actions.

import { getOrgContract, type OrgConnectionContext } from './connection';
import { WRITE_CONTRACTS, type OrgRole } from './contracts';

// ─── Internal submit helper ───────────────────────────────────────────────────

async function submit(
  ctx: OrgConnectionContext,
  contractKey: keyof typeof WRITE_CONTRACTS,
  args: string[]
): Promise<{ success: boolean; txId?: string; data?: unknown; error?: string }> {
  const def = WRITE_CONTRACTS[contractKey];
  if (!def) throw new Error(`Unknown write contract: ${contractKey}`);

  const { gateway, contract } = await getOrgContract(ctx, def.chaincode);
  try {
    const bytes = await contract.submitTransaction(def.fn, ...args);
    const raw = Buffer.from(bytes).toString('utf8');
    let data: unknown = raw;
    try { data = JSON.parse(raw); } catch { /* plain string */ }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: String(err) };
  } finally {
    gateway.close();
  }
}

// ─── Role check helper ─────────────────────────────────────────────────────────

export function assertRole(userRole: string, contractKey: keyof typeof WRITE_CONTRACTS): void {
  const def = WRITE_CONTRACTS[contractKey];
  if (!def.requiredRoles.includes(userRole as OrgRole)) {
    throw new Error(
      `Role "${userRole}" cannot perform "${contractKey}". ` +
      `Allowed: ${def.requiredRoles.join(', ')}`
    );
  }
}

// ─── Fleet transactions ───────────────────────────────────────────────────────

export async function assignDriver(
  ctx: OrgConnectionContext,
  vehicleId: string,
  driverUserId: string,
  startDate = new Date().toISOString()
) {
  return submit(ctx, 'AssignDriver', [vehicleId, driverUserId, startDate]);
}

export async function unassignDriver(
  ctx: OrgConnectionContext,
  vehicleId: string,
  driverUserId: string,
  reason: string
) {
  return submit(ctx, 'UnassignDriver', [vehicleId, driverUserId, new Date().toISOString(), reason]);
}

export async function updateVehicleStatus(
  ctx: OrgConnectionContext,
  vehicleId: string,
  status: string,
  note = ''
) {
  return submit(ctx, 'UpdateVehicleStatus', [vehicleId, status, note]);
}

export async function logTripCompletion(
  ctx: OrgConnectionContext,
  vehicleId: string,
  driverUserId: string,
  distanceKm: number,
  startTime: string,
  endTime: string
) {
  return submit(ctx, 'LogTripCompletion', [
    vehicleId,
    driverUserId,
    String(distanceKm),
    startTime,
    endTime,
  ]);
}

// ─── Driver transactions ──────────────────────────────────────────────────────

export async function updateDriverStatus(
  ctx: OrgConnectionContext,
  driverUserId: string,
  status: string,
  reason = ''
) {
  return submit(ctx, 'UpdateDriverStatus', [driverUserId, status, reason]);
}

// ─── Finance / wallet transactions ────────────────────────────────────────────

export async function recordWalletTopUp(
  ctx: OrgConnectionContext,
  walletId: string,
  amount: number,
  currency: string,
  reference: string
) {
  return submit(ctx, 'RecordWalletTopUp', [walletId, String(amount), currency, reference]);
}

export async function reconcileTripPayment(
  ctx: OrgConnectionContext,
  tripId: string,
  walletId: string,
  amount: number,
  method: string
) {
  return submit(ctx, 'ReconcileTripPayment', [tripId, walletId, String(amount), method]);
}

export async function deductDriverPenalty(
  ctx: OrgConnectionContext,
  driverUserId: string,
  walletId: string,
  amount: number,
  reason: string
) {
  return submit(ctx, 'DeductDriverPenalty', [driverUserId, walletId, String(amount), reason]);
}

// ─── Compliance transactions ──────────────────────────────────────────────────

export async function logComplianceEvent(
  ctx: OrgConnectionContext,
  entityId: string,
  entityType: string,
  eventType: string,
  details: string
) {
  return submit(ctx, 'LogComplianceEvent', [
    entityId,
    entityType,
    eventType,
    details,
    new Date().toISOString(),
  ]);
}

export async function updateComplianceStatus(
  ctx: OrgConnectionContext,
  entityId: string,
  status: string,
  note = ''
) {
  return submit(ctx, 'UpdateComplianceStatus', [entityId, status, note]);
}

// ─── Device transactions ──────────────────────────────────────────────────────

export async function registerDeviceOnChain(
  ctx: OrgConnectionContext,
  deviceId: string,
  vehicleId: string
) {
  return submit(ctx, 'RegisterDeviceOnChain', [
    deviceId,
    vehicleId,
    ctx.orgId,
    new Date().toISOString(),
  ]);
}

export async function updateDeviceLocation(
  ctx: OrgConnectionContext,
  deviceId: string,
  lat: string,
  lng: string
) {
  return submit(ctx, 'UpdateDeviceLocation', [deviceId, lat, lng, new Date().toISOString()]);
}