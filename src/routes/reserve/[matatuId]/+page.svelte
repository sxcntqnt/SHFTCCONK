<script lang="ts">
  import { matatuConfigs, validateCapacity } from '$lib/matatu'
  import MatatuViewer from '$lib/components/MatatuViewer.svelte'

  let selected: string = '14'
  let config = matatuConfigs['14']

  $: config = matatuConfigs[validateCapacity(selected)]

  // Pricing
  const PRICE_PER_SEAT = 20
  let selectedSeats: number[] = []

  // UI State
  let showModal = false
  let processing = false
  let message = ''

  // Seat toggle (used by 3D viewer)
  function toggleSeat(n: number) {
    if (selectedSeats.includes(n)) {
      selectedSeats = selectedSeats.filter(s => s !== n)
    } else {
      selectedSeats = [...selectedSeats, n]
    }
  }

  $: total = selectedSeats.length * PRICE_PER_SEAT

  function openModal() {
    if (selectedSeats.length === 0) {
      message = 'Please select at least one seat.'
      return
    }
    message = ''
    showModal = true
  }

  function closeModal() {
    showModal = false
    processing = false
  }

async function payWithMpesa() {
  processing = true
  try {
    const res = await fetch('/reserve/pay', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        capacity: selected,
        seats: selectedSeats,
        amount: total,
        matatuId: config.id  // send the matatu ID to backend
      })
    })

    const j = await res.json()

    if (res.ok) {
      message =
        'Payment started. You will receive an M-Pesa prompt shortly.'
      
      // Clear selected seats
      selectedSeats = []

      // === Redirect to Tracking page automatically ===
      goto(`/track/${config.id}`)
    } else {
      message = j.error || 'Payment failed'
    }
  } catch (e) {
    console.error(e)
    message = 'Network error while initiating payment.'
  } finally {
    processing = false
    showModal = false
  }
}
</script>

<div class="p-6 max-w-6xl mx-auto">
  <h1 class="text-2xl font-bold mb-4">Reserve Matatu</h1>

  <div class="mb-4">
    <h2 class="font-semibold">
      {config.title} — {config.totalSeats} seats
    </h2>
  </div>

  <!-- 3D VIEWER -->
  <div class="bg-white rounded shadow p-4">
    <MatatuViewer
      {selectedSeats}
      {toggleSeat}
      capacity={selected}
    />
  </div>

  <!-- PRICE SUMMARY -->
  <div class="mt-6 p-4 bg-white rounded shadow flex items-center justify-between">
    <div>
      <div class="text-sm text-gray-500">
        Selected seats:
        <span class="font-bold">{selectedSeats.length}</span>
      </div>
      <div class="text-sm text-gray-500">
        Price per seat:
        <span class="font-bold">{PRICE_PER_SEAT} KES</span>
      </div>
    </div>

    <div class="text-right">
      <div class="text-lg font-bold">
        Total: {total} KES
      </div>
      <div class="mt-2">
        <button
          on:click={openModal}
          class="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Reserve / Pay
        </button>
      </div>
    </div>
  </div>

  {#if message}
    <div class="mt-3 text-sm text-red-600">
      {message}
    </div>
  {/if}
</div>

<!-- MODAL -->
{#if showModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div
      class="absolute inset-0 bg-black/40"
      role="button"
      tabindex="0"
      on:click={closeModal}
      on:keydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          closeModal()
        }
      }}
    ></div>

    <div class="bg-white rounded-lg shadow-xl z-10 max-w-md w-full p-6">
      <h3 class="text-xl font-bold mb-2">
        Confirm Reservation
      </h3>

      <p class="text-sm text-gray-600 mb-4">
        You selected
        <strong>{selectedSeats.length}</strong> seat(s):
        {selectedSeats.join(', ')}
      </p>

      <div class="mb-4">
        <div class="flex justify-between">
          <span>Subtotal</span>
          <span>{selectedSeats.length * PRICE_PER_SEAT} KES</span>
        </div>
        <div class="flex justify-between text-sm text-gray-500">
          <span>Service fee</span>
          <span>0 KES</span>
        </div>
        <div class="border-t mt-2 pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span>{total} KES</span>
        </div>
      </div>

      <div class="flex gap-2 justify-end">
        <button
          class="px-4 py-2 rounded border"
          on:click={closeModal}
          disabled={processing}
        >
          Cancel
        </button>

        <button
          class="px-4 py-2 bg-green-600 text-white rounded"
          on:click={payWithMpesa}
          disabled={processing}
        >
          {processing ? 'Processing...' : 'Pay with M-Pesa'}
        </button>
      </div>
    </div>
  </div>
{/if}