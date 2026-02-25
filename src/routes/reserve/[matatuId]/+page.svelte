<script lang="ts">
  /**
   * /reserve/[id]/+page.svelte
   *
   * Receives matatu data from the load function — never manages it internally.
   * Flow: Feed card → goto(/reserve/[id]) → load() → this page → goto(/track/[id])
   */
  import { goto } from '$app/navigation'
  import type { PageData } from './$types'
  import SeatViewer from '$lib/components/SeatViewer.svelte'

  export let data: PageData

  $: ({ matatu, config } = data)

  let selectedSeats: number[] = []
  let showModal = false
  let processing = false
  let message = ''

  $: total = selectedSeats.length * matatu.pricePerSeat

  function toggleSeat(n: number) {
    selectedSeats = selectedSeats.includes(n)
      ? selectedSeats.filter((s) => s !== n)
      : [...selectedSeats, n]
  }

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
          matatuId:    matatu.id,
          capacity:    matatu.capacity,
          seats:       selectedSeats,
          amount:      total,
        })
      })

      const j = await res.json()

      if (res.ok) {
        message = 'Payment started. You will receive an M-Pesa prompt shortly.'
        selectedSeats = []
        showModal = false
        goto(`/track/${matatu.id}`)
      } else {
        message = j.error || 'Payment failed. Please try again.'
      }
    } catch {
      message = 'Network error while initiating payment.'
    } finally {
      processing = false
    }
  }
</script>

<div class="p-6 max-w-6xl mx-auto">

  <a href="/feed" class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
    Back to live feed
  </a>

  <div class="mb-6">
    <div class="text-xs font-bold uppercase tracking-widest text-orange-500 mb-1">
      Route {matatu.route} · {matatu.sacco}
    </div>
    <h1 class="text-2xl font-bold">
      {config.title} — {config.totalSeats} seats
    </h1>
    <p class="text-sm text-gray-500 mt-1">
      KES {matatu.pricePerSeat} per seat · {matatu.status}
    </p>
  </div>

  <div class="bg-white rounded shadow p-4">
    <SeatViewer
      {selectedSeats}
      {toggleSeat}
      capacity={matatu.capacity}
      modelKey={matatu.capacity}
    />
  </div>

  <div class="mt-6 p-4 bg-white rounded shadow flex items-center justify-between gap-4 flex-wrap">
    <div class="space-y-1">
      <div class="text-sm text-gray-500">
        Selected: <span class="font-bold text-gray-800">{selectedSeats.length} seat{selectedSeats.length === 1 ? '' : 's'}</span>
      </div>
      <div class="text-sm text-gray-500">
        Price: <span class="font-bold text-gray-800">KES {matatu.pricePerSeat} / seat</span>
      </div>
    </div>
    <div class="text-right">
      <div class="text-xl font-bold">KES {total}</div>
      <button
        on:click={openModal}
        class="mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
      >
        Reserve / Pay
      </button>
    </div>
  </div>

  {#if message && !showModal}
    <div class="mt-3 text-sm text-red-600">{message}</div>
  {/if}

</div>

{#if showModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div
      class="absolute inset-0 bg-black/40"
      role="button"
      tabindex="0"
      on:click={closeModal}
      on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeModal() } }}
    />
    <div class="bg-white rounded-lg shadow-xl z-10 max-w-md w-full mx-4 p-6">
      <h3 class="text-xl font-bold mb-1">Confirm Reservation</h3>
      <p class="text-xs text-gray-400 mb-4">Route {matatu.route} · {matatu.sacco} · {config.title}</p>
      <p class="text-sm text-gray-600 mb-4">
        You selected <strong>{selectedSeats.length}</strong> seat{selectedSeats.length === 1 ? '' : 's'}:
        <span class="font-mono">{selectedSeats.sort((a, b) => a - b).join(', ')}</span>
      </p>
      <div class="space-y-2 mb-6">
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">{selectedSeats.length} × KES {matatu.pricePerSeat}</span>
          <span>KES {total}</span>
        </div>
        <div class="flex justify-between text-sm text-gray-400">
          <span>Service fee</span>
          <span>KES 0</span>
        </div>
        <div class="border-t pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span>KES {total}</span>
        </div>
      </div>
      {#if message}
        <div class="mb-4 text-sm text-red-600">{message}</div>
      {/if}
      <div class="flex gap-2 justify-end">
        <button class="px-4 py-2 rounded border text-sm" on:click={closeModal} disabled={processing}>
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded transition-colors disabled:opacity-60"
          on:click={payWithMpesa}
          disabled={processing}
        >
          {processing ? 'Processing…' : 'Pay with M-Pesa'}
        </button>
      </div>
    </div>
  </div>
{/if}
