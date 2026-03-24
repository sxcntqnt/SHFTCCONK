// src/routes/admin/hyperledger/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listIdentities, loadIdentity } from '$lib/hyperledger/vault';
import { getLedgerStats } from './utils/queries';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/admin/account');
  if (locals.user.role !== 'platform-admin') throw redirect(303, '/admin/dashboard');

  // Load all identities from Vault (strip private key material)
  const userIds = await listIdentities();

  const identities = (
    await Promise.all(userIds.map((id) => loadIdentity(id)))
  )
    .filter(Boolean)
    .map((id) => ({
      userId:     id!.userId,
      mspId:      id!.mspId,
      attributes: id!.attributes,
      enrolledAt: id!.enrolledAt,
      revoked:    id!.revoked ?? false,
    }));

  // Ledger stats (from chaincode — gracefully degrade if peer is unreachable)
  let ledgerStats: Record<string, unknown> | null = null;
  try {
    const res = await getLedgerStats();
    if (res.success) ledgerStats = res.data as Record<string, unknown>;
  } catch {
    // peer unreachable — dashboard still loads with Vault data
  }

  const active  = identities.filter((i) => !i.revoked);
  const revoked = identities.filter((i) => i.revoked);

  const byRole = active.reduce<Record<string, number>>((acc, id) => {
    const role = id.attributes?.role ?? 'unknown';
    acc[role] = (acc[role] ?? 0) + 1;
    return acc;
  }, {});

  return {
    identities: identities.slice(0, 10), // recent 10 for dashboard table
    stats: {
      total:   identities.length,
      active:  active.length,
      revoked: revoked.length,
      byRole,
    },
    ledgerStats,
  };
};