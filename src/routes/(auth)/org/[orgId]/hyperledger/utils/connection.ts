// src/routes/org/[orgId]/hyperledger/connection.ts
// Org-scoped Fabric Gateway connection helper.
// Loads a specific user's identity from Vault and connects to the peer.
// This file does NOT enroll or register — admin/hyperledger/enrollment.ts does that.

import { loadIdentity } from '$lib/hyperledger/vault';
import * as grpc from '@grpc/grpc-js';
import { connect, hash, signers, type Gateway } from '@hyperledger/fabric-gateway';
import { createPrivateKey } from 'node:crypto';
import { env } from '$env/dynamic/private';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrgConnectionContext {
  userId: string;
  orgId: string;
}

// ─── Gateway builder ──────────────────────────────────────────────────────────

/**
 * Build a Fabric Gateway for an org user.
 * Validates that the user's identity exists, is not revoked, and belongs to this org.
 * Caller must close the gateway in a finally block.
 */
export async function getOrgGateway(ctx: OrgConnectionContext): Promise<Gateway> {
  const { userId, orgId } = ctx;
  const identity = await loadIdentity(userId);

  if (!identity) {
    throw new Error(`[OrgConnection] No Fabric identity for user: ${userId}`);
  }

  if (identity.revoked) {
    throw new Error(`[OrgConnection] Identity revoked: ${userId}`);
  }

  // Org scope check — platform admin bypasses this (MSP check handles it in prod)
  const identityOrgId = identity.attributes?.orgId;
  if (identityOrgId && identityOrgId !== orgId && identity.mspId !== 'PlatformMSP') {
    throw new Error(
      `[OrgConnection] Identity orgId "${identityOrgId}" does not match route orgId "${orgId}"`
    );
  }

  const credentials = Buffer.from(identity.certPem);
  const privateKey = createPrivateKey(identity.privateKeyPem);

  const client = new grpc.Client(
    env.PEER_ENDPOINT,
    grpc.credentials.createInsecure(), // use createSsl() + TLS cert in production
    {
      'grpc.keepalive_time_ms': 120000,
      'grpc.keepalive_timeout_ms': 20000,
      'grpc.keepalive_permit_without_calls': 1,
    }
  );

  return connect({
    identity: { mspId: identity.mspId, credentials },
    signer: signers.newPrivateKeySigner(privateKey),
    hash: hash.sha256,
    client,
  });
}

/**
 * Convenience: get a specific contract for an org user in one call.
 * Caller still owns closing the gateway.
 */
export async function getOrgContract(ctx: OrgConnectionContext, chaincodeName: string) {
  const gateway = await getOrgGateway(ctx);
  const network = gateway.getNetwork(env.FABRIC_CHANNEL ?? 'mychannel');
  const contract = network.getContract(chaincodeName);
  return { gateway, network, contract };
}