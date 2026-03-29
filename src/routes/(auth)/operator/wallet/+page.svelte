<!-- src/routes/(auth)/operator/wallet/+page.svelte -->
<script lang="ts">
  import WalletView from "$lib/components/WalletView.svelte"
  import { WALLET_CONFIGS, fmtKes } from "$lib/features/wallet/wallet.types"

  let { data, form } = $props()
  const {
    transactions,
    summary,
    orgBreakdown,
    mpesaPhone,
    orgSlots,
    tripCount,
    vehicleCount,
    hlfStatus,
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
    { label: "Bonuses", value: fmtKes(bonusTotal), sub: "Utilisation rewards" },
    {
      label: "Withdrawn",
      value: fmtKes(summary.totalSpentKes),
      sub: "To M-Pesa or paybill",
    },
  ]
</script>

<svelte:head><title>Operator Wallet — Matatu Pulse</title></svelte:head>

<!-- ── Hyperledger identity status ────────────────────────────────────────── -->
{#if hlfStatus}
  {#if !hlfStatus.canDispatch}
    <div
      class="mx-6 mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700"
    >
      <svg
        class="h-4 w-4 mt-0.5 shrink-0"
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
      <div>
        <div class="font-medium">Fabric identity not yet enrolled</div>
        <div class="text-xs mt-0.5 opacity-80">
          You cannot log trips on-chain until your Hyperledger enrollment
          completes. Check with your platform administrator.
        </div>
      </div>
    </div>
  {:else}
    <div
      class="mx-6 mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs text-emerald-700"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      Fabric identity active · MSP:
      <span class="font-mono font-medium">{hlfStatus.mspId ?? "—"}</span>
    </div>
  {/if}
{/if}

<WalletView
  config={WALLET_CONFIGS.operator}
  {summary}
  {transactions}
  formResult={form}
  {kpis}
  {orgBreakdown}
  {mpesaPhone}
/>
