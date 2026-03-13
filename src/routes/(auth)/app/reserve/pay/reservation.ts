import { validatePhonePrefix } from '$lib/utils/phone';
import { paymentState, pollPaymentStatus } from '$lib/stores/payment';

export function createReservationStore() {
    let selectedSeats = $state<string[]>([]);
    let phoneNumber = $state('254');
    let isPhoneValid = $derived(validatePhonePrefix(phoneNumber).isValid);

    async function handleCheckout(totalAmount: number, clerkId: string) {
        if (!isPhoneValid) return;

        paymentState.update(s => ({ ...s, isLoading: true, paymentError: null }));

        const response = await fetch('/api/mpesa/initiate', {
            method: 'POST',
            body: JSON.stringify({ phoneNumber, totalAmount, clerkId })
        });

        const result = await response.json();

        if (result.CheckoutRequestID) {
            paymentState.update(s => ({ ...s, checkoutRequestId: result.CheckoutRequestID, stkQueryLoading: true }));
            pollPaymentStatus(result.CheckoutRequestID);
        } else {
            paymentState.update(s => ({ ...s, paymentError: 'Failed to initiate', isLoading: false }));
        }
    }

    return {
        get selectedSeats() { return selectedSeats; },
        set phoneNumber(val) { phoneNumber = val; },
        handleCheckout
    };
}