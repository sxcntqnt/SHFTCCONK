<!-- src/routes/(auth)/admin/wallet/+page.svelte -->
<script lang="ts">
  import WalletView from "$lib/components/WalletView.svelte"
  import { WALLET_CONFIGS, fmtKes } from "$lib/features/wallet/wallet.types"

  let { data } = $props()
  const { transactions, summary, breakdown } = data

  const kpis = [
    {
      label: "Reservation Revenue",
      value: fmtKes(breakdown.reservationKes),
      sub: `${breakdown.totalBookings} bookings · ${breakdown.totalSeats} seats`,
    },
    { label: "Plan Revenue", value: fmtKes(breakdown.planKes) },
    { label: "Crew Payouts Sent", value: fmtKes(breakdown.totalPayoutsKes) },
    { label: "B2B Settled Out", value: fmtKes(breakdown.totalSettledKes) },
  ]
</script>

<svelte:head><title>Platform Revenue — Matatu Pulse Admin</title></svelte:head>

<WalletView
  config={WALLET_CONFIGS.admin}
  {summary}
  {transactions}
  formResult={null}
  {kpis}
/>
