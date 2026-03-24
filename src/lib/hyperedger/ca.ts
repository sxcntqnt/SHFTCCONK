// src/lib/hyperledger/ca.ts
// fabric-ca-client wrapper — register, enroll, revoke
// Only called from admin routes. Org routes never touch this file.

import FabricCAServices from 'fabric-ca-client';
import { env } from '$env/dynamic/private';
import { saveIdentity, loadIdentity, markRevoked } from './vault';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EnrollUserPayload {
  userId: string;
  role: 'driver' | 'fleet-manager' | 'org-admin';
  orgId: string;
  affiliation?: string;           // defaults to 'platform.users'
  extraAttrs?: Record<string, string>; // e.g. { vehicleId: 'v123' }
}

export interface EnrollDevicePayload {
  deviceId: string;
  vehicleId?: string;
  orgId: string;
  location?: string;
}

export type AdminIdentity = {
  certificate: string;
  key: { toBytes: () => Buffer };
};

// ─── CA Client (singleton per process) ───────────────────────────────────────
// CA_URL=https://ca.your-domain.com:7054
// CA_NAME=ca-platform
// CA_TLS_VERIFY=true   (set false only for local dev)

let _ca: FabricCAServices | null = null;

function getCA(): FabricCAServices {
  if (!_ca) {
    _ca = new FabricCAServices(
      env.CA_URL,
      {
        verify: env.CA_TLS_VERIFY !== 'false',
        // In prod: pass your CA TLS root cert here
        // trustedRoots: [fs.readFileSync(env.CA_TLS_CERT_PATH)]
      },
      env.CA_NAME ?? 'ca-platform'
    );
  }
  return _ca;
}

// ─── Load admin identity (used as registrar) ──────────────────────────────────

async function getAdminIdentity(): Promise<AdminIdentity> {
  const identity = await loadIdentity('admin');
  if (!identity) throw new Error('Admin identity not found in Vault. Run enrollAdmin first.');

  return {
    certificate: identity.certPem,
    // fabric-ca-client expects an IKey-like object with toBytes()
    key: { toBytes: () => Buffer.from(identity.privateKeyPem) },
  };
}

// ─── 1. Enroll the bootstrap admin (run once at startup / via admin CLI) ─────

export async function enrollAdmin(): Promise<void> {
  const ca = getCA();

  const adminId = env.CA_ADMIN_ID ?? 'admin';
  const adminSecret = env.CA_ADMIN_SECRET ?? 'adminpw';

  const enrollment = await ca.enroll({
    enrollmentID: adminId,
    enrollmentSecret: adminSecret,
  });

  await saveIdentity({
    userId: 'admin',
    mspId: env.PLATFORM_MSP_ID ?? 'PlatformMSP',
    certPem: enrollment.certificate,
    privateKeyPem: enrollment.key.toBytes().toString(),
    attributes: { role: 'admin' },
    enrolledAt: new Date().toISOString(),
  });

  console.log('[Fabric] Bootstrap admin enrolled and stored in Vault.');
}

// ─── 2. Register + Enroll an org user or driver ───────────────────────────────

export async function registerAndEnrollUser(payload: EnrollUserPayload): Promise<{
  userId: string;
  certificate: string;
  mspId: string;
}> {
  const ca = getCA();
  const adminIdentity = await getAdminIdentity();

  const {
    userId,
    role,
    orgId,
    affiliation = 'platform.users',
    extraAttrs = {},
  } = payload;

  // Build attributes — these are embedded in the X.509 cert
  // Chaincode reads them via ctx.GetClientIdentity().GetAttributeValue()
  const attrs = [
    { name: 'role', value: role, ecert: true },
    { name: 'orgId', value: orgId, ecert: true },
    ...Object.entries(extraAttrs).map(([name, value]) => ({
      name,
      value,
      ecert: true,
    })),
  ];

  const secret = await ca.register(
    {
      enrollmentID: userId,
      enrollmentSecret: uuidv4(), // random one-time secret
      type: 'client',
      affiliation,
      maxEnrollments: 5,
      attrs,
    },
    adminIdentity
  );

  const enrollment = await ca.enroll({
    enrollmentID: userId,
    enrollmentSecret: secret,
  });

  const mspId = env.PLATFORM_MSP_ID ?? 'PlatformMSP';

  await saveIdentity({
    userId,
    mspId,
    certPem: enrollment.certificate,
    privateKeyPem: enrollment.key.toBytes().toString(),
    attributes: { role, orgId, ...extraAttrs },
    enrolledAt: new Date().toISOString(),
  });

  return { userId, certificate: enrollment.certificate, mspId };
}

// ─── 3. Register + Enroll an IoT device ──────────────────────────────────────
// Returns cert + raw private key — send securely to device ONCE.
// Backend does NOT keep a copy of the raw private key after the device receives it.

export async function registerDevice(payload: EnrollDevicePayload): Promise<{
  deviceId: string;
  certificate: string;
  privateKey: string; // raw — transmit once to device over mTLS / secure channel
  mspId: string;
}> {
  const ca = getCA();
  const adminIdentity = await getAdminIdentity();

  const { deviceId, vehicleId = '', orgId, location = 'unknown' } = payload;

  const secret = await ca.register(
    {
      enrollmentID: deviceId,
      enrollmentSecret: uuidv4(),
      type: 'client',
      affiliation: 'platform.devices',
      maxEnrollments: 10, // allow device re-enrollment (battery swap / firmware reset)
      attrs: [
        { name: 'role', value: 'iot-device', ecert: true },
        { name: 'deviceId', value: deviceId, ecert: true },
        { name: 'vehicleId', value: vehicleId, ecert: true },
        { name: 'orgId', value: orgId, ecert: true },
        { name: 'location', value: location, ecert: true },
      ],
    },
    adminIdentity
  );

  const enrollment = await ca.enroll({
    enrollmentID: deviceId,
    enrollmentSecret: secret,
  });

  const mspId = env.PLATFORM_MSP_ID ?? 'PlatformMSP';
  const rawPrivateKey = enrollment.key.toBytes().toString();

  // Store in Vault with encrypted key (backend copy — for audit and re-issue)
  await saveIdentity({
    userId: deviceId,
    mspId,
    certPem: enrollment.certificate,
    privateKeyPem: rawPrivateKey,
    attributes: { role: 'iot-device', deviceId, vehicleId, orgId, location },
    enrolledAt: new Date().toISOString(),
  });

  return {
    deviceId,
    certificate: enrollment.certificate,
    privateKey: rawPrivateKey, // caller transmits this securely to device
    mspId,
  };
}

// ─── 4. Revoke an identity ────────────────────────────────────────────────────
// Reasons (Fabric CA standard): unspecified | keycompromise | cacompromise |
// affiliationchange | superseded | cessationofoperation | privilegewithdrawn

export async function revokeIdentity(
  userId: string,
  reason: string = 'privilegewithdrawn'
): Promise<void> {
  const ca = getCA();
  const adminIdentity = await getAdminIdentity();

  await ca.revoke({ enrollmentID: userId, reason }, adminIdentity);

  // Soft-mark in Vault so queries reflect revoked status
  await markRevoked(userId);

  console.log(`[Fabric] Identity revoked: ${userId} (reason: ${reason})`);
}