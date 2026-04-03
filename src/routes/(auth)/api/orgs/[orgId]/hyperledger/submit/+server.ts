// src/routes/org/[orgId]/hyperledger/submit/+server.ts
// POST /org/[orgId]/hyperledger/submit
// Submits a signed transaction to Fabric on behalf of an authenticated org user.
// No enrollment here — identities must already exist in Vault (admin enrolled them).
//
// Supported actions (maps to chaincode functions):
//   fleet     → AssignDriver, UpdateVehicleStatus, LogTripCompletion
//   drivers   → UpdateDriverStatus, AssignVehicle
//   finance   → RecordWalletTopUp, ReconcileTripPayment
//   compliance→ LogComplianceEvent, UpdateComplianceStatus
//   devices   → RegisterDeviceOnChain, UpdateDeviceLocation

import { json, error } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { submitTransaction } from "$lib/hyperledger/gateway"
import { env } from "$env/dynamic/private"

// ─── Allowed chaincode actions per feature ────────────────────────────────────
// This map is your HTTP → chaincode contract.
// Chaincode enforces ABAC (role checks) as second layer.

const ACTION_MAP: Record<
  string,
  { chaincode: string; fn: string; requiredRole: string[] }
> = {
  // fleet
  AssignDriver: {
    chaincode: "fleet-contract",
    fn: "AssignDriver",
    requiredRole: ["fleet-manager", "org-admin"],
  },
  UpdateVehicleStatus: {
    chaincode: "fleet-contract",
    fn: "UpdateVehicleStatus",
    requiredRole: ["fleet-manager", "org-admin"],
  },
  LogTripCompletion: {
    chaincode: "fleet-contract",
    fn: "LogTripCompletion",
    requiredRole: ["driver", "fleet-manager"],
  },

  // drivers
  UpdateDriverStatus: {
    chaincode: "fleet-contract",
    fn: "UpdateDriverStatus",
    requiredRole: ["fleet-manager", "org-admin"],
  },
  AssignVehicle: {
    chaincode: "fleet-contract",
    fn: "AssignVehicle",
    requiredRole: ["fleet-manager", "org-admin"],
  },

  // finance / wallet
  RecordWalletTopUp: {
    chaincode: "finance-contract",
    fn: "RecordWalletTopUp",
    requiredRole: ["org-admin", "fleet-manager"],
  },
  ReconcileTripPayment: {
    chaincode: "finance-contract",
    fn: "ReconcileTripPayment",
    requiredRole: ["fleet-manager", "org-admin"],
  },

  // compliance
  LogComplianceEvent: {
    chaincode: "compliance-contract",
    fn: "LogComplianceEvent",
    requiredRole: ["fleet-manager", "org-admin", "iot-device"],
  },
  UpdateComplianceStatus: {
    chaincode: "compliance-contract",
    fn: "UpdateComplianceStatus",
    requiredRole: ["fleet-manager", "org-admin"],
  },

  // devices (pair flow — after device is already enrolled at CA level by admin)
  RegisterDeviceOnChain: {
    chaincode: "fleet-contract",
    fn: "RegisterDeviceOnChain",
    requiredRole: ["org-admin", "fleet-manager"],
  },
  UpdateDeviceLocation: {
    chaincode: "fleet-contract",
    fn: "UpdateDeviceLocation",
    requiredRole: ["iot-device", "fleet-manager"],
  },
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

function requireOrgMember(locals: App.Locals, orgId: string) {
  if (!locals.user) throw error(401, "Unauthenticated")
  if (locals.user.orgId !== orgId && locals.user.role !== "platform-admin") {
    throw error(403, `Forbidden: not a member of org ${orgId}`)
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, params, locals }) => {
  const { orgId } = params
  requireOrgMember(locals, orgId)

  const body = await request.json()
  const { action, args = [] } = body

  if (!action) throw error(400, "Missing required field: action")

  const mapped = ACTION_MAP[action]
  if (!mapped) {
    throw error(
      400,
      `Unknown action: "${action}". Allowed: ${Object.keys(ACTION_MAP).join(", ")}`,
    )
  }

  // Role check at HTTP layer (before we even hit the gateway)
  const userRole = locals.user.fabricRole ?? locals.user.role
  if (!mapped.requiredRole.includes(userRole)) {
    throw error(
      403,
      `Role "${userRole}" is not permitted to perform action "${action}". ` +
        `Allowed roles: ${mapped.requiredRole.join(", ")}`,
    )
  }

  if (!Array.isArray(args)) {
    throw error(400, 'Field "args" must be an array of strings')
  }

  const result = await submitTransaction({
    userId: locals.user.fabricUserId ?? locals.user.id,
    orgId,
    channel: env.FABRIC_CHANNEL ?? "mychannel",
    chaincode: mapped.chaincode,
    fn: mapped.fn,
    args: args.map(String),
  })

  return json({
    success: true,
    action,
    data: result,
  })
}
