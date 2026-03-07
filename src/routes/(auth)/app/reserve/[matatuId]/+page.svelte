<script lang="ts">
  /**
   * /reserve/[id]/+page.svelte
   *
   * Receives matatu data from the load function — never manages it internally.
   * Flow: Feed card → goto(/reserve/[id]) → load() → this page → goto(/track/[id])
   */

  import { goto } from "$app/navigation"
  import { onMount } from "svelte"
  import gsap from "gsap"
  import type { PageData } from "./$types"
  import SeatViewer from "$lib/components/SeatViewer.svelte"
  import posthog from "posthog-js"

  // ── Props ─────────────────────────────────────────────────────────────────
  let { data }: { data: PageData } = $props()

  let matatu = $derived(data.matatu)
  let config = $derived(data.config)

  // ── State ─────────────────────────────────────────────────────────────────
  let selectedSeats = $state<number[]>([])
  let showModal = $state(false)
  let processing = $state(false)
  let message = $state("")

  let total = $derived(selectedSeats.length * matatu.pricePerSeat)

  // ── Seat actions ──────────────────────────────────────────────────────────
  function toggleSeat(n: number) {
    selectedSeats = selectedSeats.includes(n)
      ? selectedSeats.filter((s) => s !== n)
      : [...selectedSeats, n]
  }

  function openModal() {
    if (selectedSeats.length === 0) {
      message = "Please select at least one seat."
      shakeBar()
      return
    }
    message = ""
    showModal = true

    // Animate modal in
    requestAnimationFrame(() => {
      gsap.fromTo(
        ".modal-card",
        { opacity: 0, y: 24, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "power3.out" },
      )
      gsap.fromTo(
        ".modal-backdrop",
        { opacity: 0 },
        { opacity: 1, duration: 0.25 },
      )
    })

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

  // Shake the summary bar when user tries to pay with no seats
  function shakeBar() {
    gsap.fromTo(
      ".summary-bar",
      { x: 0 },
      { x: [-10, 10, -8, 8, -4, 4, 0], duration: 0.45, ease: "power1.inOut" },
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
        goto(`/track/${matatu.id}`)
      } else {
        message = j.error || "Payment failed. Please try again."
      }
    } catch {
      message = "Network error while initiating payment."
    } finally {
      processing = false
    }
  }

  // ── Entrance animation ────────────────────────────────────────────────────
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
  <div class="inner">
    <!-- Back -->
    <a href="/feed" class="back-link">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
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
      <span class="meta-chip price">KES {matatu.pricePerSeat} / seat</span>
      <span class="meta-chip status">{matatu.status}</span>
      <span class="meta-chip">{matatu.capacity}-seater</span>
    </div>

    <!-- Seat viewer -->
    <div class="seat-panel">
      <div class="seat-panel-head">
        <div>
          <div class="seat-panel-ey">Interactive layout</div>
          <div class="seat-panel-ti">Pick Your Seat</div>
        </div>
        <div class="selected-badge {selectedSeats.length === 0 ? 'empty' : ''}">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {selectedSeats.length} selected
        </div>
      </div>

      <div class="seat-inner">
        <SeatViewer
          {selectedSeats}
          {toggleSeat}
          capacity={matatu.capacity}
          modelKey={matatu.capacity}
        />
      </div>
    </div>

    <!-- Summary bar -->
    <div class="summary-bar">
      <div class="summary-left">
        <div class="summary-row">
          <span class="summary-label">Selected:</span>
          <span class="summary-val"
            >{selectedSeats.length} seat{selectedSeats.length !== 1
              ? "s"
              : ""}</span
          >
        </div>
        <div class="summary-row">
          <span class="summary-label">Price:</span>
          <span class="summary-val">KES {matatu.pricePerSeat} / seat</span>
        </div>
      </div>

      <div class="summary-right">
        <div class="total-amount">
          <span>KES </span>{total}
        </div>
        <button class="pay-btn" onclick={openModal}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          Reserve / Pay
        </button>
      </div>
    </div>

    {#if message && !showModal}
      <div class="page-message">{message}</div>
    {/if}
  </div>
</div>

<!-- ── Confirmation modal ── -->
{#if showModal}
  <div class="modal-backdrop" onclick={closeModal} role="presentation">
    <!-- Stop click propagation so clicking the card doesn't close -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="modal-card"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-accent"></div>
      <div class="modal-body">
        <div class="modal-title">Confirm Reservation</div>
        <div class="modal-sub">
          Route {matatu.route} · {matatu.sacco} · {config.title}
        </div>

        <div class="modal-seats-summary">
          You selected <strong>{selectedSeats.length}</strong>
          seat{selectedSeats.length !== 1 ? "s" : ""}:
          <span class="seat-nums"
            >{selectedSeats
              .slice()
              .sort((a, b) => a - b)
              .join(", ")}</span
          >
        </div>

        <div class="modal-breakdown">
          <div class="breakdown-row">
            <span>{selectedSeats.length} × KES {matatu.pricePerSeat}</span>
            <span class="val">KES {total}</span>
          </div>
          <div class="breakdown-row">
            <span>Service fee</span>
            <span class="val" style="color:var(--teal)">Free</span>
          </div>
        </div>
        <div class="breakdown-total">
          <span class="label">Total</span>
          <span class="val">KES {total}</span>
        </div>

        {#if message}
          <div class="modal-message">{message}</div>
        {/if}
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" onclick={closeModal} disabled={processing}>
          Cancel
        </button>
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
  /* ── Page ────────────────────────────────────────────────────────────────── */
  .page {
    min-height: 100vh;
    background: var(--ink);
    font-family: var(--font-body);
    padding: 36px 0 80px;
    position: relative;
    overflow-x: hidden;
  }

  /* Atmospheric gradients */
  .page::before {
    content: "";
    position: fixed;
    top: -100px;
    right: -80px;
    width: 480px;
    height: 480px;
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.07),
      transparent 65%
    );
    pointer-events: none;
    z-index: 0;
  }
  .page::after {
    content: "";
    position: fixed;
    bottom: -80px;
    left: -60px;
    width: 380px;
    height: 380px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.05),
      transparent 65%
    );
    pointer-events: none;
    z-index: 0;
  }

  .inner {
    max-width: 820px;
    margin: 0 auto;
    padding: 0 24px;
    position: relative;
    z-index: 1;
  }

  /* ── Back link ───────────────────────────────────────────────────────────── */
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-3);
    text-decoration: none;
    margin-bottom: 28px;
    transition:
      color 0.15s,
      gap 0.15s;
    opacity: 0; /* animated in */
  }
  .back-link:hover {
    color: var(--text-1);
    gap: 9px;
  }

  /* ── Header ──────────────────────────────────────────────────────────────── */
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
  }

  .page-title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
    margin-bottom: 10px;
    opacity: 0;
  }
  .page-title em {
    font-style: normal;
    color: var(--orange);
  }

  .meta-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 28px;
    opacity: 0;
  }
  .meta-chip {
    padding: 4px 11px;
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

  /* ── Seat viewer card ────────────────────────────────────────────────────── */
  .seat-panel {
    background: rgba(255, 255, 255, 0.025);
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
      rgba(255, 255, 255, 0.06),
      transparent
    );
  }
  .seat-panel-head {
    padding: 16px 20px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .seat-panel-ey {
    font-size: 0.6rem;
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
    gap: 6px;
    padding: 5px 12px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.22);
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--teal);
    transition: opacity 0.2s;
  }
  .selected-badge.empty {
    opacity: 0;
    pointer-events: none;
  }
  .seat-inner {
    padding: 20px;
  }

  /* ── Summary bar ─────────────────────────────────────────────────────────── */
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
  .summary-bar::before {
    content: "";
    display: block;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.06),
      transparent
    );
  }

  .summary-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .summary-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .summary-label {
    font-size: 0.75rem;
    color: var(--text-3);
  }
  .summary-val {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-1);
  }

  .summary-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
  .total-amount {
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    color: var(--text-1);
    line-height: 1;
  }
  .total-amount span {
    font-size: 1rem;
    color: var(--text-3);
    font-weight: 600;
    font-family: var(--font-body);
    letter-spacing: 0;
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
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
    cursor: pointer;
    box-shadow:
      0 6px 22px rgba(242, 101, 34, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transition:
      box-shadow 0.2s,
      transform 0.12s;
  }
  .pay-btn:hover {
    box-shadow:
      0 10px 32px rgba(242, 101, 34, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
  .pay-btn:active {
    transform: scale(0.97);
  }

  /* Message */
  .page-message {
    margin-top: 12px;
    padding: 9px 14px;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 10px;
    font-size: 0.75rem;
    color: #f87171;
  }

  /* ── Modal ───────────────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal-card {
    background: var(--ink-2, #0f0f16);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 22px;
    width: 100%;
    max-width: 440px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
    position: relative;
  }
  .modal-card::before {
    content: "";
    display: block;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.07),
      transparent
    );
  }
  /* Orange accent top line */
  .modal-accent {
    height: 3px;
    background: linear-gradient(90deg, var(--orange), rgba(242, 101, 34, 0.2));
  }

  .modal-body {
    padding: 22px 24px 8px;
  }

  .modal-title {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
    margin-bottom: 3px;
  }
  .modal-sub {
    font-size: 0.72rem;
    color: var(--text-3);
    margin-bottom: 18px;
  }

  .modal-seats-summary {
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    font-size: 0.8rem;
    color: var(--text-2);
    margin-bottom: 16px;
  }
  .modal-seats-summary strong {
    color: var(--text-1);
  }
  .seat-nums {
    font-family: monospace;
    color: var(--orange);
    font-size: 0.78rem;
  }

  .modal-breakdown {
    display: flex;
    flex-direction: column;
    gap: 0;
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
  .breakdown-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin-top: 4px;
  }
  .breakdown-total .label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .breakdown-total .val {
    font-family: var(--font-display);
    font-size: 1.3rem;
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
    padding: 16px 24px 20px;
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
      0 4px 16px rgba(76, 175, 80, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transition:
      box-shadow 0.2s,
      transform 0.12s,
      opacity 0.15s;
  }
  .btn-mpesa:hover:not(:disabled) {
    box-shadow:
      0 8px 24px rgba(76, 175, 80, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
  .btn-mpesa:active {
    transform: scale(0.97);
  }
  .btn-mpesa:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* Spinner */
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

  /* M-Pesa logo mark */
  .mpesa-mark {
    font-size: 0.65rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    background: rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    padding: 1px 5px;
  }
</style>
