<!-- src/routes/(auth)/app/wallet/+page.svelte -->
<script lang="ts">
  import WalletView from "$lib/components/WalletView.svelte"
  import { enhance } from "$app/forms"
  import { WALLET_CONFIGS, fmtKes } from "$lib/features/wallet/wallet.types"

  let { data, form } = $props()
  const {
    transactions,
    summary,
    mpesaPhone,
    isSubscribed,
    isMinor,
    showPlanNudge,
    dailyLimit,
    perTransactionLimit,
    hlfStatus,
  } = data

  const kpis = [
    { label: "Total Topped Up", value: fmtKes(summary.totalEarnedKes) },
    { label: "Spent on Bookings", value: fmtKes(summary.totalSpentKes) },
    {
      label: "Refunds Received",
      value: fmtKes(
        transactions
          .filter((t: any) => t.type === "booking_refund")
          .reduce((s: number, t: any) => s + t.amountKes, 0),
      ),
    },
    { label: "Transactions", value: String(transactions.length) },
  ]

  let refreshing = $state(false)
</script>

<svelte:head><title>My Wallet — Matatu Pulse</title></svelte:head>

<!-- ── M-PESA GO limits (minor accounts) ──────────────────────────────────── -->
{#if isMinor && (dailyLimit || perTransactionLimit)}
  <div
    class="mx-6 mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700"
  >
    <div class="font-medium mb-1">M-PESA GO account limits</div>
    <div class="flex gap-4 text-xs">
      {#if perTransactionLimit}
        <span
          >Per transaction: <strong
            >KES {perTransactionLimit.toLocaleString()}</strong
          ></span
        >
      {/if}
      {#if dailyLimit}
        <span>Daily: <strong>KES {dailyLimit.toLocaleString()}</strong></span>
      {/if}
    </div>
  </div>
{/if}

<!-- ── Plan nudge (free plan only) ────────────────────────────────────────── -->
{#if showPlanNudge}
  <div
    class="mx-6 mt-6 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-sm font-semibold text-indigo-800 mb-1">
          Upgrade for automatic identity refresh
        </div>
        <div class="text-xs text-indigo-600 leading-relaxed">
          Free plan users must manually refresh their Fabric identity when
          certificates expire. Subscribed users are refreshed automatically — no
          action needed.
        </div>

        {#if hlfStatus?.status === "success"}
          <div class="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
            <svg
              class="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Identity enrolled on Fabric · Enrolled {hlfStatus.enrolledAt
              ? new Date(hlfStatus.enrolledAt).toLocaleDateString("en-KE")
              : "—"}
          </div>
        {:else if hlfStatus?.status === "pending" || hlfStatus?.status === "retrying"}
          <div class="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
            <svg
              class="h-3.5 w-3.5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".2" /><path
                d="M21 12a9 9 0 00-9-9"
              />
            </svg>
            Identity refresh in progress…
          </div>
        {:else}
          <!-- Manual refresh trigger for free plan users -->
          <form
            method="POST"
            action="?/refreshIdentity"
            use:enhance={() => {
              refreshing = true
              return async ({ update }) => {
                await update()
                refreshing = false
              }
            }}
          >
            <button
              type="submit"
              disabled={refreshing}
              class="mt-3 rounded-lg border border-indigo-300 bg-white px-4 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              {refreshing ? "Queuing refresh…" : "Refresh identity manually"}
            </button>
          </form>
        {/if}
      </div>

      <a
        href="/app/plans"
        class="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors whitespace-nowrap"
      >
        View plans
      </a>
    </div>

    {#if form?.error}
      <div class="mt-2 text-xs text-rose-600">{form.error}</div>
    {/if}
    {#if form?.success && form.message}
      <div class="mt-2 text-xs text-emerald-700">{form.message}</div>
    {/if}
  </div>
{/if}

<WalletView
  config={WALLET_CONFIGS.passenger}
  {summary}
  {transactions}
  formResult={form}
  {kpis}
  {mpesaPhone}
/>
