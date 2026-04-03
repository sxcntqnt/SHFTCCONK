// src/routes/admin/hyperledger/contractHelper.ts
// Admin-level chaincode helpers.
// These functions are called by the admin +server.ts route handlers and
// by the admin UI load functions (+page.server.ts).
// Org routes do NOT import from here.

import { getAdminContract } from "./connection"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChainResult {
  success: boolean
  data?: unknown
  txId?: string
  error?: string
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Submit a write transaction using the admin identity.
 * Handles gateway lifecycle (always closes).
 */
export async function adminSubmit(
  chaincode: string,
  fn: string,
  args: string[],
): Promise<ChainResult> {
  const { gateway, contract } = await getAdminContract(chaincode)
  try {
    const resultBytes = await contract.submitTransaction(fn, ...args)
    return {
      success: true,
      data: JSON.parse(Buffer.from(resultBytes).toString("utf8") || "null"),
    }
  } catch (err) {
    return { success: false, error: String(err) }
  } finally {
    gateway.close()
  }
}

/**
 * Evaluate a read-only query using the admin identity.
 * No consensus required — faster than submitTransaction.
 */
export async function adminQuery(
  chaincode: string,
  fn: string,
  args: string[],
): Promise<ChainResult> {
  const { gateway, contract } = await getAdminContract(chaincode)
  try {
    const resultBytes = await contract.evaluateTransaction(fn, ...args)
    const raw = Buffer.from(resultBytes).toString("utf8")
    let data: unknown = raw
    try {
      data = JSON.parse(raw)
    } catch {
      // plain string result
    }
    return { success: true, data }
  } catch (err) {
    return { success: false, error: String(err) }
  } finally {
    gateway.close()
  }
}

// ─── Platform-level chaincode helpers ────────────────────────────────────────
// These map to chaincode functions that only the platform admin can call.
// Keep them here so queries.ts and transactions.ts stay thin.

/** Check if chaincode is reachable (health probe). */
export async function pingChaincode(chaincode: string): Promise<boolean> {
  const result = await adminQuery(chaincode, "Ping", [])
  return result.success
}

/** Get a single asset by ID (generic — works across any chaincode). */
export async function getAssetById(
  chaincode: string,
  assetId: string,
): Promise<ChainResult> {
  return adminQuery(chaincode, "GetAsset", [assetId])
}

/** Get full history for any asset (uses PHANTOM_READ under the hood). */
export async function getAssetHistory(
  chaincode: string,
  assetId: string,
): Promise<ChainResult> {
  return adminQuery(chaincode, "GetAssetHistory", [assetId])
}
