// src/routes/admin/hyperledger/revoke/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { revokeUser } from '../utils/enrollment';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, '/admin/account');
  if (locals.user.role !== 'platform-admin') throw redirect(303, '/admin/dashboard');

  // Pre-fill userId if coming from identities table link: /revoke?userId=xxx
  return { prefillUserId: url.searchParams.get('userId') ?? '' };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (locals.user?.role !== 'platform-admin') return fail(403, { error: 'Forbidden' });

    const form   = await request.formData();
    const userId = String(form.get('userId') ?? '').trim();
    const reason = String(form.get('reason') ?? 'privilegewithdrawn').trim();
    const type   = String(form.get('entityType') ?? 'driver') as any;

    if (!userId) return fail(400, { error: 'User ID is required.' });

    try {
      await revokeUser(userId, reason, type);
      return { success: true, userId };
    } catch (err) {
      return fail(500, { error: `Revocation failed: ${String(err)}` });
    }
  },
};