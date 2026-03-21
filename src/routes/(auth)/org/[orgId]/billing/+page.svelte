<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import SettingsModule from "../../../app/settings/settings_module.svelte"
  import PricingModule from "../../../../(marketing)/pricing/pricing_module.svelte"
  import {
    pricingPlans,
    defaultPlanId,
    type PricingPlan,
  } from "../../../../(marketing)/pricing/pricing_plans"
  import {
    paymentStatus,
    subscribeToPayment,
  } from "$lib/features/finance/payments.store"

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("billing")

  let { data } = $props()

  const currentPlanId = data.currentPlanId ?? defaultPlanId
  const currentPlan = pricingPlans.find((x) => x.id === data.currentPlanId)
  const currentPlanName = currentPlan?.name

  // ── M-Pesa STK push state ────────────────────────────────────────────
  let phone = $state("")
  let initiating = $state(false)
  let checkoutRequestId = $state<string | null>(null)
  let initiateError = $state<string | null>(null)
  let selectedPlan = $state<PricingPlan | null>(null)

  // paymentStatus is updated by subscribeToPayment() via Supabase realtime
  let status = $state($paymentStatus)
  $effect(() => paymentStatus.subscribe((v) => (status = v)))

  let unsubscribeRealtime: (() => void) | null = null
  $effect(() => () => unsubscribeRealtime?.())

  // Reset status banner when user picks a different plan
  $effect(() => {
    if (selectedPlan) {
      checkoutRequestId = null
      unsubscribeRealtime?.()
    }
  })

  // ── Plan selection handler (passed to PricingModule) ─────────────────
  async function initiatePurchase(planId: string) {
    const plan = pricingPlans.find((p) => p.id === planId)
    if (!plan) return

    // Free plan — activate without payment
    if (plan.mpesaAmount === null && !plan.contactSales) {
      await activateFreePlan(planId)
      return
    }

    // Enterprise — open contact link, no STK push
    if (plan.contactSales) {
      window.location.href =
        "mailto:sales@matatupulse.com?subject=Enterprise enquiry"
      return
    }

    // Validate phone before showing any plan-specific errors
    if (!phone.match(/^(07|01|\+2547|\+2541)\d{8}$/)) {
      initiateError = "Enter a valid Safaricom number (e.g. 0712345678)"
      return
    }

    initiating = true
    initiateError = null
    selectedPlan = plan

    try {
      const res = await fetch("/api/webhooks/mpesa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          amount: plan.mpesaAmount, // numeric KES — not the display string
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

      checkoutRequestId = json.CheckoutRequestID
      unsubscribeRealtime = subscribeToPayment(checkoutRequestId!)
    } catch {
      initiateError =
        "Network error — please check your connection and try again."
    } finally {
      initiating = false
    }
  }

  async function activateFreePlan(planId: string) {
    initiating = true
    try {
      await fetch("/api/webhooks/mpesa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, amount: 0, phoneNumber: null }),
      })
      // Reload to reflect updated subscription from server
      window.location.reload()
    } catch {
      initiateError = "Failed to activate free plan. Please try again."
    } finally {
      initiating = false
    }
  }

  // ── Status banner copy ───────────────────────────────────────────────
  const statusMessages: Record<string, string> = {
    pending: "Waiting for M-Pesa confirmation — check your phone…",
    completed: "Payment confirmed! Your plan is now active.",
    failed: "Payment was not completed. Please try again.",
  }

  function statusBannerClass(s: string) {
    const map: Record<string, string> = {
      pending: "bg-blue-50 border-blue-200 text-blue-700",
      completed: "bg-green-50 border-green-200 text-green-700",
      failed: "bg-red-50 border-red-200 text-red-700",
    }
    return map[s] ?? map.pending
  }
</script>

<svelte:head>
  <title>Billing</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-2">
  {data.isActiveCustomer ? "Billing" : "Select a Plan"}
</h1>

<div class="mb-6 text-sm text-gray-500">
  View our <a href="/pricing" target="_blank" class="link">pricing page</a> for full
  details. All prices in KES. Paid via M-Pesa.
</div>

<!-- ── Active subscriber ──────────────────────────────────────────────── -->
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

  <!-- Recent payments -->
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
              <span class="font-mono text-gray-400 text-xs mr-3">
                {p.transaction_id}
              </span>
              <span>KES {p.amount?.toLocaleString("en-KE")}</span>
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
  <!-- Phone input — shown for paid plans, hidden for free/enterprise -->
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
    <p class="text-xs text-gray-400 mt-1">
      Required for Starter, Pro, and Business plans. Not needed for Free.
    </p>
    {#if initiateError}
      <p class="text-red-600 text-xs mt-1">{initiateError}</p>
    {/if}
  </div>

  <!-- STK status banner -->
  {#if checkoutRequestId}
    <div
      class="mb-6 px-4 py-3 rounded-lg text-sm font-medium border {statusBannerClass(
        status,
      )}"
    >
      {#if selectedPlan}
        <span class="font-semibold">{selectedPlan.name}:</span>
      {/if}
      {statusMessages[status] ?? statusMessages.pending}
    </div>
  {/if}

  <PricingModule
    {currentPlanId}
    callToAction={initiating ? "Sending request…" : "Get Started"}
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
