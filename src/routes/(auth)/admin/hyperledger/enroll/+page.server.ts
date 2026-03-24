// src/routes/admin/hyperledger/enroll/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { enrollUser, enrollDevice } from '../enrollment';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/admin/account');
  if (locals.user.role !== 'platform-admin') throw redirect(303, '/admin/dashboard');
  return {};
};

export const actions: Actions = {
  // POST ?/enrollUser
  enrollUser: async ({ request, locals }) => {
    if (locals.user?.role !== 'platform-admin') return fail(403, { error: 'Forbidden' });

    const form = await request.formData();
    const userId      = String(form.get('userId') ?? '').trim();
    const role        = String(form.get('role') ?? '').trim();
    const orgId       = String(form.get('orgId') ?? '').trim();
    const affiliation = String(form.get('affiliation') ?? 'platform.users').trim();

    if (!userId || !role || !orgId) {
      return fail(400, { error: 'userId, role and orgId are required.', field: 'user' });
    }

    const validRoles = ['driver', 'fleet-manager', 'org-admin'];
    if (!validRoles.includes(role)) {
      return fail(400, { error: `Invalid role. Choose: ${validRoles.join(', ')}`, field: 'user' });
    }

    try {
      const result = await enrollUser({ userId, role: role as any, orgId, affiliation });
      return { success: true, type: 'user', userId: result.userId, mspId: result.mspId };
    } catch (err) {
      return fail(500, { error: `Enrollment failed: ${String(err)}`, field: 'user' });
    }
  },

  // POST ?/enrollDevice
  enrollDevice: async ({ request, locals }) => {
    if (locals.user?.role !== 'platform-admin') return fail(403, { error: 'Forbidden' });

    const form = await request.formData();
    const deviceId  = String(form.get('deviceId') ?? '').trim();
    const vehicleId = String(form.get('vehicleId') ?? '').trim();
    const orgId     = String(form.get('orgId') ?? '').trim();
    const location  = String(form.get('location') ?? 'unknown').trim();

    if (!deviceId || !orgId) {
      return fail(400, { error: 'deviceId and orgId are required.', field: 'device' });
    }

    try {
      const result = await enrollDevice({ deviceId, vehicleId, orgId, location });
      // Private key is returned here — page displays it once for admin to transmit to device
      return {
        success:    true,
        type:       'device',
        deviceId:   result.deviceId,
        mspId:      result.mspId,
        certificate: result.certificate,
        privateKey:  result.privateKey, // shown once in UI
      };
    } catch (err) {
      return fail(500, { error: `Device enrollment failed: ${String(err)}`, field: 'device' });
    }
  },
};