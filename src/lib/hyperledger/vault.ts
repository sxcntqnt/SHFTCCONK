// src/lib/hyperledger/vault.ts
// HashiCorp Vault (self-hosted) — KV v2 secret engine
// Stores Fabric identities at: secret/data/fabric/identities/{userId}

import { env } from "$env/dynamic/private"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FabricIdentity {
  userId: string
  mspId: string
  certPem: string
  privateKeyPem: string // AES-encrypted before storing; decrypted on load
  attributes: Record<string, string> // e.g. { role, orgId, deviceId, vehicleId }
  enrolledAt: string // ISO timestamp
  revoked?: boolean
}

type VaultKVResponse = {
  data: {
    data: Record<string, string>
    metadata: { version: number; created_time: string; destroyed: boolean }
  }
}

// ─── Config (set in .env) ─────────────────────────────────────────────────────
// VAULT_ADDR=https://vault.your-domain.com
// VAULT_TOKEN=hvs.xxxxx
// VAULT_KV_MOUNT=secret                   (KV v2 mount path)

const VAULT_ADDR = env.VAULT_ADDR
const VAULT_TOKEN = env.VAULT_TOKEN
const KV_MOUNT = env.VAULT_KV_MOUNT ?? "secret"
const BASE_PATH = `fabric/identities` // logical grouping inside KV

// ─── Internal fetch wrapper ───────────────────────────────────────────────────

async function vaultFetch<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T | null> {
  const url = `${VAULT_ADDR}/v1/${path}`

  const res = await fetch(url, {
    method,
    headers: {
      "X-Vault-Token": VAULT_TOKEN,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 404) return null

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vault ${method} ${path} failed [${res.status}]: ${text}`)
  }

  // DELETE returns 204 with no body
  if (res.status === 204) return null

  return res.json() as Promise<T>
}

// ─── Encryption helpers (AES-256-GCM) ────────────────────────────────────────
// Private keys must never sit in Vault unencrypted.
// Use your app's FABRIC_KEY_ENCRYPTION_SECRET (32-byte hex) from .env.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ENCRYPTION_KEY = Buffer.from(
  env.FABRIC_KEY_ENCRYPTION_SECRET ?? "",
  "hex",
) // 32 bytes

function encryptPrivateKey(pem: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(pem, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
}

function decryptPrivateKey(stored: string): string {
  const [ivHex, tagHex, cipherHex] = stored.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")
  const ciphertext = Buffer.from(cipherHex, "hex")
  const decipher = createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8")
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Save a Fabric identity into Vault KV v2.
 * Private key is AES-256-GCM encrypted before storage.
 */
export async function saveIdentity(identity: FabricIdentity): Promise<void> {
  const encryptedKey = encryptPrivateKey(identity.privateKeyPem)

  await vaultFetch("POST", `${KV_MOUNT}/data/${BASE_PATH}/${identity.userId}`, {
    data: {
      userId: identity.userId,
      mspId: identity.mspId,
      certPem: identity.certPem,
      privateKeyEncrypted: encryptedKey,
      attributes: JSON.stringify(identity.attributes),
      enrolledAt: identity.enrolledAt,
      revoked: String(identity.revoked ?? false),
    },
  })
}

/**
 * Load a Fabric identity from Vault. Decrypts the private key in memory.
 * Returns null if not found.
 */
export async function loadIdentity(
  userId: string,
): Promise<FabricIdentity | null> {
  const res = await vaultFetch<VaultKVResponse>(
    "GET",
    `${KV_MOUNT}/data/${BASE_PATH}/${userId}`,
  )

  if (!res) return null

  const d = res.data.data
  return {
    userId: d.userId,
    mspId: d.mspId,
    certPem: d.certPem,
    privateKeyPem: decryptPrivateKey(d.privateKeyEncrypted),
    attributes: JSON.parse(d.attributes ?? "{}"),
    enrolledAt: d.enrolledAt,
    revoked: d.revoked === "true",
  }
}

/**
 * Mark an identity as revoked in Vault (soft delete — keeps cert for audit).
 * The actual CA revocation happens in ca.ts.
 */
export async function markRevoked(userId: string): Promise<void> {
  const existing = await loadIdentity(userId)
  if (!existing) throw new Error(`Identity not found for: ${userId}`)

  await saveIdentity({ ...existing, revoked: true })
}

/**
 * List all enrolled identities (userId keys) under the base path.
 * Uses Vault KV v2 metadata list endpoint.
 */
export async function listIdentities(): Promise<string[]> {
  // KV v2 list uses metadata endpoint
  const res = await vaultFetch<{ data: { keys: string[] } }>(
    "GET",
    `${KV_MOUNT}/metadata/${BASE_PATH}?list=true`,
  )

  return res?.data?.keys ?? []
}

/**
 * Hard delete an identity from Vault (use only for GDPR purge or test cleanup).
 * Destroys all versions.
 */
export async function deleteIdentity(userId: string): Promise<void> {
  await vaultFetch("DELETE", `${KV_MOUNT}/metadata/${BASE_PATH}/${userId}`)
}
