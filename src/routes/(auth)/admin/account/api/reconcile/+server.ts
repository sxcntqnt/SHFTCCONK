// /routes/api/reconcile/+server.ts
import { json } from '@sveltejs/kit';
import { reconcilePayments, summarizeReconciliation } from '$lib/finance/reconciliation';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { payments, remittances } = body;

    if (!Array.isArray(payments) || !Array.isArray(remittances)) {
      return json({ error: 'Invalid payload: payments and remittances must be arrays' }, { status: 400 });
    }

    // Run reconciliation
    const reconciliationResults = reconcilePayments(payments, remittances);

    // Compute global summary
    const summary = summarizeReconciliation(reconciliationResults);

    return json({
      status: 'OK',
      reconciliation: reconciliationResults,
      summary
    });
  } catch (err) {
    console.error('Reconciliation API error:', err);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
}