mport { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY } from '$env/static/private';
import { db } from '$lib/server/prisma';

// Helper for M-Pesa OAuth
async function getAccessToken() {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    const res = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: { Authorization: `Basic ${auth}` }
    });
    const data = await res.json();
    return data.access_token;
}

export async function initiateStkPush({ phoneNumber, amount, clerkId }: { phoneNumber: string, amount: number, clerkId: string }) {
    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

    const payload = {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: "https://your-domain.com/api/stk-callback",
        AccountReference: `Bus-${clerkId}`,
        TransactionDesc: "Seat Reservation"
    };

    const res = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (data.ResponseCode === "0") {
        // Log the pending transaction in Prisma
        await db.payment.create({
            data: {
                transactionId: data.CheckoutRequestID,
                amount,
                phoneNumber,
                status: 'pending',
                userId: 1 // Replace with actual session logic
            }
        });
    }

    return data;
}