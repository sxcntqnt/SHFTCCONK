<!-- src/routes/(auth)/org/[orgId]/wallet/+page.svelte -->
<script lang="ts">
  import WalletView from "$lib/components/WalletView.svelte"
  import { WALLET_CONFIGS, fmtKes } from "$lib/features/wallet/wallet.types"

  let { data, form } = $props()
  const {
    transactions,
    summary,
    orgName,
    todayLevy,
    vehicleCount,
    levyRate,
    hlfStatus,
  } = data

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

  const config = { ...WALLET_CONFIGS.org, title: `${orgName} Treasury` }
</script>

<svelte:head><title>{orgName} Wallet — Matatu Pulse</title></svelte:head>

<!-- ── Hyperledger org registration status ────────────────────────────────── -->
{#if !hlfStatus.registered}
  <div
    class="mx-6 mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700"
  >
    <svg
      class="h-4 w-4 mt-0.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      />
      <line x1="12" y1="9" x2="12" y2="13" /><line
        x1="12"
        y1="17"
        x2="12.01"
        y2="17"
      />
    </svg>
    <div>
      <div class="font-medium">Organisation not registered on Hyperledger</div>
      <div class="text-xs mt-0.5 opacity-80">
        Trip verification and on-chain compliance logging require your SACCO to
        be registered on the Fabric network. Contact your platform
        administrator.
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
    Registered on Fabric · MSP:
    <span class="font-mono font-medium">{hlfStatus.mspId ?? "—"}</span>
    · Since {hlfStatus.enrolledAt
      ? new Date(hlfStatus.enrolledAt).toLocaleDateString("en-KE", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—"}
  </div>
{/if}

<WalletView {config} {summary} {transactions} formResult={form} {kpis} />
