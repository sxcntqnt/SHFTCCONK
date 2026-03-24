// src/routes/org/[orgId]/hyperledger/ledgerQueries.ts
// Org-scoped read-only ledger queries.
// Used by +page.server.ts load functions and the GET /query +server.ts endpoint.
// All functions use evaluateTransaction — no ledger writes, no consensus needed.

import { getOrgContract, type OrgConnectionContext } from './connection';
import { READ_CONTRACTS, type OrgRole } from './contracts';

// ─── Internal helper ──────────────────────────────────────────────────────────

async function evaluate(
  ctx: OrgConnectionContext,
  contractKey: keyof typeof READ_CONTRACTS,
  args: string[]
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const def = READ_CONTRACTS[contractKey];
  if (!def) throw new Error(`Unknown query contract: ${contractKey}`);

  const { gateway, contract } = await getOrgContract(ctx, def.chaincode);
  try {
    const bytes = await contract.evaluateTransaction(def.fn, ...args);
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

export function assertRole(
  userRole: string,
  contractKey: keyof typeof READ_CONTRACTS
): void {
  const def = READ_CONTRACTS[contractKey];
  if (!def.requiredRoles.includes(userRole as OrgRole)) {
    throw new Error(
      `Role "${userRole}" cannot call "${contractKey}". ` +
      `Allowed: ${def.requiredRoles.join(', ')}`
    );
  }
}

// ─── Fleet queries ────────────────────────────────────────────────────────────

export async function getVehicleStatus(ctx: OrgConnectionContext, vehicleId: string) {
  return evaluate(ctx, 'GetVehicleStatus', [vehicleId]);
}

export async function getVehicleHistory(ctx: OrgConnectionContext, vehicleId: string) {
  return evaluate(ctx, 'GetVehicleHistory', [vehicleId]);
}

export async function getFleetSummary(ctx: OrgConnectionContext) {
  return evaluate(ctx, 'GetFleetSummary', [ctx.orgId]);
}

export async function getActiveAssignment(ctx: OrgConnectionContext, vehicleId: string) {
  return evaluate(ctx, 'GetActiveAssignment', [vehicleId]);
}

// ─── Driver queries ───────────────────────────────────────────────────────────

export async function getDriverRecord(ctx: OrgConnectionContext, driverUserId: string) {
  return evaluate(ctx, 'GetDriverRecord', [driverUserId]);
}

export async function getDriverTrips(
  ctx: OrgConnectionContext,
  driverUserId: string,
  fromDate: string,
  toDate: string
) {
  return evaluate(ctx, 'GetDriverTrips', [driverUserId, fromDate, toDate]);
}

// ─── Finance / wallet queries ─────────────────────────────────────────────────

export async function getWalletBalance(ctx: OrgConnectionContext, walletId: string) {
  return evaluate(ctx, 'GetWalletBalance', [walletId]);
}

export async function getWalletHistory(
  ctx: OrgConnectionContext,
  walletId: string,
  fromDate: string,
  toDate: string
) {
  return evaluate(ctx, 'GetWalletHistory', [walletId, fromDate, toDate]);
}

export async function getPaymentRecord(ctx: OrgConnectionContext, paymentId: string) {
  return evaluate(ctx, 'GetPaymentRecord', [paymentId]);
}

// ─── Compliance queries ───────────────────────────────────────────────────────

export async function getComplianceEvents(
  ctx: OrgConnectionContext,
  fromDate: string,
  toDate: string
) {
  return evaluate(ctx, 'GetComplianceEvents', [ctx.orgId, fromDate, toDate]);
}

export async function getComplianceStatus(ctx: OrgConnectionContext, entityId: string) {
  return evaluate(ctx, 'GetComplianceStatus', [entityId]);
}

// ─── Audit log (org-admin only) ───────────────────────────────────────────────

export async function getOrgAuditLog(
  ctx: OrgConnectionContext,
  fromDate: string,
  toDate: string
) {
  return evaluate(ctx, 'GetAuditLog', [ctx.orgId, fromDate, toDate]);
}