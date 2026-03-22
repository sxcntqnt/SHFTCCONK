<!-- src/routes/(auth)/org/[orgId]/wallet/+page.svelte -->
<script lang="ts">
  import WalletView from "$lib/components/WalletView.svelte"
  import { WALLET_CONFIGS, fmtKes } from "$lib/features/wallet/wallet.types"

  let { data, form } = $props()
  const { transactions, summary, orgName, todayLevy, vehicleCount, levyRate } =
    data

  const kpis = [
    {
      label: "Today's Levy",
      value: fmtKes(todayLevy),
      sub: "From vehicle collections",
    },
    { label: "Active Vehicles", value: String(vehicleCount) },
    {
      label: "Levy Rate",
      value: `${(levyRate * 100).toFixed(1)}%`,
      sub: "Of base settlement",
    },
    { label: "Settled Out", value: fmtKes(summary.totalSpentKes) },
  ]

  // Override config title with org name
  const config = { ...WALLET_CONFIGS.org, title: `${orgName} Treasury` }
</script>

<svelte:head><title>{orgName} Wallet — Matatu Pulse</title></svelte:head>

<WalletView {config} {summary} {transactions} formResult={form} {kpis} />
