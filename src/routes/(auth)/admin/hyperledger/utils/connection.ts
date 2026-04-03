// src/routes/admin/hyperledger/connection.ts
// Admin-scoped connection helper.
// Wraps the shared gateway lib with admin-level context.
// Import this from within admin/hyperledger/** files — not from org routes.

import { loadIdentity } from "$lib/hyperledger/vault"
import * as grpc from "@grpc/grpc-js"
import {
  connect,
  hash,
  signers,
  type Gateway,
} from "@hyperledger/fabric-gateway"
import { createPrivateKey } from "node:crypto"
import { env } from "$env/dynamic/private"

// Admin always connects as 'admin' identity (enrolled once at bootstrap)
const ADMIN_USER_ID = "admin"

/**
 * Build a Fabric Gateway connection using the platform admin identity.
 * Used by contractHelper, queries, and transactions in this folder.
 * Always close the gateway in a finally block after use.
 */
export async function getAdminGateway(): Promise<Gateway> {
  const identity = await loadIdentity(ADMIN_USER_ID)

  if (!identity) {
    throw new Error(
      "[AdminConnection] Admin identity not found in Vault. " +
        "Run enrollAdmin() bootstrap script first.",
    )
  }

  if (identity.revoked) {
    throw new Error(
      "[AdminConnection] Admin identity has been revoked. Check Vault.",
    )
  }

  const credentials = Buffer.from(identity.certPem)
  const privateKey = createPrivateKey(identity.privateKeyPem)

  // gRPC client to the peer
  const client = new grpc.Client(
    env.PEER_ENDPOINT,
    grpc.credentials.createInsecure(), // swap for createSsl() in production
    {
      "grpc.keepalive_time_ms": 120000,
      "grpc.keepalive_timeout_ms": 20000,
      "grpc.keepalive_permit_without_calls": 1,
    },
  )

  return connect({
    identity: { mspId: identity.mspId, credentials },
    signer: signers.newPrivateKeySigner(privateKey),
    hash: hash.sha256,
    client,
  })
}

/**
 * Convenience: get the admin's network + contract in one call.
 * Caller still owns closing the gateway.
 */
export async function getAdminContract(chaincodeName: string) {
  const gateway = await getAdminGateway()
  const network = gateway.getNetwork(env.FABRIC_CHANNEL ?? "mychannel")
  const contract = network.getContract(chaincodeName)
  return { gateway, network, contract }
}
