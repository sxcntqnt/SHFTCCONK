<!-- src/routes/(auth)/crew/wallet/+page.svelte -->
<script lang="ts">
  import WalletView from "$lib/components/WalletView.svelte"
  import { WALLET_CONFIGS, fmtKes } from "$lib/features/wallet/wallet.types"

  let { data, form } = $props()
  const {
    transactions,
    summary,
    crewType,
    perSeatShare,
    mpesaPhone,
    vehiclePlate,
    orgName,
    hlfStatus,
  } = data

  const tipTotal = transactions
    .filter((t: any) => t.type === "tip_share" && t.status === "completed")
    .reduce((s: number, t: any) => s + t.amountKes, 0)

  const resTotal = transactions
    .filter((t: any) => t.type === "reservation_share")
    .reduce((s: number, t: any) => s + t.amountKes, 0)

  const bookingsServed = transactions.filter(
    (t: any) => t.type === "reservation_share",
  ).length

  const kpis = [
    {
      label: "From Tips",
      value: fmtKes(tipTotal),
      sub: "10% share per tip",
    },
    {
      label: "Reservation Shares",
      value: fmtKes(resTotal),
      sub: `KES ${perSeatShare} per seat`,
    },
    {
      label: "Bookings Served",
      value: String(bookingsServed),
      sub: vehiclePlate ?? "No vehicle assigned",
    },
    {
      label: "Role",
      value: crewType === "DRIVER" ? "Driver" : "Conductor",
      sub: orgName,
    },
  ]
</script>

<svelte:head>
  <title
    >{crewType === "DRIVER" ? "Driver" : "Conductor"} Wallet — Matatu Pulse</title
  >
</svelte:head>

<!-- ── Hyperledger identity status ────────────────────────────────────────── -->
{#if hlfStatus}
  {#if hlfStatus.canLogOnChain}
    <!-- Active — shown as a quiet badge, not a banner -->
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
      {#if hlfStatus.enrolledAt}
        · Since {new Date(hlfStatus.enrolledAt).toLocaleDateString("en-KE", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      {/if}
    </div>
  {:else if hlfStatus.status === "pending" || hlfStatus.status === "retrying"}
    <!-- Enrollment in progress -->
    <div
      class="mx-6 mt-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700"
    >
      <svg
        class="h-4 w-4 shrink-0 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".2" />
        <path d="M21 12a9 9 0 00-9-9" />
      </svg>
      <div>
        <div class="font-medium">Fabric identity enrollment in progress</div>
        <div class="text-xs mt-0.5 opacity-80">
          Attempt {hlfStatus.attempts} — fare and trip logging on-chain will be available
          once enrollment completes.
        </div>
      </div>
    </div>
  {:else if hlfStatus.status === "exhausted"}
    <!-- Exhausted — needs admin intervention -->
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
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div>
        <div class="font-medium">
          Fabric enrollment failed after {hlfStatus.attempts} attempts
        </div>
        <div class="text-xs mt-0.5 opacity-80">
          On-chain fare and trip logging is unavailable. Your wallet earnings
          are unaffected. Contact your SACCO administrator to re-trigger
          enrollment.
        </div>
        {#if hlfStatus.lastError}
          <div
            class="mt-1.5 rounded bg-rose-100 px-2 py-1 font-mono text-xs opacity-70"
          >
            {hlfStatus.lastError}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <!-- Not enrolled at all -->
    <div
      class="mx-6 mt-6 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm text-gray-600"
    >
      <svg
        class="h-4 w-4 mt-0.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <div>
        <div class="font-medium text-gray-700">
          Fabric identity not yet enrolled
        </div>
        <div class="text-xs mt-0.5">
          On-chain logging requires a Hyperledger identity. Your SACCO
          administrator can trigger enrollment from the org dashboard.
        </div>
      </div>
    </div>
  {/if}
{/if}

<WalletView
  config={WALLET_CONFIGS.crew}
  {summary}
  {transactions}
  formResult={form}
  {kpis}
  {mpesaPhone}
/>
