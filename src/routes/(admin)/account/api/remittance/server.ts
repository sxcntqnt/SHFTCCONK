// routes/api/remittance/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { calculateDistribution, LedgerEntry, createLedgerEntry } from '$lib/finance/ledger';
import { user } from '$lib/stores/auth.store'; // Ensure tenant context
import { get } from 'svelte/store';

interface RemittancePayload {
  vehicleId: string;
  driverId: string;
  collected: number;
  target: number;
  saccoPercentage?: number; // Optional override
  reference?: string;
}

/* ============================================================
   POST /api/remittance
   Accepts a single vehicle's collection, returns computed distribution
============================================================ */
export const POST: RequestHandler = async ({ request }) => {
  const body: RemittancePayload = await request.json();

  // Defensive input validation
  if (!body.vehicleId || !body.driverId) {
    return json({ error: 'vehicleId and driverId are required' }, { status: 400 });
  }
  if (typeof body.collected !== 'number' || typeof body.target !== 'number') {
    return json({ error: 'collected and target must be numeric' }, { status: 400 });
  }

  // Get tenant info
  const currentUser = get(user);
  if (!currentUser.organizationId) {
    return json({ error: 'User has no tenant context' }, { status: 403 });
  }

  const saccoPercentage = body.saccoPercentage ?? 0.1;

  // Compute distribution
  const distribution = calculateDistribution(body.collected, body.target, saccoPercentage);

  // Optionally create ledger entries (not persisted here, but ready for integration)
  const entries: LedgerEntry[] = [
    createLedgerEntry(body.vehicleId, body.driverId, 'COLLECTION', body.collected, body.reference),
    createLedgerEntry(body.vehicleId, body.driverId, 'TARGET_SETTLEMENT', distribution.baseSettlement),
    createLedgerEntry(body.vehicleId, body.driverId, 'SACCO_LEVY', distribution.saccoLevy),
    createLedgerEntry(body.vehicleId, body.driverId, 'OWNER_SHARE', distribution.ownerAmount),
    createLedgerEntry(body.vehicleId, body.driverId, 'DRIVER_INCENTIVE', distribution.driverIncentive)
  ];

  return json({
    status: 'CLEARED',
    distribution,
    entries
  });
};