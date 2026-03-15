<script lang="ts">
  import { goto } from "$app/navigation"
  import { onMount, tick } from "svelte"
  import gsap from "gsap"
  import type { PageData } from "./$types"
  import "$lib/features/fleet/services/three/gltfLoader"
  import SeatViewer from "$lib/components/SeatViewer.svelte"
  import posthog from "posthog-js"

  let { data }: { data: PageData } = $props()

  let matatu = $derived(data.matatu)
  let config = $derived(data.config)
  let modelKey = $derived(data.modelKey ?? matatu.capacity)

  let selectedSeats = $state<number[]>([])
  let showModal = $state(false)
  let processing = $state(false)
  let message = $state("")

  let total = $derived(selectedSeats.length * matatu.pricePerSeat)
  let reservedSeats: number[] = []

  // ── Seat actions ──────────────────────────────────────────────────────────
  function toggleSeat(n: number) {
    selectedSeats = selectedSeats.includes(n)
      ? selectedSeats.filter((s) => s !== n)
      : [...selectedSeats, n]
  }

  async function openModal() {
    if (selectedSeats.length === 0) {
      message = "Please select at least one seat."
      shakeBar()
      return
    }
    message = ""
    showModal = true

    await tick()
    gsap.fromTo(
      ".modal-card",
      { opacity: 0, y: 28, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: "power3.out" },
    )
    gsap.fromTo(
      ".modal-backdrop",
      { opacity: 0 },
      { opacity: 1, duration: 0.25 },
    )

    posthog.capture("seat_reservation_initiated", {
      matatu_id: matatu.id,
      route: matatu.route,
      sacco: matatu.sacco,
      seat_count: selectedSeats.length,
      amount: total,
    })
  }

  async function closeModal() {
    await gsap.to(".modal-card", {
      opacity: 0,
      y: 16,
      scale: 0.97,
      duration: 0.22,
      ease: "power2.in",
    })
    showModal = false
    processing = false
  }

  function shakeBar() {
    gsap.fromTo(
      ".summary-bar",
      { x: 0 },
      {
        keyframes: { x: [-10, 10, -8, 8, -4, 4, 0], ease: "power1.inOut" },
        duration: 0.45,
      },
    )
  }

  // ── M-Pesa payment ────────────────────────────────────────────────────────
  async function payWithMpesa() {
    processing = true
    try {
      const res = await fetch("/reserve/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matatuId: matatu.id,
          capacity: matatu.capacity,
          seats: selectedSeats,
          amount: total,
        }),
      })
      const j = await res.json()

      if (res.ok) {
        message = "Payment started. You will receive an M-Pesa prompt shortly."
        selectedSeats = []
        showModal = false
        goto(`/app/track/${matatu.id}`)
      } else {
        message = j.error || "Payment failed. Please try again."
      }
    } catch {
      message = "Network error while initiating payment."
    } finally {
      processing = false
    }
  }

  // ── Entrance animation ─────────────────────────────────────────────────────
  onMount(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
    tl.fromTo(
      ".back-link",
      { opacity: 0, x: -14 },
      { opacity: 1, x: 0, duration: 0.5 },
    )
      .fromTo(
        ".route-eyebrow",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.45 },
        "-=0.25",
      )
      .fromTo(
        ".page-title",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5 },
        "-=0.3",
      )
      .fromTo(
        ".meta-strip",
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4 },
        "-=0.3",
      )
      .fromTo(
        ".seat-panel",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.55 },
        "-=0.2",
      )
      .fromTo(
        ".summary-bar",
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.45 },
        "-=0.3",
      )
  })
</script>

<svelte:head>
  <title>Reserve · {matatu?.route ?? ""} — Matatu Pulse</title>
</svelte:head>

<div class="page">
  <!-- Atmospheric orbs -->
  <div class="page-orb page-orb-1" aria-hidden="true"></div>
  <div class="page-orb page-orb-2" aria-hidden="true"></div>

  <div class="inner">
    <!-- Back -->
    <a href="/app/feed" class="back-link">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Back to live feed
    </a>

    <!-- Header -->
    <div class="route-eyebrow">
      <span class="eyebrow-dot"></span>
      Route {matatu.route} · {matatu.sacco}
    </div>

    <h1 class="page-title">
      {config.title} — <em>{config.totalSeats} seats</em>
    </h1>

    <div class="meta-strip">
      <span class="meta-chip price">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        KES {matatu.pricePerSeat} / seat
      </span>
      <span class="meta-chip status">
        <span class="status-dot"></span>
        {matatu.status}
      </span>
      <span class="meta-chip">{matatu.capacity}-seater</span>
      {#if matatu.occupancy > 0}
        <span class="meta-chip occupancy">{matatu.occupancy} occupied</span>
      {/if}
    </div>

    <!-- 3D Seat viewer -->
    <div class="seat-panel">
      <div class="seat-panel-head">
        <div>
          <div class="seat-panel-ey">Interactive 3D layout</div>
          <div class="seat-panel-ti">Pick Your Seat</div>
        </div>
        <div
          class="selected-badge"
          class:badge-empty={selectedSeats.length === 0}
        >
          {#if selectedSeats.length > 0}
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {selectedSeats.length} selected
          {:else}
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            Tap seats to select
          {/if}
        </div>
      </div>
      <div class="seat-inner">
        <SeatViewer
          {selectedSeats}
          {toggleSeat}
          capacity={matatu.capacity}
          {modelKey}
          {reservedSeats}
          matatuId={data.matatu.id}
        />
      </div>
    </div>

    <!-- Summary bar -->
    <div class="summary-bar">
      <div class="summary-left">
        <div class="summary-row">
          <span class="summary-label">Selected</span>
          <span class="summary-val">
            {selectedSeats.length} seat{selectedSeats.length !== 1 ? "s" : ""}
          </span>
        </div>
        {#if selectedSeats.length > 0}
          <div class="summary-seat-nums">
            {#each selectedSeats.slice().sort((a, b) => a - b) as s}
              <span class="seat-num-chip">#{s}</span>
            {/each}
          </div>
        {/if}
      </div>

      <div class="summary-right">
        <div class="total-block">
          <span class="total-label">Total</span>
          <div class="total-amount">
            <span class="total-currency">KES</span>{total}
          </div>
        </div>
        <button
          class="pay-btn"
          onclick={openModal}
          disabled={selectedSeats.length === 0}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          Reserve & Pay
        </button>
      </div>
    </div>

    {#if message && !showModal}
      <div
        class="page-message"
        class:page-message-success={message.includes("started")}
      >
        {message}
      </div>
    {/if}
  </div>
</div>

<!-- ── Confirmation modal ── -->
{#if showModal}
  <div class="modal-backdrop" onclick={closeModal} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="modal-card"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-accent-line"></div>
      <div class="modal-body">
        <div class="modal-header">
          <div class="modal-title">Confirm Reservation</div>
          <div class="modal-sub">
            Route {matatu.route} · {matatu.sacco} · {config.title}
          </div>
        </div>

        <div class="modal-seats-summary">
          <span class="modal-seats-label">Seats</span>
          <div class="modal-seat-chips">
            {#each selectedSeats.slice().sort((a, b) => a - b) as s}
              <span class="modal-seat-chip">#{s}</span>
            {/each}
          </div>
        </div>

        <div class="modal-breakdown">
          <div class="breakdown-row">
            <span>{selectedSeats.length} × KES {matatu.pricePerSeat}</span>
            <span class="val">KES {total}</span>
          </div>
          <div class="breakdown-row">
            <span>Service fee</span>
            <span class="val free">Free</span>
          </div>
        </div>

        <div class="breakdown-total">
          <span class="label">Total</span>
          <div class="total-display">
            <span class="total-kes">KES</span>
            <span class="total-num">{total}</span>
          </div>
        </div>

        {#if message}
          <div class="modal-message">{message}</div>
        {/if}
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" onclick={closeModal} disabled={processing}
          >Cancel</button
        >
        <button class="btn-mpesa" onclick={payWithMpesa} disabled={processing}>
          {#if processing}
            <span class="spin"></span> Processing…
          {:else}
            <span class="mpesa-mark">M</span> Pay with M-Pesa
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Page ── */
  .page {
    min-height: 100%;
    background: var(--ink); /* ← was missing; caused the olive bg */
    font-family: var(--font-body);
    position: relative;
    overflow: hidden;
  }

  .page-orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(90px);
    pointer-events: none;
    z-index: 0;
  }
  .page-orb-1 {
    top: -80px;
    right: -60px;
    width: 420px;
    height: 420px;
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.07),
      transparent 65%
    );
  }
  .page-orb-2 {
    bottom: -60px;
    left: -40px;
    width: 340px;
    height: 340px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.05),
      transparent 65%
    );
  }

  .inner {
    max-width: 840px;
    margin: 0 auto;
    padding: 28px 32px 48px;
    position: relative;
    z-index: 1;
  }

  /* ── Back ── */
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-3);
    text-decoration: none;
    margin-bottom: 22px;
    opacity: 0;
    transition:
      color 0.15s,
      gap 0.15s;
  }
  .back-link:hover {
    color: var(--text-1);
    gap: 9px;
  }

  /* ── Header ── */
  .route-eyebrow {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 8px;
    opacity: 0;
  }
  .eyebrow-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--orange);
    animation: pulse-o 2s ease-out infinite;
  }
  @keyframes pulse-o {
    0% {
      box-shadow: 0 0 0 0 rgba(242, 101, 34, 0.5);
    }
    70% {
      box-shadow: 0 0 0 5px rgba(242, 101, 34, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(242, 101, 34, 0);
    }
  }

  .page-title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
    margin: 0 0 12px;
    opacity: 0;
  }
  .page-title em {
    font-style: normal;
    color: var(--orange);
  }

  /* ── Meta chips ── */
  .meta-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 24px;
    opacity: 0;
  }
  .meta-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .meta-chip.price {
    border-color: rgba(0, 176, 155, 0.22);
    color: var(--teal);
    background: rgba(0, 176, 155, 0.07);
  }
  .meta-chip.status {
    border-color: rgba(242, 101, 34, 0.22);
    color: var(--orange);
    background: rgba(242, 101, 34, 0.07);
  }
  .meta-chip.occupancy {
    border-color: rgba(248, 113, 113, 0.2);
    color: #f87171;
    background: rgba(248, 113, 113, 0.06);
  }

  .status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--orange);
    animation: pulse-o 2s ease-in-out infinite;
  }

  /* ── Seat panel ── */
  .seat-panel {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--rim);
    border-radius: 20px;
    overflow: hidden;
    margin-bottom: 16px;
    opacity: 0;
  }
  .seat-panel::before {
    content: "";
    display: block;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.05),
      transparent
    );
  }
  .seat-panel-head {
    padding: 16px 20px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .seat-panel-ey {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 2px;
  }
  .seat-panel-ti {
    font-family: var(--font-display);
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .selected-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.22);
    border-radius: 100px;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--teal);
    transition: all 0.2s ease;
  }
  .badge-empty {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.06);
    color: var(--text-3);
  }
  .seat-inner {
    padding: 0;
  }

  /* ── Summary bar ── */
  .summary-bar {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 18px 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    opacity: 0;
  }
  .summary-left {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .summary-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .summary-label {
    font-size: 0.72rem;
    color: var(--text-3);
  }
  .summary-val {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .summary-seat-nums {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .seat-num-chip {
    font-family: monospace;
    font-size: 0.66rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 6px;
    background: rgba(14, 165, 233, 0.08);
    color: #0ea5e9;
    border: 1px solid rgba(14, 165, 233, 0.15);
  }

  .summary-right {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .total-block {
    text-align: right;
  }
  .total-label {
    font-size: 0.62rem;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }
  .total-amount {
    font-family: var(--font-display);
    font-size: 1.9rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    color: var(--text-1);
    line-height: 1;
  }
  .total-currency {
    font-size: 0.82rem;
    color: var(--text-3);
    font-weight: 600;
    font-family: var(--font-body);
    letter-spacing: 0;
    margin-right: 2px;
  }

  .pay-btn {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 12px 24px;
    background: linear-gradient(135deg, var(--orange), #c4420c);
    border: none;
    border-radius: 12px;
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
    cursor: pointer;
    box-shadow:
      0 6px 22px rgba(242, 101, 34, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transition:
      box-shadow 0.2s,
      transform 0.12s,
      opacity 0.15s;
  }
  .pay-btn:hover:not(:disabled) {
    box-shadow:
      0 10px 32px rgba(242, 101, 34, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
  .pay-btn:active:not(:disabled) {
    transform: scale(0.97);
  }
  .pay-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ── Page message ── */
  .page-message {
    margin-top: 12px;
    padding: 10px 16px;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 12px;
    font-size: 0.78rem;
    color: #f87171;
  }
  .page-message-success {
    background: rgba(0, 176, 155, 0.08);
    border-color: rgba(0, 176, 155, 0.2);
    color: var(--teal);
  }

  /* ── Modal ── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal-card {
    background: var(--ink-2, #0d0d18);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 22px;
    width: 100%;
    max-width: 440px;
    overflow: hidden;
    box-shadow: 0 28px 80px rgba(0, 0, 0, 0.65);
  }
  .modal-accent-line {
    height: 3px;
    background: linear-gradient(90deg, var(--orange), rgba(242, 101, 34, 0.1));
  }
  .modal-body {
    padding: 22px 24px 10px;
  }
  .modal-header {
    margin-bottom: 18px;
  }
  .modal-title {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
    margin: 0 0 3px;
  }
  .modal-sub {
    font-size: 0.72rem;
    color: var(--text-3);
  }

  .modal-seats-summary {
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    margin-bottom: 16px;
  }
  .modal-seats-label {
    font-size: 0.58rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-3);
    margin-bottom: 7px;
    display: block;
  }
  .modal-seat-chips {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .modal-seat-chip {
    font-family: monospace;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 6px;
    background: rgba(14, 165, 233, 0.08);
    color: #0ea5e9;
    border: 1px solid rgba(14, 165, 233, 0.15);
  }

  .modal-breakdown {
    display: flex;
    flex-direction: column;
    margin-bottom: 6px;
  }
  .breakdown-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.78rem;
    color: var(--text-3);
  }
  .breakdown-row:last-child {
    border-bottom: none;
  }
  .breakdown-row .val {
    color: var(--text-2);
    font-weight: 600;
  }
  .breakdown-row .free {
    color: var(--teal);
  }

  .breakdown-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 0 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  .breakdown-total .label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .total-display {
    display: flex;
    align-items: baseline;
    gap: 3px;
  }
  .total-kes {
    font-size: 0.78rem;
    color: var(--text-3);
    font-weight: 600;
  }
  .total-num {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
  }

  .modal-message {
    margin: 8px 0;
    padding: 8px 12px;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 9px;
    font-size: 0.73rem;
    color: #f87171;
  }

  .modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 14px 24px 20px;
  }
  .btn-cancel {
    padding: 10px 18px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-cancel:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }
  .btn-cancel:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-mpesa {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 22px;
    border-radius: 10px;
    background: linear-gradient(135deg, #4caf50, #2e7d32);
    border: none;
    font-family: var(--font-display);
    font-size: 0.88rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
    cursor: pointer;
    box-shadow:
      0 4px 16px rgba(76, 175, 80, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transition:
      box-shadow 0.2s,
      transform 0.12s,
      opacity 0.15s;
  }
  .btn-mpesa:hover:not(:disabled) {
    box-shadow:
      0 8px 24px rgba(76, 175, 80, 0.38),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
  .btn-mpesa:active:not(:disabled) {
    transform: scale(0.97);
  }
  .btn-mpesa:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spin {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: #fff;
    animation: sp 0.65s linear infinite;
    display: inline-block;
  }
  @keyframes sp {
    to {
      transform: rotate(360deg);
    }
  }

  .mpesa-mark {
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    background: rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    padding: 1px 5px;
  }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .inner {
      padding: 20px 16px 40px;
    }
    .summary-bar {
      flex-direction: column;
      align-items: stretch;
    }
    .summary-right {
      flex-direction: row-reverse;
      justify-content: space-between;
    }
    .total-block {
      text-align: left;
    }
  }
</style>
