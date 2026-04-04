// src/lib/hyperledger/gateway.ts
// Fabric Gateway connect helper — used by org routes for tx submission + queries.
// Admin routes don't use the gateway (they only deal with CA enrollment).

import * as grpc from "@grpc/grpc-js"
import {
  connect,
  hash,
  signers,
  type Gateway,
} from "@hyperledger/fabric-gateway"
import { createPrivateKey } from "node:crypto"
import { env } from "$env/dynamic/private"
import { loadIdentity } from "./vault"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TransactionPayload {
  userId: string // who is submitting (must have a Vault identity)
  orgId: string // used for MSP validation
  channel: string // e.g. 'mychannel'
  chaincode: string // e.g. 'fleet-contract'
  fn: string // chaincode function name
  args: string[] // all args as strings
}

export interface QueryPayload {
  userId: string
  orgId: string
  channel: string
  chaincode: string
  fn: string
  args: string[]
}

// ─── gRPC client (reuse per request — close in finally block) ────────────────
// PEER_ENDPOINT=peer0.your-domain.com:7051
// PEER_TLS_CERT_PATH=/path/to/tls/ca.crt   (optional, for prod mTLS)

function createGrpcClient(): grpc.Client {
  const endpoint = env.PEER_ENDPOINT

  // In production: load your peer's TLS root cert
  // const tlsCert = fs.readFileSync(env.PEER_TLS_CERT_PATH);
  // const creds = grpc.credentials.createSsl(tlsCert);

  // Dev/staging: insecure or self-signed
  const creds = grpc.credentials.createInsecure()

  return new grpc.Client(endpoint, creds, {
    "grpc.keepalive_time_ms": 120000,
    "grpc.keepalive_timeout_ms": 20000,
    "grpc.keepalive_permit_without_calls": 1,
  })
}

// ─── Build Gateway from a userId's Vault identity ────────────────────────────

async function buildGateway(
  userId: string,
  expectedOrgId: string,
): Promise<Gateway> {
  const identity = await loadIdentity(userId)

  if (!identity) {
    throw new Error(`[Gateway] No Fabric identity found for user: ${userId}`)
  }

  if (identity.revoked) {
    throw new Error(`[Gateway] Identity is revoked: ${userId}`)
  }

  // Validate org scope (chaincode enforces ABAC too — this is defence-in-depth)
  const orgIdAttr = identity.attributes?.orgId
  if (
    orgIdAttr &&
    orgIdAttr !== expectedOrgId &&
    identity.mspId !== "PlatformMSP"
  ) {
    throw new Error(
      `[Gateway] Identity orgId (${orgIdAttr}) does not match requested org (${expectedOrgId})`,
    )
  }

  const credentials = Buffer.from(identity.certPem)
  const privateKey = createPrivateKey(identity.privateKeyPem)
  const client = createGrpcClient()

  return connect({
    identity: { mspId: identity.mspId, credentials },
    signer: signers.newPrivateKeySigner(privateKey),
    hash: hash.sha256,
    client,
    // Optional: tune endorsement timeouts
    // endorseOptions: { deadline: Date.now() + 15000 }
  })
}

// ─── Submit a transaction (write) ─────────────────────────────────────────────

export async function submitTransaction(payload: TransactionPayload): Promise<{
  success: boolean
  result?: string
  txId?: string
}> {
  const { userId, orgId, channel, chaincode, fn, args } = payload
  const gateway = await buildGateway(userId, orgId)

  try {
    const network = gateway.getNetwork(channel)
    const contract = network.getContract(chaincode)

    const resultBytes = await contract.submitTransaction(fn, ...args)
    const result = Buffer.from(resultBytes).toString("utf8")

    return { success: true, result }
  } finally {
    gateway.close()
  }
}

// ─── Evaluate a transaction (read-only, no consensus) ────────────────────────

export async function evaluateTransaction(payload: QueryPayload): Promise<{
  success: boolean
  result?: unknown
}> {
  const { userId, orgId, channel, chaincode, fn, args } = payload
  const gateway = await buildGateway(userId, orgId)

  try {
    const network = gateway.getNetwork(channel)
    const contract = network.getContract(chaincode)

    const resultBytes = await contract.evaluateTransaction(fn, ...args)
    const raw = Buffer.from(resultBytes).toString("utf8")

    // Chaincode typically returns JSON
    let result: unknown = raw
    try {
      result = JSON.parse(raw)
    } catch {
      // plain string result — return as-is
    }

    return { success: true, result }
  } finally {
    gateway.close()
  }
}
