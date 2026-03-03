import { json } from '@sveltejs/kit';
import {
  evaluateCompliance,
  evaluateComplianceBatch,
  ComplianceItem,
  ComplianceResult
} from '$lib/compliance/ruleEngine';
import { get } from 'svelte/store';
import { user } from '$lib/stores/user';

/* ============================================================
   POST /api/compliance/check
   Accepts single or multiple ComplianceItems
   Returns evaluated compliance results with status & severity
============================================================ */
export async function POST({ request }): Promise<Response> {
  try {
    const body = await request.json();

    if (!body) {
      return json({ error: 'Missing request body' }, { status: 400 });
    }

    // Normalize to array
    const items: ComplianceItem[] = Array.isArray(body) ? body : [body];

    // Validate required fields
    for (const item of items) {
      if (!item.vehicleId || !item.type || !item.expiryDate) {
        return json(
          { error: 'Invalid payload: vehicleId, type, and expiryDate are required' },
          { status: 400 }
        );
      }
    }

    // Enforce tenant context
    const currentUser = get(user);
    if (!currentUser.organizationId) {
      return json({ error: 'User has no tenant context' }, { status: 403 });
    }

    const tenantItems = items.map(i => ({
      ...i,
      organizationId: currentUser.organizationId
    }));

    // Evaluate compliance (batch if multiple)
    let results: ComplianceResult[];
    if (tenantItems.length === 1) {
      results = [
        {
          vehicleId: tenantItems[0].vehicleId,
          compliance: evaluateCompliance(tenantItems[0])
        }
      ];
    } else {
      results = evaluateComplianceBatch(tenantItems);
    }

    return json({
      status: 'SUCCESS',
      results
    });
  } catch (err) {
    console.error('Compliance API error:', err);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
}