<!-- src/routes/(auth)/app/wallet/+page.svelte -->
<script lang="ts">
  import WalletView from "$lib/components/WalletView.svelte"
  import { WALLET_CONFIGS } from "$lib/features/wallet/wallet.types"
  import { fmtKes } from "$lib/features/wallet/wallet.types"

  let { data, form } = $props()
  const { transactions, summary, mpesaPhone } = data

  const kpis = [
    { label: "Total Topped Up", value: fmtKes(data.summary.totalEarnedKes) },
    { label: "Spent on Bookings", value: fmtKes(data.summary.totalSpentKes) },
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
</script>

<svelte:head><title>My Wallet — Matatu Pulse</title></svelte:head>

<WalletView
  config={WALLET_CONFIGS.passenger}
  {summary}
  {transactions}
  formResult={form}
  {kpis}
  {mpesaPhone}
/>
