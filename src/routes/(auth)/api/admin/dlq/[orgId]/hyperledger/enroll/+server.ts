// src/routes/admin/hyperledger/enroll/+server.ts
// POST /admin/hyperledger/enroll
// Registers + enrolls an org user, driver, or IoT device with Fabric CA.
// Protected: platform admin only.

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { registerAndEnrollUser, registerDevice } from '$lib/hyperledger/ca';

// ─── Auth guard ───────────────────────────────────────────────────────────────
// Assumes your hooks.server.ts populates locals.user from your session/JWT.
// Adjust the role check to match your existing auth pattern.

function requirePlatformAdmin(locals: App.Locals) {
  if (!locals.user) throw error(401, 'Unauthenticated');
  if (locals.user.role !== 'platform-admin') throw error(403, 'Forbidden: platform admin only');
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
  requirePlatformAdmin(locals);

  const body = await request.json();
  const { type } = body;

  // ── Enroll a user (driver or fleet-manager) ──────────────────────────────

  if (type === 'user') {
    const { userId, role, orgId, affiliation, extraAttrs } = body;

    if (!userId || !role || !orgId) {
      throw error(400, 'Missing required fields: userId, role, orgId');
    }

    if (!['driver', 'fleet-manager', 'org-admin'].includes(role)) {
      throw error(400, 'Invalid role. Allowed: driver | fleet-manager | org-admin');
    }

    const result = await registerAndEnrollUser({
      userId,
      role,
      orgId,
      affiliation,
      extraAttrs,
    });

    return json({
      success: true,
      message: `User ${userId} registered and enrolled`,
      data: {
        userId: result.userId,
        mspId: result.mspId,
        // Never return the private key in this flow — it stays in Vault
        certificate: result.certificate,
      },
    });
  }

  // ── Enroll a device (IoT / vehicle tracker) ───────────────────────────────

  if (type === 'device') {
    const { deviceId, vehicleId, orgId, location } = body;

    if (!deviceId || !orgId) {
      throw error(400, 'Missing required fields: deviceId, orgId');
    }

    const result = await registerDevice({ deviceId, vehicleId, orgId, location });

    // IMPORTANT: private key is returned here ONCE so the caller can securely
    // transmit it to the physical device (mTLS provisioning, secure channel, etc.)
    // It will NOT be returned again by any other endpoint.
    return json({
      success: true,
      message: `Device ${deviceId} registered and enrolled`,
      data: {
        deviceId: result.deviceId,
        mspId: result.mspId,
        certificate: result.certificate,
        privateKey: result.privateKey, // ← send to device over secure channel; one-time only
      },
    });
  }

  throw error(400, 'Invalid type. Use "user" or "device"');
};