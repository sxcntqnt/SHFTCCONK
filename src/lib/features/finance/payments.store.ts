import { writable } from 'svelte/store';
import { supabase } from '$lib/supabaseClient'; // Your standard client

export const paymentStatus = writable<'pending' | 'completed' | 'failed'>('pending');

export function subscribeToPayment(checkoutRequestId: string) {
    const channel = supabase
        .channel('public:payments')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'payments',
                filter: `transaction_id=eq.${checkoutRequestId}`
            },
            (payload) => {
                const newStatus = payload.new.status;
                paymentStatus.set(newStatus);
                
                if (newStatus !== 'pending') {
                    supabase.removeChannel(channel); // Clean up
                }
            }
        )
        .subscribe();
        
    return () => supabase.removeChannel(channel);
}