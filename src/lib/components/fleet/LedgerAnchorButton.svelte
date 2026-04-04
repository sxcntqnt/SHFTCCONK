<script lang="ts">
  import { onMount } from "svelte"
  import { posthog } from "$lib/client/posthog"

  export let bookingId: string
  export let agreedFareKes: number | null = null
  export let gateStatus: any = null

  type ButtonState =
    | "IDLE"
    | "LOADING"
    | "SUCCESS"
    | "ERROR"
    | "QUOTA_EXCEEDED"
    | "PER_EVENT_OFFER"

  let state: ButtonState = "IDLE"

  function deriveInitialState(gate: any): ButtonState {
    if (!gate) return "IDLE"
    if (!gate.is_gated) return "IDLE"
    if (gate.per_event_eligible && agreedFareKes && agreedFareKes > 0)
      return "PER_EVENT_OFFER"
    return "QUOTA_EXCEEDED"
  }

  $: perEventFeeKes = agreedFareKes
    ? Math.max(50, Math.round(agreedFareKes * 0.025))
    : null

  onMount(() => {
    state = deriveInitialState(gateStatus)
    posthog?.capture?.("ledger_anchor_button_rendered", {
      booking_id: bookingId,
      initial_state: state,
    })
  })

  async function handleAnchor(route: "SUBSCRIPTION" | "PER_EVENT") {
    state = "LOADING"
    posthog?.capture?.("ledger_anchor_initiated", {
      booking_id: bookingId,
      route,
      per_event_fee_kes: route === "PER_EVENT" ? perEventFeeKes : null,
      anchors_remaining: gateStatus?.anchors_remaining ?? null,
    })

    try {
      const res = await fetch(
        `/api/fleet/bookings/${bookingId}/anchor-ledger`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ route }),
        },
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (err?.code === "LEDGER_GATE_BLOCKED") {
          state = "QUOTA_EXCEEDED"
          posthog?.capture?.("ledger_anchor_gate_hit", {
            booking_id: bookingId,
            gate_reason: err.reason,
          })
          return
        }
        throw new Error(err?.message || "Anchor failed")
      }

      const body = await res.json()
      if (body.status === "ESCROW_PENDING") {
        state = "LOADING"
        posthog?.capture?.("per_event_escrow_initiated", {
          booking_id: bookingId,
          mpesa_checkout_request_id: body.mpesa_checkout_request_id,
          per_event_fee_kes: body.per_event_fee_kes,
        })
        // UI will be updated by realtime subscription when escrow completes
        return
      }

      state = "SUCCESS"
      posthog?.capture?.("ledger_anchor_completed", {
        booking_id: bookingId,
        route,
        ledger_tx_id: body.ledger_tx_id ?? null,
      })
    } catch (e) {
      state = "ERROR"
      posthog?.capture?.("ledger_anchor_error", {
        booking_id: bookingId,
        error: String(e),
      })
    }
  }
</script>

{#if state === "IDLE"}
  <button
    class="ledger-anchor-btn"
    on:click={() => handleAnchor("SUBSCRIPTION")}
  >
    🔒 Lock & Protect
    <div class="sub">
      {gateStatus?.anchors_remaining ?? "?"} remaining this month
    </div>
  </button>
{:else if state === "PER_EVENT_OFFER"}
  <div class="ledger-gate-per-event">
    <p>You've used your protected bookings this month.</p>
    <p>
      Anchor this booking for <strong
        >KES {perEventFeeKes?.toLocaleString()}</strong
      >
      (2.5% of KES {agreedFareKes?.toLocaleString()}).
    </p>
    <div class="actions">
      <button
        on:click={() => handleAnchor("PER_EVENT")}
        class="anchor-per-event"
      >
        Anchor for KES {perEventFeeKes?.toLocaleString()}
      </button>
      <a href="/billing/upgrade">Or upgrade for unlimited anchors</a>
    </div>
  </div>
{:else if state === "QUOTA_EXCEEDED"}
  <div class="ledger-gate-blocked">
    <p>Protected bookings used this month.</p>
    <a href="/billing/upgrade">Upgrade — from KES 1,200/month</a>
  </div>
{:else if state === "SUCCESS"}
  <div class="success">✅ Booking anchored. Protection active.</div>
{:else if state === "LOADING"}
  <button disabled>Anchoring to ledger…</button>
{:else if state === "ERROR"}
  <button on:click={() => handleAnchor("SUBSCRIPTION")}
    >Anchor failed — retry</button
  >
{/if}

<style>
  .ledger-anchor-btn {
    padding: 8px 12px;
  }
  .sub {
    font-size: 12px;
    color: #666;
  }
  .ledger-gate-per-event {
    border: 1px solid #eee;
    padding: 8px;
  }
  .actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .anchor-per-event {
    background: #0b74de;
    color: white;
    padding: 6px 10px;
  }
  .success {
    color: green;
  }
</style>
