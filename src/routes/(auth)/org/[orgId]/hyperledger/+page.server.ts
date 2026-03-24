// src/routes/org/[orgId]/hyperledger/+page.server.ts
import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
  getFleetSummary,
  getWalletBalance,
  getComplianceEvents,
  getOrgAuditLog,
} from './ledgerQueries';
import type { OrgConnectionContext } from './connection';

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) throw redirect(303, '/org/select');

  const { orgId } = params;

  // Ensure user belongs to this org (or is platform admin)
  if (locals.user.orgId !== orgId && locals.user.role !== 'platform-admin') {
    throw error(403, 'You do not have access to this organisation.');
  }

  const ctx: OrgConnectionContext = {
    userId: locals.user.fabricUserId ?? locals.user.id,
    orgId,
  };

  // ISO date range: last 30 days
  const toDate   = new Date().toISOString();
  const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Run queries in parallel — each degrades gracefully on peer unavailability
  const [fleetRes, walletRes, complianceRes, auditRes] = await Promise.allSettled([
    getFleetSummary(ctx),
    getWalletBalance(ctx, `wallet-${orgId}`), // convention: wallet-{orgId}
    getComplianceEvents(ctx, fromDate, toDate),
    locals.user.role === 'org-admin' || locals.user.role === 'platform-admin'
      ? getOrgAuditLog(ctx, fromDate, toDate)
      : Promise.resolve({ success: true, data: null }),
  ]);

  function extract(res: PromiseSettledResult<{ success: boolean; data?: unknown }>) {
    return res.status === 'fulfilled' && res.value.success ? res.value.data : null;
  }

  return {
    orgId,
    userRole: locals.user.role,
    fleet:      extract(fleetRes),
    wallet:     extract(walletRes),
    compliance: extract(complianceRes),
    auditLog:   extract(auditRes),
    dateRange:  { fromDate, toDate },
  };
};