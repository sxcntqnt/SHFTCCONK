<!-- src/routes/org/[orgId]/hyperledger/+page.svelte -->
<script lang="ts">
  import { createTabs, melt }  from '@melt-ui/svelte'
  import { enhance }           from '$app/forms'
  import {
    Wallet,
    ShieldCheck,
    Activity,
    AlertTriangle,
    TrendingUp,
    Truck,
    Users,
    FileText,
    RefreshCw,
    CircleDot,
    XCircle,
    Clock,
  }                            from '@lucide/svelte'
  import type { PageData }     from './$types'

  export let data: PageData

  const { fleet, wallet, compliance, auditLog, contextType, orgId, enrollmentQueue } = data

  // ── Tabs — audit + enrollment queue shown to chair only ───────────────────
  const tabs = [
    { id: 'wallet',     label: 'Wallet',      icon: Wallet      },
    { id: 'compliance', label: 'Compliance',  icon: ShieldCheck },
    { id: 'fleet',      label: 'Fleet',       icon: Truck       },
    ...(contextType === 'chair'
      ? [
          { id: 'audit',   label: 'Audit log',  icon: FileText    },
          { id: 'queue',   label: 'Enrollments', icon: CircleDot  },
        ]
      : []),
  ]

  const {
    elements: { root, list, trigger, content },
  } = createTabs({ defaultValue: 'wallet' })

  // ── Typed data ────────────────────────────────────────────────────────────
  type ComplianceEvent = {
    eventType:  string
    entityId:   string
    timestamp:  string
    details?:   string
  }
  type AuditEntry = {
    txId:      string
    fn:        string
    userId:    string
    timestamp: string
  }
  type QueueItem = {
    id:         string
    actor_id:   string
    intent:     string
    event_name: string
    status:     string
    attempts:   number
    last_error: string | null
    created_at: string
  }

  const complianceEvents: ComplianceEvent[] = Array.isArray(compliance) ? compliance : []
  const auditEntries:     AuditEntry[]      = Array.isArray(auditLog)   ? auditLog   : []
  const queueItems:       QueueItem[]       = Array.isArray(enrollmentQueue) ? enrollmentQueue : []

  const walletData = wallet as {
    balance?:     number
    currency?:    string
    lastUpdated?: string
  } | null

  const fleetData = fleet as {
    totalVehicles?: number
    activeDrivers?: number
    tripsToday?:    number
  } | null

  // ── Helpers ────────────────────────────────────────────────────────────────
  function fmt(iso: string) {
    return new Date(iso).toLocaleString('en-KE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const complianceSeverity: Record<string, string> = {
    VIOLATION: 'text-rose-600   bg-rose-50   border-rose-100',
    WARNING:   'text-amber-600  bg-amber-50  border-amber-100',
    INFO:      'text-blue-600   bg-blue-50   border-blue-100',
    OK:        'text-emerald-600 bg-emerald-50 border-emerald-100',
  }
  function severityClass(type: string) {
    for (const [key, cls] of Object.entries(complianceSeverity)) {
      if (type.toUpperCase().includes(key)) return cls
    }
    return 'text-gray-600 bg-gray-50 border-gray-100'
  }

  const statusStyle: Record<string, string> = {
    pending:   'text-amber-600  bg-amber-50  border-amber-200',
    retrying:  'text-blue-600   bg-blue-50   border-blue-200',
    exhausted: 'text-rose-600   bg-rose-50   border-rose-200',
    failed:    'text-rose-600   bg-rose-50   border-rose-200',
  }
  function queueStatusClass(status: string) {
    return statusStyle[status] ?? 'text-gray-600 bg-gray-50 border-gray-200'
  }

  // Count exhausted items — shown as warning badge on Enrollments tab
  const exhaustedCount = queueItems.filter(q => q.status === 'exhausted').length

  let retryingId = $state<string | null>(null)
</script>

<div class="min-h-screen bg-gray-50 p-6 lg:p-8">
  <!-- ── Header ─────────────────────────────────────────────────────────── -->
  <div class="mb-8 flex items-start justify-between">
    <div>
      <h1 class="text-2xl font-semibold text-gray-900 flex items-center gap-2">
        <Activity class="h-6 w-6 text-indigo-600" />
        Ledger dashboard
      </h1>
      <p class="mt-1 text-sm text-gray-500">
        Org: <span class="font-mono font-medium">{orgId}</span>
        · Last 30 days · Hyperledger Fabric
      </p>
    </div>

    <!-- Exhausted enrollment warning ─────────────────────────────────────── -->
    {#if exhaustedCount > 0}
      <div class="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
        <AlertTriangle class="h-4 w-4 shrink-0" />
        {exhaustedCount} enrollment{exhaustedCount > 1 ? 's' : ''} need attention
      </div>
    {/if}
  </div>

  <!-- ── Summary cards ──────────────────────────────────────────────────── -->
  <div class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
        <Wallet class="h-3.5 w-3.5" /> Wallet balance
      </p>
      {#if walletData?.balance != null}
        <p class="mt-2 text-2xl font-bold text-gray-900">
          {walletData.currency ?? 'KES'} {walletData.balance.toLocaleString()}
        </p>
      {:else}
        <p class="mt-2 text-sm text-gray-400 italic">Unavailable</p>
      {/if}
    </div>

    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
        <Truck class="h-3.5 w-3.5" /> Vehicles
      </p>
      <p class="mt-2 text-2xl font-bold text-gray-900">
        {fleetData?.totalVehicles ?? '—'}
      </p>
    </div>

    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
        <Users class="h-3.5 w-3.5" /> Active drivers
      </p>
      <p class="mt-2 text-2xl font-bold text-emerald-600">
        {fleetData?.activeDrivers ?? '—'}
      </p>
    </div>

    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
        <ShieldCheck class="h-3.5 w-3.5" /> Compliance events
      </p>
      <p class="mt-2 text-2xl font-bold text-gray-900">{complianceEvents.length}</p>
    </div>
  </div>

  <!-- ── Tabs ────────────────────────────────────────────────────────────── -->
  <div use:melt={$root} class="rounded-xl border border-gray-100 bg-white shadow-sm">
    <div
      use:melt={$list}
      class="flex border-b border-gray-100 px-4 overflow-x-auto"
      aria-label="Ledger sections"
    >
      {#each tabs as tab}
        <button
          use:melt={$trigger(tab.id)}
          class="flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
            data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600
            data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500
            data-[state=inactive]:hover:text-gray-700"
        >
          <svelte:component this={tab.icon} class="h-4 w-4" />
          {tab.label}
          {#if tab.id === 'queue' && exhaustedCount > 0}
            <span class="ml-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-600">
              {exhaustedCount}
            </span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- ── Wallet tab ──────────────────────────────────────────────────── -->
    <div use:melt={$content('wallet')} class="p-6">
      {#if !walletData}
        <div class="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 p-4 text-sm text-amber-700">
          <AlertTriangle class="h-4 w-4 shrink-0" />
          Wallet data unavailable — peer may be unreachable.
        </div>
      {:else}
        <div class="space-y-4">
          <div class="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
            <p class="text-xs text-indigo-600 uppercase tracking-wide font-medium">Current balance</p>
            <p class="mt-1 text-3xl font-bold text-indigo-700">
              {walletData.currency ?? 'KES'} {(walletData.balance ?? 0).toLocaleString()}
            </p>
            {#if walletData.lastUpdated}
              <p class="mt-1 text-xs text-indigo-500">Last updated: {fmt(walletData.lastUpdated)}</p>
            {/if}
          </div>
          <div class="flex gap-3">
            
              href="/org/{orgId}/finance"
              class="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <TrendingUp class="h-4 w-4" /> View full history
            </a>
          </div>
        </div>
      {/if}
    </div>

    <!-- ── Compliance tab ─────────────────────────────────────────────── -->
    <div use:melt={$content('compliance')} class="p-6">
      {#if complianceEvents.length === 0}
        <p class="py-8 text-center text-sm text-gray-400">
          {compliance == null
            ? 'Compliance data unavailable — peer may be unreachable.'
            : 'No compliance events in the last 30 days.'}
        </p>
      {:else}
        <div class="space-y-2">
          {#each complianceEvents as event}
            <div class={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${severityClass(event.eventType)}`}>
              <ShieldCheck class="h-4 w-4 mt-0.5 shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-medium">{event.eventType}</span>
                  <span class="text-xs opacity-70 shrink-0">{fmt(event.timestamp)}</span>
                </div>
                <p class="text-xs opacity-80 mt-0.5 font-mono">{event.entityId}</p>
                {#if event.details}
                  <p class="text-xs mt-1 opacity-70">{event.details}</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
        <a href="/org/{orgId}/compliance" class="mt-4 block text-xs text-indigo-600 hover:underline">
          Full compliance dashboard →
        </a>
      {/if}
    </div>

    <!-- ── Fleet tab ──────────────────────────────────────────────────── -->
    <div use:melt={$content('fleet')} class="p-6">
      {#if !fleetData}
        <div class="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 p-4 text-sm text-amber-700">
          <AlertTriangle class="h-4 w-4 shrink-0" />
          Fleet data unavailable — peer may be unreachable.
        </div>
      {:else}
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="rounded-lg bg-gray-50 p-4 text-center">
            <p class="text-2xl font-bold text-gray-900">{fleetData.totalVehicles ?? 0}</p>
            <p class="text-xs text-gray-500 mt-1">Total vehicles</p>
          </div>
          <div class="rounded-lg bg-gray-50 p-4 text-center">
            <p class="text-2xl font-bold text-emerald-600">{fleetData.activeDrivers ?? 0}</p>
            <p class="text-xs text-gray-500 mt-1">Active drivers</p>
          </div>
          <div class="rounded-lg bg-gray-50 p-4 text-center">
            <p class="text-2xl font-bold text-indigo-600">{fleetData.tripsToday ?? 0}</p>
            <p class="text-xs text-gray-500 mt-1">Trips today</p>
          </div>
        </div>
        <div class="flex gap-3">
          <a href="/org/{orgId}/fleet"   class="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Truck class="h-4 w-4" /> Fleet management
          </a>
          <a href="/org/{orgId}/drivers" class="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Users class="h-4 w-4" /> Manage drivers
          </a>
        </div>
      {/if}
    </div>

    <!-- ── Audit log tab (chair only) ─────────────────────────────────── -->
    {#if contextType === 'chair'}
      <div use:melt={$content('audit')} class="p-6">
        {#if auditEntries.length === 0}
          <p class="py-8 text-center text-sm text-gray-400">
            {auditLog == null
              ? 'Audit log unavailable — peer may be unreachable.'
              : 'No audit entries in the last 30 days.'}
          </p>
        {:else}
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th class="pb-3 pr-4 font-medium">Tx ID</th>
                <th class="pb-3 pr-4 font-medium">Function</th>
                <th class="pb-3 pr-4 font-medium">Actor</th>
                <th class="pb-3 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              {#each auditEntries as entry}
                <tr>
                  <td class="py-3 pr-4 font-mono text-xs text-gray-500 max-w-[120px] truncate">{entry.txId}</td>
                  <td class="py-3 pr-4 text-gray-700">{entry.fn}</td>
                  <td class="py-3 pr-4 font-mono text-xs text-gray-600">{entry.userId}</td>
                  <td class="py-3 text-gray-500 text-xs">{fmt(entry.timestamp)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>

      <!-- ── Enrollment queue tab (chair only) ──────────────────────────── -->
      <div use:melt={$content('queue')} class="p-6">
        {#if queueItems.length === 0}
          <div class="py-8 text-center">
            <CircleDot class="mx-auto h-8 w-8 text-emerald-400 mb-3" />
            <p class="text-sm font-medium text-gray-700">All enrollments up to date</p>
            <p class="text-xs text-gray-400 mt-1">
              No pending or failed Hyperledger enrollments for this org.
            </p>
          </div>
        {:else}
          <div class="mb-4 flex items-center justify-between">
            <p class="text-sm text-gray-600">
              {queueItems.length} item{queueItems.length > 1 ? 's' : ''} need attention
            </p>
            {#if exhaustedCount > 0}
              <p class="text-xs text-rose-600 font-medium">
                {exhaustedCount} exhausted — re-trigger from admin panel or wait for manual review
              </p>
            {/if}
          </div>

          <div class="space-y-3">
            {#each queueItems as item}
              <div class={`rounded-lg border p-4 ${queueStatusClass(item.status)}`}>
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <!-- Status icon -->
                      {#if item.status === 'exhausted' || item.status === 'failed'}
                        <XCircle class="h-4 w-4 shrink-0" />
                      {:else if item.status === 'retrying'}
                        <RefreshCw class="h-4 w-4 shrink-0" />
                      {:else}
                        <Clock class="h-4 w-4 shrink-0" />
                      {/if}

                      <span class="text-xs font-bold uppercase tracking-wide">
                        {item.status}
                      </span>
                      <span class="text-xs opacity-70">
                        · {item.event_name} · {item.intent}
                      </span>
                    </div>

                    <p class="text-xs font-mono opacity-70 mb-1">
                      Actor: {item.actor_id}
                    </p>

                    {#if item.last_error}
                      <p class="text-xs opacity-80 line-clamp-2">
                        {item.last_error}
                      </p>
                    {/if}

                    <p class="text-xs opacity-50 mt-1">
                      {item.attempts} attempt{item.attempts !== 1 ? 's' : ''}
                      · Created {fmt(item.created_at)}
                    </p>
                  </div>

                  <!-- Re-trigger (exhausted items only — pending/retrying will self-resolve) -->
                  {#if item.status === 'exhausted'}
                    <button
                      type="button"
                      disabled={retryingId === item.id}
                      onclick={async () => {
                        retryingId = item.id
                        try {
                          await fetch('/api/admin/hyperledger/retry', {
                            method:  'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body:    JSON.stringify({ queueId: item.id }),
                          })
                          // Reload to reflect new status
                          window.location.reload()
                        } finally {
                          retryingId = null
                        }
                      }}
                      class="flex items-center gap-1.5 rounded-lg border border-current px-3 py-1.5 text-xs font-medium opacity-80 hover:opacity-100 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {#if retryingId === item.id}
                        <RefreshCw class="h-3.5 w-3.5 animate-spin" />
                        Queuing…
                      {:else}
                        <RefreshCw class="h-3.5 w-3.5" />
                        Re-trigger
                      {/if}
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>

          <p class="mt-4 text-xs text-gray-400">
            Pending and retrying items are processed automatically every 2 minutes.
            Exhausted items require a manual re-trigger.
          </p>
        {/if}
      </div>
    {/if}
  </div>
</div>