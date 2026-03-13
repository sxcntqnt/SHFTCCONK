import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

// Use Service Role key to bypass RLS for this internal webhook
const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST({ request }) {
    const data = await request.json();
    const { CheckoutRequestID, ResultCode, ResultDesc } = data.Body.stkCallback;

    const status = ResultCode === 0 ? 'completed' : 'failed';

    // 1. Update Payment Record
    const { error: payError } = await supabase
        .from('payments')
        .update({ 
            status, 
            result_desc: ResultDesc,
            updated_at: new Date() 
        })
        .eq('transaction_id', CheckoutRequestID);

    if (ResultCode === 0) {
        // 2. Logic: Move seats from 'selected' to 'reserved' status
        // Usually, you'd store the seat IDs in the payment record metadata when initiating
        const { data: payData } = await supabase
            .from('payments')
            .select('metadata')
            .eq('transaction_id', CheckoutRequestID)
            .single();

        if (payData?.metadata?.seat_ids) {
            await supabase
                .from('seats')
                .update({ status: 'reserved' })
                .in('id', payData.metadata.seat_ids);
        }
    }

    return json({ ResultCode: 0, ResultDesc: "Success" });
}