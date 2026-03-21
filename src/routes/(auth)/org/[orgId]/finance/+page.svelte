<script lang="ts">
  import { goto } from "$app/navigation"
  import { page } from "$app/state"
  import { onDestroy } from "svelte"
  import {
    reconciliationStore,
    ledgerStore,
    dailyRevenueStore,
  } from "$lib/features/finance/finance.store"
  import { getRevenueTrend } from "$lib/features/finance/reconciliation.store"
  import {
    paymentStatus,
    subscribeToPayment,
  } from "$lib/features/finance/payments.store"
  import GlassCard from "$lib/components/GlassCard.svelte"
  import Chart from "$lib/components/Chart.svelte"

  // ── Types ────────────────────────────────────────────────────────────
  interface Payment {
    transaction_id: string
    user_id: string
    amount: number
    phone: string
    status: "pending" | "completed" | "failed"
    result_desc: string | null
    metadata: Record<string, any> | null
    created_at: string
    updated_at: string | null
  }

  interface ReconciliationRow {
    vehicleId: string
    totalCollected: number
    expectedAmount: number
    variance: number
    status: string
    created_at: string
  }

  interface VehicleSummary {
    vehicleId: string
    registration: string
    route: string
    collected: number
    target: number
    variance: number
  }

  interface RouteSummary {
    route: string
    collected: number
    target: number
    variance: number
    vehicleCount: number
  }

  interface Props {
    data: {
      orgId: string
      payments: Payment[]
      totalPayments: number
      page: number
      pageSize: number
      statusFilter: string
      counts: { completed: number; pending: number; failed: number }
      totalCollected: number
      totalExpected: number
      totalVariance: number
      reconciliationRows: ReconciliationRow[]
      vehicleSummaries: VehicleSummary[]
      routeSummaries: RouteSummary[]
    }
  }

  let { data }: Props = $props()

  // ── Store subscriptions ──────────────────────────────────────────────
  // Server gave us the initial snapshot. Stores provide live updates on top.
  let liveReconciliation = $state($reconciliationStore)
  let liveDailyRevenue = $state($dailyRevenueStore)

  $effect(() => {
    const u1 = reconciliationStore.subscribe((v) => (liveReconciliation = v))
    const u2 = dailyRevenueStore.subscribe((v) => (liveDailyRevenue = v))
    return () => {
      u1()
      u2()
    }
  })

  // ── Live payment status (in-flight STK pushes) ───────────────────────
  let liveStatus = $state($paymentStatus)
  let unsubRealtime: (() => void) | null = null

  $effect(() => {
    const u = paymentStatus.subscribe((v) => (liveStatus = v))
    return () => {
      u()
      unsubRealtime?.()
    }
  })

  // ── Revenue trend from server vehicle summaries ──────────────────────
  // getRevenueTrend expects RemittanceRecord[] { vehicleId, expectedAmount }
  const globalTrend = $derived(
    getRevenueTrend(
      data.vehicleSummaries.map((v) => ({
        vehicleId: v.vehicleId,
        expectedAmount: v.target,
      })),
    ),
  )

  // Per-vehicle trend lines (one point per vehicle from server data)
  const vehicleTrends = $derived(
    data.vehicleSummaries.map((v) => ({
      ...v,
      trend: getRevenueTrend([
        { vehicleId: v.vehicleId, expectedAmount: v.target },
      ]),
    })),
  )

  // Per-route trend lines
  const routeTrends = $derived(
    data.routeSummaries.map((r) => ({
      ...r,
      trend: getRevenueTrend(
        data.vehicleSummaries
          .filter((v) => v.route === r.route)
          .map((v) => ({ vehicleId: v.vehicleId, expectedAmount: v.target })),
      ),
    })),
  )

  // ── Filter + pagination navigation ───────────────────────────────────
  function setFilter(status: string) {
    const params = new URLSearchParams(page.url.searchParams)
    params.set("status", status)
    params.set("page", "0")
    goto(`?${params.toString()}`, { keepFocus: true })
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(page.url.searchParams)
    params.set("page", String(p))
    goto(`?${params.toString()}`, { keepFocus: true })
  }

  const totalPages = $derived(Math.ceil(data.totalPayments / data.pageSize))
  const hasPrev = $derived(data.page > 0)
  const hasNext = $derived(data.page + 1 < totalPages)

  // ── Helpers ──────────────────────────────────────────────────────────
  function formatKES(n: number) {
    return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-KE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function paymentBadge(status: string) {
    const map: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      pending: "bg-amber-100 text-amber-800",
      failed: "bg-red-100   text-red-800",
    }
    return map[status] ?? "bg-gray-100 text-gray-700"
  }

  function reconciliationBadge(status: string) {
    const map: Record<string, string> = {
      MATCHED: "bg-green-100 text-green-800",
      PARTIAL: "bg-amber-100 text-amber-800",
      UNMATCHED: "bg-red-100   text-red-800",
    }
    return map[status] ?? "bg-gray-100 text-gray-700"
  }

  function varianceClass(n: number) {
    return n >= 0 ? "text-green-600" : "text-red-600"
  }

  function varianceLabel(n: number) {
    return `${n >= 0 ? "+" : ""}${formatKES(n)}`
  }

  onDestroy(() => unsubRealtime?.())
</script>

<!-- ═══════════════════════════════════════════════════════════════════
     FINANCE & ROUTE INTELLIGENCE
═══════════════════════════════════════════════════════════════════ -->

<h2 class="text-3xl font-bold mb-6">Finance & Route Intelligence</h2>

<!-- Global revenue trend -->
<GlassCard class="mb-6">
  <h3 class="text-xl font-semibold mb-1">Total Revenue Trend</h3>
  <p class="text-gray-500 text-sm mb-4">
    Combined daily remittance across all vehicles
  </p>
  {#if globalTrend.length > 0}
    <Chart data={globalTrend} type="line" class="h-40" />
  {:else}
    <p class="text-gray-400 text-sm">No trend data yet.</p>
  {/if}
</GlassCard>

<!-- Revenue summary + variance -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  <GlassCard>
    <p class="text-sm text-gray-500 mb-1">Total Collected</p>
    <p class="text-2xl font-bold">{formatKES(data.totalCollected)}</p>
  </GlassCard>
  <GlassCard>
    <p class="text-sm text-gray-500 mb-1">Expected</p>
    <p class="text-2xl font-bold">{formatKES(data.totalExpected)}</p>
  </GlassCard>
  <GlassCard>
    <p class="text-sm text-gray-500 mb-1">Variance</p>
    <p class="text-2xl font-bold {varianceClass(data.totalVariance)}">
      {varianceLabel(data.totalVariance)}
    </p>
  </GlassCard>
  <GlassCard>
    <p class="text-sm text-gray-500 mb-1">Pending Payments</p>
    <p class="text-2xl font-bold text-amber-600">{data.counts.pending}</p>
  </GlassCard>
</div>

<!-- Per-vehicle revenue cards -->
{#if vehicleTrends.length > 0}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
    {#each vehicleTrends as v}
      <GlassCard>
        <div class="flex justify-between items-center mb-2">
          <div>
            <h4 class="font-semibold">{v.registration}</h4>
            <p class="text-xs text-gray-400">{v.route}</p>
          </div>
          <span class="font-medium text-sm">{formatKES(v.collected)}</span>
        </div>
        <Chart data={v.trend} type="line" class="h-28" />
        <div class="mt-2 text-xs text-gray-500 flex justify-between">
          <span>Target: {formatKES(v.target)}</span>
          <span class={varianceClass(v.variance)}>
            {varianceLabel(v.variance)}
          </span>
        </div>
      </GlassCard>
    {/each}
  </div>
{/if}

<!-- Route intelligence -->
<h2 class="text-3xl font-bold mb-6">Route Intelligence</h2>

{#if routeTrends.length > 0}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
    {#each routeTrends as r}
      <GlassCard>
        <div class="flex justify-between items-center mb-2">
          <div>
            <h4 class="font-semibold">{r.route}</h4>
            <p class="text-xs text-gray-400">
              {r.vehicleCount} vehicle{r.vehicleCount !== 1 ? "s" : ""}
            </p>
          </div>
          <span class="font-medium text-sm">{formatKES(r.collected)}</span>
        </div>
        <Chart data={r.trend} type="line" class="h-28" />
        <div class="mt-2 text-xs text-gray-500 flex justify-between">
          <span>Target: {formatKES(r.target)}</span>
          <span class={varianceClass(r.variance)}>
            {varianceLabel(r.variance)}
          </span>
        </div>
      </GlassCard>
    {/each}
  </div>
{/if}

<!-- ═══════════════════════════════════════════════════════════════════
     PAYMENTS
═══════════════════════════════════════════════════════════════════ -->

<h2 class="text-3xl font-bold mb-6">Payments</h2>

<!-- Payments table -->
<GlassCard class="mb-6">
  <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
    <h3 class="text-lg font-semibold">Transactions</h3>

    <div class="flex gap-2 text-sm flex-wrap">
      {#each [{ key: "all", label: `All (${data.counts.completed + data.counts.pending + data.counts.failed})` }, { key: "completed", label: `Completed (${data.counts.completed})` }, { key: "pending", label: `Pending (${data.counts.pending})` }, { key: "failed", label: `Failed (${data.counts.failed})` }] as f}
        <button
          onclick={() => setFilter(f.key)}
          class="px-3 py-1 rounded-full border transition text-sm"
          class:bg-gray-900={data.statusFilter === f.key}
          class:text-white={data.statusFilter === f.key}
          class:border-gray-900={data.statusFilter === f.key}
          class:border-gray-200={data.statusFilter !== f.key}
          class:text-gray-600={data.statusFilter !== f.key}
        >
          {f.label}
        </button>
      {/each}
    </div>
  </div>

  {#if data.payments.length === 0}
    <p class="text-gray-400 text-sm py-6 text-center">No payments found.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide"
          >
            <th class="pb-2 pr-4 font-medium">Transaction ID</th>
            <th class="pb-2 pr-4 font-medium">Phone</th>
            <th class="pb-2 pr-4 font-medium">Amount</th>
            <th class="pb-2 pr-4 font-medium">Status</th>
            <th class="pb-2 pr-4 font-medium">Description</th>
            <th class="pb-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          {#each data.payments as p}
            <tr class="hover:bg-gray-50 transition">
              <td class="py-3 pr-4 font-mono text-xs text-gray-400"
                >{p.transaction_id}</td
              >
              <td class="py-3 pr-4">{p.phone}</td>
              <td class="py-3 pr-4 font-medium">{formatKES(p.amount)}</td>
              <td class="py-3 pr-4">
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-medium {paymentBadge(
                    p.status,
                  )}"
                >
                  {p.status}
                </span>
              </td>
              <td class="py-3 pr-4 text-gray-500 text-xs"
                >{p.result_desc ?? "—"}</td
              >
              <td class="py-3 text-gray-400 text-xs whitespace-nowrap"
                >{formatDate(p.created_at)}</td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-4 text-sm text-gray-500">
      <span>
        Showing {data.page * data.pageSize + 1}–{Math.min(
          (data.page + 1) * data.pageSize,
          data.totalPayments,
        )} of {data.totalPayments}
      </span>
      <div class="flex gap-2">
        <button
          onclick={() => goToPage(data.page - 1)}
          disabled={!hasPrev}
          class="px-3 py-1 rounded border border-gray-200 disabled:opacity-40
                 disabled:cursor-not-allowed hover:bg-gray-50 transition"
        >
          Previous
        </button>
        <button
          onclick={() => goToPage(data.page + 1)}
          disabled={!hasNext}
          class="px-3 py-1 rounded border border-gray-200 disabled:opacity-40
                 disabled:cursor-not-allowed hover:bg-gray-50 transition"
        >
          Next
        </button>
      </div>
    </div>
  {/if}
</GlassCard>

<!-- Reconciliation table -->
{#if data.reconciliationRows.length > 0}
  <GlassCard>
    <h3 class="text-lg font-semibold mb-4">Reconciliation Summary</h3>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide"
          >
            <th class="pb-2 pr-4 font-medium">Vehicle</th>
            <th class="pb-2 pr-4 font-medium">Collected</th>
            <th class="pb-2 pr-4 font-medium">Expected</th>
            <th class="pb-2 pr-4 font-medium">Variance</th>
            <th class="pb-2 pr-4 font-medium">Status</th>
            <th class="pb-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          {#each data.reconciliationRows as row}
            {@const v = row.totalCollected - row.expectedAmount}
            <tr class="hover:bg-gray-50 transition">
              <td class="py-3 pr-4 font-mono text-xs">{row.vehicleId}</td>
              <td class="py-3 pr-4 font-medium"
                >{formatKES(row.totalCollected)}</td
              >
              <td class="py-3 pr-4 text-gray-500"
                >{formatKES(row.expectedAmount)}</td
              >
              <td class="py-3 pr-4 font-medium {varianceClass(v)}"
                >{varianceLabel(v)}</td
              >
              <td class="py-3 pr-4">
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-medium {reconciliationBadge(
                    row.status,
                  )}"
                >
                  {row.status}
                </span>
              </td>
              <td class="py-3 text-gray-400 text-xs whitespace-nowrap"
                >{formatDate(row.created_at)}</td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </GlassCard>
{/if}
