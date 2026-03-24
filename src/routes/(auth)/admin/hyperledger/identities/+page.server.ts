// src/routes/admin/hyperledger/identities/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { listIdentities, loadIdentity } from '$lib/hyperledger/vault';
import { revokeUser } from '../enrollment';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, '/admin/account');
  if (locals.user.role !== 'platform-admin') throw redirect(303, '/admin/dashboard');

  const filterRole       = url.searchParams.get('role') ?? '';
  const filterOrg        = url.searchParams.get('org') ?? '';
  const includeRevoked   = url.searchParams.get('revoked') === 'true';

  const userIds = await listIdentities();
  const all = (await Promise.all(userIds.map((id) => loadIdentity(id))))
    .filter(Boolean)
    .map((id) => ({
      userId:     id!.userId,
      mspId:      id!.mspId,
      attributes: id!.attributes,
      enrolledAt: id!.enrolledAt,
      revoked:    id!.revoked ?? false,
    }));

  const identities = all
    .filter((i) => (includeRevoked ? true : !i.revoked))
    .filter((i) => (filterRole ? i.attributes?.role === filterRole : true))
    .filter((i) => (filterOrg  ? i.attributes?.orgId === filterOrg  : true));

  // Unique orgs + roles for filter dropdowns
  const orgs  = [...new Set(all.map((i) => i.attributes?.orgId).filter(Boolean))];
  const roles = [...new Set(all.map((i) => i.attributes?.role).filter(Boolean))];

  return { identities, orgs, roles, filters: { filterRole, filterOrg, includeRevoked } };
};

export const actions: Actions = {
  revoke: async ({ request, locals }) => {
    if (locals.user?.role !== 'platform-admin') return fail(403, { error: 'Forbidden' });

    const form   = await request.formData();
    const userId = String(form.get('userId') ?? '').trim();
    const reason = String(form.get('reason') ?? 'privilegewithdrawn').trim();
    const type   = String(form.get('entityType') ?? 'driver') as any;

    if (!userId) return fail(400, { error: 'userId is required' });

    try {
      await revokeUser(userId, reason, type);
      return { success: true, revokedUserId: userId };
    } catch (err) {
      return fail(500, { error: `Revocation failed: ${String(err)}` });
    }
  },
};