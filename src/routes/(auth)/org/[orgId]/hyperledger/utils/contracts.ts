// src/routes/org/[orgId]/hyperledger/contracts.ts
// Org-specific smart contract definitions.
// Centralises: chaincode names, function names, arg shapes, and role requirements.
// Both transactions.ts and ledgerQueries.ts import from here.
// This is the org-level equivalent of the admin ACTION_MAP — but typed and richer.

// ─── Chaincode names ──────────────────────────────────────────────────────────
// Match exactly what's installed on your Fabric peer.

export const CHAINCODES = {
  FLEET: "fleet-contract",
  FINANCE: "finance-contract",
  COMPLIANCE: "compliance-contract",
} as const

export type ChaincodeName = (typeof CHAINCODES)[keyof typeof CHAINCODES]

// ─── Role constants ───────────────────────────────────────────────────────────
// Must match the 'role' attribute embedded in X.509 certs at enrollment.

export const ROLES = {
  ORG_ADMIN: "org-admin",
  FLEET_MANAGER: "fleet-manager",
  DRIVER: "driver",
  IOT_DEVICE: "iot-device",
} as const

export type OrgRole = (typeof ROLES)[keyof typeof ROLES]

// ─── Contract definitions ─────────────────────────────────────────────────────

export interface ContractDef {
  chaincode: ChaincodeName
  fn: string
  requiredRoles: OrgRole[]
  argShape: string[] // documents expected arg order — for validation/documentation
}

// Write operations
export const WRITE_CONTRACTS: Record<string, ContractDef> = {
  // ── Fleet ──────────────────────────────────────────────────────────────────
  AssignDriver: {
    chaincode: CHAINCODES.FLEET,
    fn: "AssignDriver",
    requiredRoles: [ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["vehicleId", "driverUserId", "startDate"],
  },
  UnassignDriver: {
    chaincode: CHAINCODES.FLEET,
    fn: "UnassignDriver",
    requiredRoles: [ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["vehicleId", "driverUserId", "endDate", "reason"],
  },
  UpdateVehicleStatus: {
    chaincode: CHAINCODES.FLEET,
    fn: "UpdateVehicleStatus",
    requiredRoles: [ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["vehicleId", "status", "note"],
  },
  LogTripCompletion: {
    chaincode: CHAINCODES.FLEET,
    fn: "LogTripCompletion",
    requiredRoles: [ROLES.DRIVER, ROLES.FLEET_MANAGER],
    argShape: [
      "vehicleId",
      "driverUserId",
      "distanceKm",
      "startTime",
      "endTime",
    ],
  },

  // ── Drivers ────────────────────────────────────────────────────────────────
  UpdateDriverStatus: {
    chaincode: CHAINCODES.FLEET,
    fn: "UpdateDriverStatus",
    requiredRoles: [ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["driverUserId", "status", "reason"],
  },

  // ── Finance / Wallet ───────────────────────────────────────────────────────
  RecordWalletTopUp: {
    chaincode: CHAINCODES.FINANCE,
    fn: "RecordWalletTopUp",
    requiredRoles: [ROLES.ORG_ADMIN, ROLES.FLEET_MANAGER],
    argShape: ["walletId", "amount", "currency", "reference"],
  },
  ReconcileTripPayment: {
    chaincode: CHAINCODES.FINANCE,
    fn: "ReconcileTripPayment",
    requiredRoles: [ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["tripId", "walletId", "amount", "method"],
  },
  DeductDriverPenalty: {
    chaincode: CHAINCODES.FINANCE,
    fn: "DeductDriverPenalty",
    requiredRoles: [ROLES.ORG_ADMIN],
    argShape: ["driverUserId", "walletId", "amount", "reason"],
  },

  // ── Compliance ─────────────────────────────────────────────────────────────
  LogComplianceEvent: {
    chaincode: CHAINCODES.COMPLIANCE,
    fn: "LogComplianceEvent",
    requiredRoles: [ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN, ROLES.IOT_DEVICE],
    argShape: ["entityId", "entityType", "eventType", "details", "timestamp"],
  },
  UpdateComplianceStatus: {
    chaincode: CHAINCODES.COMPLIANCE,
    fn: "UpdateComplianceStatus",
    requiredRoles: [ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["entityId", "status", "note"],
  },

  // ── Devices ────────────────────────────────────────────────────────────────
  RegisterDeviceOnChain: {
    chaincode: CHAINCODES.FLEET,
    fn: "RegisterDeviceOnChain",
    requiredRoles: [ROLES.ORG_ADMIN, ROLES.FLEET_MANAGER],
    argShape: ["deviceId", "vehicleId", "orgId", "pairedAt"],
  },
  UpdateDeviceLocation: {
    chaincode: CHAINCODES.FLEET,
    fn: "UpdateDeviceLocation",
    requiredRoles: [ROLES.IOT_DEVICE, ROLES.FLEET_MANAGER],
    argShape: ["deviceId", "lat", "lng", "timestamp"],
  },
}

// Read operations
export const READ_CONTRACTS: Record<string, ContractDef> = {
  // ── Fleet ──────────────────────────────────────────────────────────────────
  GetVehicleStatus: {
    chaincode: CHAINCODES.FLEET,
    fn: "GetVehicleStatus",
    requiredRoles: [ROLES.DRIVER, ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["vehicleId"],
  },
  GetVehicleHistory: {
    chaincode: CHAINCODES.FLEET,
    fn: "GetVehicleHistory",
    requiredRoles: [ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["vehicleId"],
  },
  GetFleetSummary: {
    chaincode: CHAINCODES.FLEET,
    fn: "GetFleetSummary",
    requiredRoles: [ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["orgId"],
  },
  GetDriverRecord: {
    chaincode: CHAINCODES.FLEET,
    fn: "GetDriverRecord",
    requiredRoles: [ROLES.DRIVER, ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["driverUserId"],
  },
  GetDriverTrips: {
    chaincode: CHAINCODES.FLEET,
    fn: "GetDriverTrips",
    requiredRoles: [ROLES.DRIVER, ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["driverUserId", "fromDate", "toDate"],
  },
  GetActiveAssignment: {
    chaincode: CHAINCODES.FLEET,
    fn: "GetActiveAssignment",
    requiredRoles: [ROLES.DRIVER, ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["vehicleId"],
  },

  // ── Finance ────────────────────────────────────────────────────────────────
  GetWalletBalance: {
    chaincode: CHAINCODES.FINANCE,
    fn: "GetWalletBalance",
    requiredRoles: [ROLES.DRIVER, ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["walletId"],
  },
  GetWalletHistory: {
    chaincode: CHAINCODES.FINANCE,
    fn: "GetWalletHistory",
    requiredRoles: [ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["walletId", "fromDate", "toDate"],
  },
  GetPaymentRecord: {
    chaincode: CHAINCODES.FINANCE,
    fn: "GetPaymentRecord",
    requiredRoles: [ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["paymentId"],
  },

  // ── Compliance ─────────────────────────────────────────────────────────────
  GetComplianceEvents: {
    chaincode: CHAINCODES.COMPLIANCE,
    fn: "GetComplianceEvents",
    requiredRoles: [ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["orgId", "fromDate", "toDate"],
  },
  GetComplianceStatus: {
    chaincode: CHAINCODES.COMPLIANCE,
    fn: "GetComplianceStatus",
    requiredRoles: [ROLES.DRIVER, ROLES.FLEET_MANAGER, ROLES.ORG_ADMIN],
    argShape: ["entityId"],
  },

  // ── Audit ──────────────────────────────────────────────────────────────────
  GetAuditLog: {
    chaincode: CHAINCODES.FLEET,
    fn: "GetAuditLog",
    requiredRoles: [ROLES.ORG_ADMIN],
    argShape: ["orgId", "fromDate", "toDate"],
  },
}
