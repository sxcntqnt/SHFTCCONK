<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import SettingsModule from "../settings/settings_module.svelte"
  import PricingModule from "../../../../(marketing)/pricing/pricing_module.svelte"
  import {
    pricingPlans,
    defaultPlanId,
  } from "../../../../(marketing)/pricing/pricing_plans"
  import {
    paymentStatus,
    subscribeToPayment,
  } from "$lib/features/finance/stores/payment"

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("billing")

  let { data } = $props()

  const currentPlanId = data.currentPlanId ?? defaultPlanId
  const currentPlanName = pricingPlans.find(
    (x) => x.id === data.currentPlanId,
  )?.name

  // ── M-Pesa STK push state ────────────────────────────────────────────
  let phone = $state("")
  let selectedPlanId = $state<string | null>(null)
  let initiating = $state(false)
  let checkoutRequestId = $state<string | null>(null)
  let initiateError = $state<string | null>(null)

  // paymentStatus store is written to by subscribeToPayment() via Supabase realtime
  let status = $state($paymentStatus)
  $effect(() => paymentStatus.subscribe((v) => (status = v)))

  // ── Cleanup realtime subscription on destroy ─────────────────────────
  let unsubscribeRealtime: (() => void) | null = null
  $effect(() => {
    return () => unsubscribeRealtime?.()
  })

  async function initiatePurchase(planId: string) {
    if (!phone || !phone.match(/^(07|01|\+2547|\+2541)\d{8}$/)) {
      initiateError = "Enter a valid Safaricom number (e.g. 0712345678)"
      return
    }

    const plan = pricingPlans.find((p) => p.id === planId)
    if (!plan) return

    initiating = true
    initiateError = null
    selectedPlanId = planId

    try {
      const res = await fetch("/api/webhooks/mpesa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          amount: plan.price,
          planId,
        }),
      })

      const json = await res.json()

      if (json.ResponseCode !== "0") {
        initiateError =
          json.ResponseDescription ?? "M-Pesa request failed. Please try again."
        initiating = false
        return
      }

      // STK push sent — start polling via Supabase realtime
      checkoutRequestId = json.CheckoutRequestID
      unsubscribeRealtime = subscribeToPayment(checkoutRequestId!)
    } catch (err) {
      initiateError =
        "Network error — please check your connection and try again."
    } finally {
      initiating = false
    }
  }

  // Friendly status messages shown while waiting
  const statusMessages: Record<string, string> = {
    pending: "Waiting for M-Pesa confirmation…",
    completed: "Payment confirmed! Your plan is now active.",
    failed: "Payment was not completed. Please try again.",
  }
</script>

<svelte:head>
  <title>Billing</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-2">
  {data.isActiveCustomer ? "Billing" : "Select a Plan"}
</h1>

<div class="mb-6">
  View our <a href="/pricing" target="_blank" class="link">pricing page</a> for details.
</div>

<!-- ── Active subscriber view ──────────────────────────────────────────── -->
{#if data.isActiveCustomer}
  <SettingsModule
    title="Subscription"
    editable={false}
    fields={[
      {
        id: "plan",
        label: "Current Plan",
        initialValue: currentPlanName ?? "",
      },
      {
        id: "expiry",
        label: "Renews / Expires",
        initialValue: data.currentPeriodEnd
          ? new Date(data.currentPeriodEnd).toLocaleDateString("en-KE")
          : "—",
      },
    ]}
    editButtonTitle="Change Plan"
  />

  <!-- Payment history (replaces Stripe portal invoices) -->
  {#if data.recentPayments.length > 0}
    <div class="mt-8">
      <h2 class="text-lg font-semibold mb-3">Recent Payments</h2>
      <div class="space-y-2">
        {#each data.recentPayments as p}
          <div
            class="flex items-center justify-between bg-white border border-gray-100
                       rounded-lg px-4 py-3 text-sm shadow-sm"
          >
            <div>
              <span class="font-mono text-gray-400 text-xs mr-3"
                >{p.transaction_id}</span
              >
              <span>KES {p.amount?.toLocaleString()}</span>
            </div>
            <div class="flex items-center gap-3">
              <span
                class="text-xs px-2 py-0.5 rounded-full font-medium"
                class:bg-green-100={p.status === "completed"}
                class:text-green-800={p.status === "completed"}
                class:bg-red-100={p.status === "failed"}
                class:text-red-800={p.status === "failed"}
                class:bg-gray-100={p.status === "pending"}
                class:text-gray-600={p.status === "pending"}
              >
                {p.status}
              </span>
              <span class="text-gray-400 text-xs">
                {new Date(p.created_at).toLocaleDateString("en-KE")}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ── No active subscription ─────────────────────────────────────────── -->
{:else}
  <!-- Phone number input — collected once, used for any plan selection -->
  <div class="mb-6 max-w-sm">
    <label
      for="mpesa-phone"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      M-Pesa Phone Number
    </label>
    <input
      id="mpesa-phone"
      type="tel"
      bind:value={phone}
      placeholder="0712 345 678"
      class="border rounded px-3 py-2 w-full text-sm
             focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    {#if initiateError}
      <p class="text-red-600 text-xs mt-1">{initiateError}</p>
    {/if}
  </div>

  <!-- STK push status banner (shown after initiating) -->
  {#if checkoutRequestId}
    <div
      class="mb-6 px-4 py-3 rounded-lg text-sm font-medium border"
      class:bg-blue-50={status === "pending"}
      class:border-blue-200={status === "pending"}
      class:text-blue-700={status === "pending"}
      class:bg-green-50={status === "completed"}
      class:border-green-200={status === "completed"}
      class:text-green-700={status === "completed"}
      class:bg-red-50={status === "failed"}
      class:border-red-200={status === "failed"}
      class:text-red-700={status === "failed"}
    >
      {statusMessages[status] ?? statusMessages.pending}
    </div>
  {/if}

  <PricingModule
    {currentPlanId}
    callToAction={initiating ? "Sending request…" : "Pay with M-Pesa"}
    center={false}
    onPlanSelect={initiatePurchase}
  />

  {#if data.hasEverPaid}
    <div class="mt-8">
      <p class="text-sm text-gray-500">
        You have previous payments on this account.
      </p>
    </div>
  {/if}
{/if}
