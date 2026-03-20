<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { page } from "$app/state"
  import {
    complianceEventStore,
    complianceAlertStore,
  } from "$lib/features/compliance/stores/compliance"
  import {
    ledgerStore,
    reconciliationStore,
  } from "$lib/features/finance/stores/finance"
  import { getRevenueTrend } from "$lib/features/finance/reconciliation"
  import { supabase } from "$lib/supabaseClient"
  import GlassCard from "$lib/components/GlassCard.svelte"
  import Chart from "$lib/components/Chart.svelte"

  // ── Page data (from +page.server.ts) ────────────────────────────────────
  interface Props {
    data: {
      vehicle: {
        id: string
        registration: string
        route: string
        status: string
        ownerId: string
        gpsLat: number
        gpsLng: number
        active: boolean
        organizationId: string
      } | null
      error?: string
    }
  }

  let { data }: Props = $props()

  const vehicleId = $derived(page.params.vehicleId)

  // ── Editable fields (local state, not store-derived) ─────────────────────
  let editRoute = $state(data.vehicle?.route ?? "")
  let editStatus = $state(data.vehicle?.status ?? "ACTIVE")
  let saving = $state(false)
  let saveError = $state<string | null>(null)

  // ── Store subscriptions ──────────────────────────────────────────────────
  // complianceAlertStore holds per-vehicle expiry alerts (correct store)
  let allAlerts = $state($complianceAlertStore)
  let allLedger = $state($ledgerStore)
  let allRec = $state($reconciliationStore)

  $effect(() => {
    const u1 = complianceAlertStore.subscribe((v) => (allAlerts = v))
    const u2 = ledgerStore.subscribe((v) => (allLedger = v))
    const u3 = reconciliationStore.subscribe((v) => (allRec = v))
    return () => {
      u1()
      u2()
      u3()
    }
  })

  // ── Derived values (filtered to this vehicle) ────────────────────────────
  const vehicleAlerts = $derived(
    allAlerts.filter((a) => a.vehicleId === vehicleId),
  )

  const vehicleLedger = $derived(
    allLedger.filter((l) => l.vehicleId === vehicleId),
  )

  const vehicleRec = $derived(allRec.filter((r) => r.vehicleId === vehicleId))

  const totalRevenue = $derived(
    vehicleRec.reduce((sum, r) => sum + r.totalCollected, 0),
  )

  // getRevenueTrend lives in reconciliation.ts — not finance.store
  const trendData = $derived(
    getRevenueTrend(
      vehicleRec.map((r) => ({
        vehicleId: r.vehicleId,
        expectedAmount: r.expectedAmount,
      })),
    ),
  )

  // ── MapLibre + live GPS ──────────────────────────────────────────────────
  let mapContainer: HTMLDivElement
  let mapInstance: any
  let mapMarker: any
  let gpsChannel: ReturnType<typeof supabase.channel> | null = null

  onMount(async () => {
    if (!mapContainer) return

    const { default: maplibregl } = await import("maplibre-gl")

    const initialLat = data.vehicle?.gpsLat ?? -1.2921
    const initialLng = data.vehicle?.gpsLng ?? 36.8219

    mapInstance = new maplibregl.Map({
      container: mapContainer,
      style: "https://demotiles.maplibre.org/style.json",
      center: [initialLng, initialLat],
      zoom: 14,
    })

    mapInstance.on("load", () => {
      // Place initial marker from server-side GPS data
      mapMarker = new maplibregl.Marker({ color: "#3b82f6" })
        .setLngLat([initialLng, initialLat])
        .addTo(mapInstance)
    })

    // ── Supabase realtime GPS subscription ─────────────────────────────
    // This is separate from DuckDBTileProvider — single vehicle, live updates
    // only, no historical parquet needed at this view level.
    gpsChannel = supabase
      .channel(`realtime-gps-${vehicleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vehicle_positions",
          filter: `vehicle_id=eq.${vehicleId}`,
        },
        (payload) => {
          const pos = payload.new as { gpsLat: number; gpsLng: number } | null
          if (!pos?.gpsLat || !pos?.gpsLng) return

          const lngLat: [number, number] = [pos.gpsLng, pos.gpsLat]
          mapMarker?.setLngLat(lngLat)
          mapInstance?.easeTo({ center: lngLat, duration: 800 })
        },
      )
      .subscribe()
  })

  onDestroy(() => {
    if (gpsChannel) {
      supabase.removeChannel(gpsChannel)
      gpsChannel = null
    }
    mapInstance?.remove()
    mapInstance = undefined
  })

  // ── Save handler ─────────────────────────────────────────────────────────
  async function saveVehicle() {
    if (!data.vehicle) return
    saving = true
    saveError = null

    const { error } = await supabase
      .from("vehicles")
      .update({ route: editRoute, status: editStatus })
      .eq("id", data.vehicle.id)
      .eq("organizationId", data.vehicle.organizationId)

    saving = false
    if (error) {
      saveError = error.message
    }
  }

  // ── Status badge ─────────────────────────────────────────────────────────
  function statusClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-800",
      NON_COMPLIANT: "bg-yellow-100 text-yellow-800",
      MAINTENANCE: "bg-blue-100 text-blue-800",
      SUSPENDED: "bg-red-100 text-red-800",
    }
    return map[status] ?? "bg-gray-100 text-gray-800"
  }
</script>

{#if data.error}
  <GlassCard class="mb-6 bg-red-50 border-red-200">
    <p class="text-red-800 p-4">{data.error}</p>
  </GlassCard>
{/if}

{#if data.vehicle}
  {@const v = data.vehicle}

  <div class="flex items-center gap-3 mb-6">
    <h2 class="text-3xl font-bold">Vehicle: {v.registration}</h2>
    <span
      class="text-sm px-2 py-1 rounded-full font-medium {statusClass(
        editStatus,
      )}"
    >
      {editStatus}
    </span>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
    <!-- Vehicle info + editable fields -->
    <GlassCard>
      <h3 class="text-xl font-semibold mb-4">Vehicle Info</h3>

      <dl class="space-y-3 text-sm">
        <div>
          <dt class="text-gray-500 font-medium">Registration</dt>
          <dd class="font-semibold">{v.registration}</dd>
        </div>
        <div>
          <dt class="text-gray-500 font-medium mb-1">Route</dt>
          <dd>
            <input
              type="text"
              bind:value={editRoute}
              class="border rounded px-2 py-1 w-full text-sm"
            />
          </dd>
        </div>
        <div>
          <dt class="text-gray-500 font-medium mb-1">Status</dt>
          <dd>
            <select
              bind:value={editStatus}
              class="border rounded px-2 py-1 w-full text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="NON_COMPLIANT">Non-compliant</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </dd>
        </div>
        <div>
          <dt class="text-gray-500 font-medium">Owner ID</dt>
          <dd class="font-mono text-xs">{v.ownerId}</dd>
        </div>
        <div>
          <dt class="text-gray-500 font-medium">GPS (last known)</dt>
          <dd class="font-mono text-xs">{v.gpsLat}, {v.gpsLng}</dd>
        </div>
        <div>
          <dt class="text-gray-500 font-medium">Active</dt>
          <dd>{v.active ? "Yes" : "No"}</dd>
        </div>
      </dl>

      {#if saveError}
        <p class="text-red-600 text-sm mt-3">{saveError}</p>
      {/if}

      <button
        onclick={saveVehicle}
        disabled={saving}
        class="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700
               transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </GlassCard>

    <!-- Compliance alerts (from complianceAlertStore, filtered by vehicleId) -->
    <GlassCard>
      <h3 class="text-xl font-semibold mb-4">Compliance Alerts</h3>

      {#if vehicleAlerts.length > 0}
        <ul class="space-y-2">
          {#each vehicleAlerts as alert}
            <li
              class="rounded-md px-3 py-2 text-sm"
              class:bg-red-100={alert.status === "EXPIRED"}
              class:text-red-800={alert.status === "EXPIRED"}
              class:bg-amber-100={alert.status === "WARNING"}
              class:text-amber-800={alert.status === "WARNING"}
              class:bg-gray-100={alert.status === "OK"}
              class:text-gray-700={alert.status === "OK"}
            >
              <strong>{alert.type}</strong>
              — expires {alert.expiryDate}
              — <span class="font-medium">{alert.status}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="text-gray-500 text-sm">No alerts for this vehicle.</p>
      {/if}
    </GlassCard>
  </div>

  <!-- Revenue -->
  <GlassCard class="mb-6">
    <h3 class="text-xl font-semibold mb-2">Revenue Overview</h3>
    <p class="text-gray-700 mb-4">
      Total collected: <strong class="text-lg"
        >KES {totalRevenue.toLocaleString()}</strong
      >
    </p>
    {#if trendData.length > 0}
      <Chart data={trendData} type="line" />
    {:else}
      <p class="text-gray-400 text-sm">No revenue data yet.</p>
    {/if}
  </GlassCard>

  <!-- Live GPS map (MapLibre, no DuckDB — single vehicle, realtime only) -->
  <GlassCard>
    <h3 class="text-xl font-semibold mb-2">Live Vehicle Position</h3>
    <p class="text-gray-500 text-sm mb-3">
      Updates in real-time via Supabase — no page refresh needed.
    </p>
    <div
      bind:this={mapContainer}
      class="h-80 w-full rounded-lg overflow-hidden shadow-inner"
    />
  </GlassCard>
{:else}
  <p class="text-gray-500 text-center py-10">Vehicle not found.</p>
{/if}

<style>
  :global(.maplibregl-map) {
    width: 100%;
    height: 100%;
  }
</style>
