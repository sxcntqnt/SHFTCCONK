import { json } from '@sveltejs/kit';
import { db } from '$lib/prisma';

export async function GET({ url }) {
    const checkoutRequestId = url.searchParams.get('id');

    if (!checkoutRequestId) return json({ status: 'error', message: 'Missing ID' }, { status: 400 });

    const payment = await db.payment.findUnique({
        where: { transactionId: checkoutRequestId }
    });

    // We return the database status, which is updated by the M-Pesa Callback webhook
    return json({
        status: payment?.status || 'PENDING', // COMPLETED, FAILED, or PENDING
        message: payment?.resultDesc || 'Waiting for user input'
    });
}