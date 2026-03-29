<!-- src/routes/(auth)/admin/wallet/+page.svelte -->
<script lang="ts">
  import WalletView from "$lib/components/WalletView.svelte"
  import { WALLET_CONFIGS, fmtKes } from "$lib/features/wallet/wallet.types"

  let { data } = $props()
  const { transactions, summary, breakdown, hlfSummary } = data

  const kpis = [
    {
      label: "Reservation Revenue",
      value: fmtKes(breakdown.reservationKes),
      sub: `${breakdown.totalBookings} confirmed bookings`,
    },
    {
      label: "Active Subscribers",
      value: String(breakdown.subscriberCount),
      sub: "M-Pesa standing orders",
    },
    {
      label: "Crew Payouts Sent",
      value: fmtKes(breakdown.totalPayoutsKes),
    },
    {
      label: "B2B Settled Out",
      value: fmtKes(breakdown.totalSettledKes),
    },
  ]
</script>

<svelte:head><title>Platform Revenue — Matatu Pulse Admin</title></svelte:head>

<!-- Hyperledger enrollment health banner -->
{#if hlfSummary.exhausted > 0}
  <div
    class="mx-6 mt-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700"
  >
    <svg
      class="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <circle cx="12" cy="12" r="10" /><line
        x1="12"
        y1="8"
        x2="12"
        y2="12"
      /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    <span>
      <strong>{hlfSummary.exhausted}</strong> Fabric enrollment{hlfSummary.exhausted >
      1
        ? "s"
        : ""} exhausted —
      <a href="/admin/hyperledger" class="underline font-medium"
        >view in Hyperledger Hub →</a
      >
    </span>
  </div>
{/if}

{#if hlfSummary.pending > 0}
  <div
    class="mx-6 mt-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700"
  >
    <svg
      class="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
    <span>
      <strong>{hlfSummary.pending}</strong> enrollment{hlfSummary.pending > 1
        ? "s"
        : ""} pending · <strong>{hlfSummary.success}</strong> enrolled on Fabric
    </span>
  </div>
{/if}

<WalletView
  config={WALLET_CONFIGS.admin}
  {summary}
  {transactions}
  formResult={null}
  {kpis}
/>
