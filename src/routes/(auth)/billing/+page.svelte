<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import SettingsModule from "../app/settings/settings_module.svelte"
  import PricingModule from "../../(marketing)/pricing/pricing_module.svelte"
  import {
    pricingPlans,
    defaultPlanId,
    type PricingPlan,
  } from "../../(marketing)/pricing/pricing_plans"
  import {
    paymentStore,
    setStkPushPending,
    setStkPushFailed,
    confirmStkPayment,
    resetStkStatus,
    isStkPending,
    isStkFailed,
    isExpiringSoon,
    daysRemaining,
    mpesaPhone,
    stkStatusMessage,
    paymentCta,
    planLabel,
    type PlanId,
  } from "$lib/features/finance/payments.store"

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("billing")

  let { data } = $props()

  const currentPlanId = data.currentPlanId ?? defaultPlanId
  const currentPlan = pricingPlans.find((x) => x.id === data.currentPlanId)
  const currentPlanName = currentPlan?.name

  // ── Local UI state ───────────────────────────────────────────────────
  // Phone pre-filled from store (user's last used M-Pesa number)
  let phone = $state($mpesaPhone ?? "")
  let initiating = $state(false)
  let initiateError = $state<string | null>(null)
  let selectedPlan = $state<PricingPlan | null>(null)

  // Reset banner when user picks a different plan
  $effect(() => {
    if (selectedPlan) {
      resetStkStatus()
      initiateError = null
    }
  })

  // Poll for payment confirmation while STK push is pending
  $effect(() => {
    if (!$isStkPending) return

    const id = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/mpesa/status?id=${$paymentStore.checkoutRequestId}`,
        )
        const json = await res.json()

        if (json.status === "completed") {
          confirmStkPayment(
            json.plan as PlanId,
            json.mpesaRef,
            json.planExpiresAt,
          )
          clearInterval(id)
        } else if (json.status === "failed") {
          setStkPushFailed()
          clearInterval(id)
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 3_000)

    return () => clearInterval(id)
  })

  // ── Plan selection handler ───────────────────────────────────────────
  async function initiatePurchase(planId: string) {
    const plan = pricingPlans.find((p) => p.id === planId)
    if (!plan) return

    if (plan.mpesaAmount === null && !plan.contactSales) {
      await activateFreePlan(planId)
      return
    }

    if (plan.contactSales) {
      window.location.href =
        "mailto:sales@matatupulse.com?subject=Enterprise enquiry"
      return
    }

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
          amount: plan.mpesaAmount,
          planId,
        }),
      })

      const json = await res.json()

      if (json.ResponseCode !== "0") {
        initiateError =
          json.ResponseDescription ?? "M-Pesa request failed. Please try again."
        setStkPushFailed()
        return
      }

      setStkPushPending(json.CheckoutRequestID, phone)
    } catch {
      initiateError = "Network error — check your connection and try again."
      setStkPushFailed()
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
      window.location.reload()
    } catch {
      initiateError = "Failed to activate free plan. Please try again."
    } finally {
      initiating = false
    }
  }

  // ── Status banner styling ────────────────────────────────────────────
  function statusBannerClass() {
    if ($isStkPending) return "bg-blue-50 border-blue-200 text-blue-700"
    if ($isStkFailed) return "bg-red-50 border-red-200 text-red-700"
    return "bg-green-50 border-green-200 text-green-700"
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
  <!-- Expiry reminder -->
  {#if $isExpiringSoon}
    <div
      class="mb-4 px-4 py-3 rounded-lg text-sm border bg-yellow-50 border-yellow-200 text-yellow-800"
    >
      Your <strong>{$planLabel}</strong> plan expires in
      <strong>{$daysRemaining} days</strong>.
      <button class="underline ml-1" onclick={() => resetStkStatus()}
        >Renew now</button
      >
    </div>
  {/if}

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
    editButtonTitle={$paymentCta}
  />

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
    <p class="text-xs text-gray-400 mt-1">Required for paid plans.</p>
    {#if initiateError}
      <p class="text-red-600 text-xs mt-1">{initiateError}</p>
    {/if}
  </div>

  <!-- STK status banner — driven entirely by store -->
  {#if $stkStatusMessage}
    <div
      class="mb-6 px-4 py-3 rounded-lg text-sm font-medium border {statusBannerClass()}"
    >
      {#if selectedPlan}
        <span class="font-semibold">{selectedPlan.name}:</span>
      {/if}
      {$stkStatusMessage}
    </div>
  {/if}

  <PricingModule
    {currentPlanId}
    callToAction={initiating ? "Sending request…" : $paymentCta}
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
