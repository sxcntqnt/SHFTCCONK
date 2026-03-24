// src/routes/org/[orgId]/hyperledger/query/+server.ts
// GET /org/[orgId]/hyperledger/query
// Read-only ledger queries (evaluateTransaction — no consensus, no write).
// Used by: audit logs, wallet history, vehicle history, driver records, compliance dashboard.
//
// Usage:
//   GET /org/abc/hyperledger/query?fn=GetVehicleHistory&args=["v123"]
//   GET /org/abc/hyperledger/query?fn=GetWalletBalance&args=["wallet-001"]
//   GET /org/abc/hyperledger/query?fn=GetDriverRecord&args=["driver-007"]
//   GET /org/abc/hyperledger/query?fn=GetComplianceEvents&args=["v123","2024-01-01","2024-12-31"]

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { evaluateTransaction } from '$lib/hyperledger/gateway';
import { env } from '$env/dynamic/private';

// ─── Read-only query map ──────────────────────────────────────────────────────
// Maps query function names to their chaincode.
// Only queries listed here can be called — no open-ended execution.

const QUERY_MAP: Record<string, { chaincode: string; allowedRoles: string[] }> = {
  // Fleet / vehicle history
  GetVehicleHistory:     { chaincode: 'fleet-contract',      allowedRoles: ['driver', 'fleet-manager', 'org-admin', 'platform-admin'] },
  GetVehicleStatus:      { chaincode: 'fleet-contract',      allowedRoles: ['driver', 'fleet-manager', 'org-admin'] },
  GetFleetSummary:       { chaincode: 'fleet-contract',      allowedRoles: ['fleet-manager', 'org-admin'] },

  // Driver records
  GetDriverRecord:       { chaincode: 'fleet-contract',      allowedRoles: ['driver', 'fleet-manager', 'org-admin'] },
  GetDriverTrips:        { chaincode: 'fleet-contract',      allowedRoles: ['driver', 'fleet-manager', 'org-admin'] },

  // Finance / wallet
  GetWalletBalance:      { chaincode: 'finance-contract',    allowedRoles: ['driver', 'fleet-manager', 'org-admin'] },
  GetWalletHistory:      { chaincode: 'finance-contract',    allowedRoles: ['fleet-manager', 'org-admin'] },
  GetPaymentRecord:      { chaincode: 'finance-contract',    allowedRoles: ['fleet-manager', 'org-admin'] },

  // Compliance
  GetComplianceEvents:   { chaincode: 'compliance-contract', allowedRoles: ['fleet-manager', 'org-admin', 'platform-admin'] },
  GetComplianceStatus:   { chaincode: 'compliance-contract', allowedRoles: ['driver', 'fleet-manager', 'org-admin'] },

  // Audit (admin / manager only)
  GetAuditLog:           { chaincode: 'fleet-contract',      allowedRoles: ['org-admin', 'platform-admin'] },
};

// ─── Auth guard ───────────────────────────────────────────────────────────────

function requireOrgMember(locals: App.Locals, orgId: string) {
  if (!locals.user) throw error(401, 'Unauthenticated');
  if (locals.user.orgId !== orgId && locals.user.role !== 'platform-admin') {
    throw error(403, `Forbidden: not a member of org ${orgId}`);
  }
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ url, params, locals }) => {
  const { orgId } = params;
  requireOrgMember(locals, orgId);

  const fn = url.searchParams.get('fn');
  const argsParam = url.searchParams.get('args'); // JSON-encoded array e.g. '["v123"]'

  if (!fn) throw error(400, 'Missing required query param: fn');

  const mapped = QUERY_MAP[fn];
  if (!mapped) {
    throw error(
      400,
      `Unknown query function: "${fn}". Allowed: ${Object.keys(QUERY_MAP).join(', ')}`
    );
  }

  // Role check
  const userRole = locals.user.fabricRole ?? locals.user.role;
  if (!mapped.allowedRoles.includes(userRole)) {
    throw error(
      403,
      `Role "${userRole}" cannot query "${fn}". Allowed roles: ${mapped.allowedRoles.join(', ')}`
    );
  }

  // Parse args
  let args: string[] = [];
  if (argsParam) {
    try {
      const parsed = JSON.parse(argsParam);
      if (!Array.isArray(parsed)) throw new Error('args must be a JSON array');
      args = parsed.map(String);
    } catch {
      throw error(400, 'Invalid "args" param — must be a JSON-encoded array e.g. ?args=["v123"]');
    }
  }

  const result = await evaluateTransaction({
    userId: locals.user.fabricUserId ?? locals.user.id,
    orgId,
    channel: env.FABRIC_CHANNEL ?? 'mychannel',
    chaincode: mapped.chaincode,
    fn,
    args,
  });

  return json({
    success: true,
    fn,
    data: result.result,
  });
};