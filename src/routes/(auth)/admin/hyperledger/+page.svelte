<script lang="ts">
  // src/routes/admin/hyperledger/+page.svelte
  import { createTabs, melt } from '@melt-ui/svelte';
  import {
    ShieldCheck, Users, AlertTriangle, Activity,
    ChevronRight, CircleDot, XCircle,
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  const { stats, identities, ledgerStats } = data;

  const {
    elements: { root, list, trigger, content },
    stores: { value },
  } = createTabs({ defaultValue: 'identities' });

  const roleColour: Record<string, string> = {
    'org-admin':     'bg-violet-100 text-violet-700',
    'fleet-manager': 'bg-blue-100   text-blue-700',
    'driver':        'bg-emerald-100 text-emerald-700',
    'iot-device':    'bg-amber-100  text-amber-700',
    'admin':         'bg-rose-100   text-rose-700',
    'unknown':       'bg-gray-100   text-gray-600',
  };

  function roleClass(role: string) {
    return roleColour[role] ?? roleColour.unknown;
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString('en-KE', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
</script>

<div class="min-h-screen bg-gray-50 p-6 lg:p-8">

  <!-- ── Header ─────────────────────────────────────────────── -->
  <div class="mb-8 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-semibold text-gray-900 flex items-center gap-2">
        <ShieldCheck class="h-6 w-6 text-indigo-600" />
        Hyperledger Identity Hub
      </h1>
      <p class="mt-1 text-sm text-gray-500">
        Platform MSP · Fabric CA · HashiCorp Vault
      </p>
    </div>
    <div class="flex gap-3">
      <a
        href="/admin/hyperledger/enroll"
        class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        <Users class="h-4 w-4" />
        Enroll identity
      </a>
      <a
        href="/admin/hyperledger/identities"
        class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        View all
        <ChevronRight class="h-4 w-4" />
      </a>
    </div>
  </div>

  <!-- ── Stat cards ──────────────────────────────────────────── -->
  <div class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Total enrolled</p>
      <p class="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
    </div>
    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Active</p>
      <p class="mt-2 text-3xl font-bold text-emerald-600">{stats.active}</p>
    </div>
    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Revoked</p>
      <p class="mt-2 text-3xl font-bold text-rose-600">{stats.revoked}</p>
    </div>
    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wide text-gray-500">IoT devices</p>
      <p class="mt-2 text-3xl font-bold text-amber-600">{stats.byRole['iot-device'] ?? 0}</p>
    </div>
  </div>

  <!-- ── Role breakdown ─────────────────────────────────────── -->
  <div class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
    {#each Object.entries(stats.byRole) as [role, count]}
      <div class="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <span class={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleClass(role)}`}>
          {role}
        </span>
        <span class="text-sm font-semibold text-gray-900">{count}</span>
      </div>
    {/each}
  </div>

  <!-- ── Tabs: Identities | Ledger stats ────────────────────── -->
  <div use:melt={$root} class="rounded-xl border border-gray-100 bg-white shadow-sm">

    <div use:melt={$list} class="flex border-b border-gray-100 px-4" aria-label="Hyperledger sections">
      {#each [{ id: 'identities', label: 'Recent identities', icon: Users }, { id: 'ledger', label: 'Ledger stats', icon: Activity }] as tab}
        <button
          use:melt={$trigger(tab.id)}
          class="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors
            data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600
            data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500
            data-[state=inactive]:hover:text-gray-700"
        >
          <svelte:component this={tab.icon} class="h-4 w-4" />
          {tab.label}
        </button>
      {/each}
    </div>

    <!-- Identities tab -->
    <div use:melt={$content('identities')} class="p-4">
      {#if identities.length === 0}
        <p class="py-8 text-center text-sm text-gray-400">No identities enrolled yet.</p>
      {:else}
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-gray-400">
              <th class="pb-3 pr-4 font-medium">User ID</th>
              <th class="pb-3 pr-4 font-medium">Role</th>
              <th class="pb-3 pr-4 font-medium">Org</th>
              <th class="pb-3 pr-4 font-medium">Enrolled</th>
              <th class="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            {#each identities as id}
              <tr class="group">
                <td class="py-3 pr-4 font-mono text-xs text-gray-700">{id.userId}</td>
                <td class="py-3 pr-4">
                  <span class={`rounded-full px-2 py-0.5 text-xs font-medium ${roleClass(id.attributes?.role)}`}>
                    {id.attributes?.role ?? '—'}
                  </span>
                </td>
                <td class="py-3 pr-4 text-gray-600">{id.attributes?.orgId ?? '—'}</td>
                <td class="py-3 pr-4 text-gray-500">{fmt(id.enrolledAt)}</td>
                <td class="py-3">
                  {#if id.revoked}
                    <span class="flex items-center gap-1 text-rose-600">
                      <XCircle class="h-3.5 w-3.5" /> Revoked
                    </span>
                  {:else}
                    <span class="flex items-center gap-1 text-emerald-600">
                      <CircleDot class="h-3.5 w-3.5" /> Active
                    </span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <div class="mt-3 border-t border-gray-50 pt-3">
          <a href="/admin/hyperledger/identities" class="text-xs text-indigo-600 hover:underline">
            View all identities →
          </a>
        </div>
      {/if}
    </div>

    <!-- Ledger stats tab -->
    <div use:melt={$content('ledger')} class="p-4">
      {#if !ledgerStats}
        <div class="flex items-center gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
          <AlertTriangle class="h-4 w-4 shrink-0" />
          Ledger stats unavailable — peer may be unreachable. Identity data above comes from Vault.
        </div>
      {:else}
        <dl class="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {#each Object.entries(ledgerStats) as [key, val]}
            <div class="rounded-lg bg-gray-50 p-4">
              <dt class="text-xs text-gray-500">{key}</dt>
              <dd class="mt-1 text-xl font-semibold text-gray-900">{val}</dd>
            </div>
          {/each}
        </dl>
      {/if}
    </div>

  </div>
</div>