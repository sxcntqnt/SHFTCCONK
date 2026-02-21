import { json } from '@sveltejs/kit';
import { getRevenueTrend } from '$lib/stores/finance.store';

export async function POST({ request }) {
  try {
    const { financeRecords } = await request.json();

    if (!Array.isArray(financeRecords)) {
      return json({ error: 'financeRecords must be an array' }, { status: 400 });
    }

    const trend = getRevenueTrend(financeRecords);

    return json({
      status: 'OK',
      trend
    });
  } catch (err) {
    console.error('Analytics API error:', err);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
}