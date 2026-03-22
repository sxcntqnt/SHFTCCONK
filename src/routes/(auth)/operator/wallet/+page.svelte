<!-- src/routes/(auth)/operator/wallet/+page.svelte -->
<script lang="ts">
  import WalletView from "$lib/features/finance/WalletView.svelte"
  import { WALLET_CONFIGS, fmtKes } from "$lib/features/finance/wallet.types"

  let { data, form } = $props()
  const {
    transactions,
    summary,
    orgBreakdown,
    mpesaPhone,
    orgSlots,
    tripCount,
    vehicleCount,
  } = data

  const tripFeesTotal = transactions
    .filter((t: any) => t.type === "operator_fee" && t.status === "completed")
    .reduce((s: number, t: any) => s + t.amountKes, 0)

  const bonusTotal = transactions
    .filter((t: any) => t.type === "bonus" && t.status === "completed")
    .reduce((s: number, t: any) => s + t.amountKes, 0)

  const kpis = [
    {
      label: "Orgs Managed",
      value: String(orgSlots.length),
      sub: `${vehicleCount} vehicle${vehicleCount !== 1 ? "s" : ""} allocated`,
    },
    {
      label: "Trip Fees Earned",
      value: fmtKes(tripFeesTotal),
      sub: `${tripCount} trips dispatched`,
    },
    {
      label: "Bonuses",
      value: fmtKes(bonusTotal),
      sub: "Utilisation rewards",
    },
    {
      label: "Withdrawn",
      value: fmtKes(summary.totalSpentKes),
      sub: "To M-Pesa or paybill",
    },
  ]
</script>

<svelte:head><title>Operator Wallet — Matatu Pulse</title></svelte:head>

<WalletView
  config={WALLET_CONFIGS.operator}
  {summary}
  {transactions}
  formResult={form}
  {kpis}
  {orgBreakdown}
  {mpesaPhone}
/>
