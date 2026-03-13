import { processMpesaPush } from '$lib/server/mpesa-provider'; // Your Safaricom logic
import { supabase } from '$lib/supabaseServer'; 

export async function POST({ request }) {
    const { phoneNumber, amount, seatIds } = await request.json();
    
    const mpesaResponse = await processMpesaPush(phoneNumber, amount);

    if (mpesaResponse.ResponseCode === "0") {
        await supabase.from('payments').insert({
            transaction_id: mpesaResponse.CheckoutRequestID,
            amount,
            phone: phoneNumber,
            status: 'pending',
            metadata: { seat_ids: seatIds }
        });
    }

    return new Response(JSON.stringify(mpesaResponse));
}