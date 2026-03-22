<!-- src/routes/(auth)/org/[orgId]/fleet/[vehicleId]/+page.svelte -->
<!--
  CHANGES FROM OLD VERSION:
    - supabase direct import removed → data.supabase from page server
    - GlassCard removed → design system panel styling
    - Tailwind classes removed → scoped CSS matching org layout aesthetic
    - ledgerStore, reconciliationStore, getRevenueTrend removed —
      finance data comes from +page.server.ts, not client stores
    - complianceAlertStore, complianceEventStore removed —
      compliance data comes from +page.server.ts
    - Chart component removed → inline SVG spark line (no Chart.js dep)
    - vehicle_positions → vehicle_locations (correct table)
    - .eq("organizationId", ...) → .eq("organization_id", ...) (snake_case)
    - Save handler uses data.supabase, not direct import
    - Status badge uses CSS classes, not Tailwind bg/text combos
-->
<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { enhance } from "$app/forms"
  import type { PageData } from "./$types"

  interface Props {
    data: PageData
  }
  let { data }: Props = $props()

  const { vehicle, complianceAlerts, revenueSummary, recentLedger } = data

  // ── Edit state ────────────────────────────────────────────────────────────
  let editRoute = $state(vehicle?.route ?? "")
  let editStatus = $state(vehicle?.status ?? "ACTIVE")
  let saving = $state(false)
  let saveError = $state<string | null>(null)
  let saveSuccess = $state(false)

  // ── MapLibre + live GPS ───────────────────────────────────────────────────
  let mapContainer: HTMLDivElement
  let mapInstance: any = null
  let mapMarker: any = null
  let gpsChannel: ReturnType<typeof data.supabase.channel> | null = null

  onMount(async () => {
    if (!mapContainer || !vehicle) return

    const { default: maplibregl } = await import("maplibre-gl")

    if (!document.getElementById("maplibre-css")) {
      const link = document.createElement("link")
      link.id = "maplibre-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css"
      document.head.appendChild(link)
    }

    const lat = vehicle.gpsLat ?? -1.2921
    const lng = vehicle.gpsLng ?? 36.8219

    mapInstance = new maplibregl.Map({
      container: mapContainer,
      style: `https://api.protomaps.com/styles/v4/dark.json?key=${data.protomapsKey ?? ""}`,
      center: [lng, lat],
      zoom: 15,
    })

    mapInstance
      .getContainer()
      .querySelector(".maplibregl-ctrl-attrib")
      ?.classList.add("maplibregl-compact")

    mapInstance.on("load", () => {
      // Custom teal marker element
      const el = document.createElement("div")
      el.style.cssText = `
        width: 36px; height: 36px; border-radius: 50%;
        background: rgba(0,0,0,0.8); border: 2.5px solid #00b09b;
        display: flex; align-items: center; justify-content: center;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 12px #00b09b55, 0 4px 14px rgba(0,0,0,0.5);
      `
      el.innerHTML = `
        <span style="width:10px;height:10px;border-radius:50%;
          background:#00b09b;box-shadow:0 0 6px #00b09b;"></span>
      `

      mapMarker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(mapInstance)
    })

    // ── Live GPS subscription — single vehicle ────────────────────────────
    gpsChannel = data.supabase
      .channel(`track-${vehicle.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vehicle_locations", // correct table
          filter: `vehicle_id=eq.${vehicle.id}`,
        },
        (payload) => {
          const pos = payload.new as Record<string, unknown> | null
          if (!pos?.lat || !pos?.lng) return
          const lngLat: [number, number] = [Number(pos.lng), Number(pos.lat)]
          mapMarker?.setLngLat(lngLat)
          mapInstance?.easeTo({ center: lngLat, duration: 800 })
        },
      )
      .subscribe()
  })

  onDestroy(() => {
    if (gpsChannel) {
      data.supabase.removeChannel(gpsChannel)
      gpsChannel = null
    }
    mapInstance?.remove()
    mapInstance = undefined
  })

  // ── Save handler ──────────────────────────────────────────────────────────
  async function saveVehicle() {
    if (!vehicle) return
    saving = true
    saveError = null
    saveSuccess = false

    const { error } = await data.supabase
      .from("vehicles")
      .update({ route: editRoute, status: editStatus })
      .eq("id", vehicle.id)
      .eq("organization_id", vehicle.organizationId) // snake_case fix

    saving = false
    if (error) {
      saveError = error.message
    } else {
      saveSuccess = true
      setTimeout(() => (saveSuccess = false), 3000)
    }
  }

  // ── Revenue spark line (inline SVG — no Chart.js) ─────────────────────────
  function buildSparkPath(points: number[]): string {
    if (points.length < 2) return ""
    const W = 280
    const H = 48
    const min = Math.min(...points)
    const max = Math.max(...points)
    const range = max - min || 1
    const xs = points.map((_, i) => (i / (points.length - 1)) * W)
    const ys = points.map((v) => H - ((v - min) / range) * (H - 4) - 2)
    return xs
      .map(
        (x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`,
      )
      .join(" ")
  }

  // ── Status config ─────────────────────────────────────────────────────────
  const STATUS_CONFIG: Record<
    string,
    { color: string; bg: string; label: string }
  > = {
    ACTIVE: { color: "#00b09b", bg: "rgba(0,176,155,.1)", label: "Active" },
    NON_COMPLIANT: {
      color: "#facc15",
      bg: "rgba(250,204,21,.1)",
      label: "Non-Compliant",
    },
    MAINTENANCE: {
      color: "#818cf8",
      bg: "rgba(129,140,248,.1)",
      label: "Maintenance",
    },
    SUSPENDED: {
      color: "#f87171",
      bg: "rgba(248,113,113,.1)",
      label: "Suspended",
    },
  }

  const ALERT_CONFIG: Record<
    string,
    { color: string; bg: string; border: string }
  > = {
    EXPIRED: {
      color: "#f87171",
      bg: "rgba(248,113,113,.07)",
      border: "rgba(248,113,113,.2)",
    },
    WARNING: {
      color: "#facc15",
      bg: "rgba(250,204,21,.07)",
      border: "rgba(250,204,21,.2)",
    },
    OK: {
      color: "#00b09b",
      bg: "rgba(0,176,155,.05)",
      border: "rgba(0,176,155,.15)",
    },
  }

  function statusCfg(s: string) {
    return (
      STATUS_CONFIG[s] ?? {
        color: "#6b7280",
        bg: "rgba(107,114,128,.1)",
        label: s,
      }
    )
  }

  function alertCfg(s: string) {
    return ALERT_CONFIG[s] ?? ALERT_CONFIG.OK
  }

  function fmtKes(n: number): string {
    if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`
    return `KES ${n}`
  }

  function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-KE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }
</script>

<svelte:head>
  <title>{vehicle?.regNumber ?? "Vehicle"} — Fleet — Matatu Pulse</title>
</svelte:head>

{#if !vehicle}
  <div class="empty-page">
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1"
      opacity="0.2"
    >
      <rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7z" />
    </svg>
    <p>Vehicle not found.</p>
  </div>
{:else}
  {@const v = vehicle}
  {@const sCfg = statusCfg(editStatus)}
  {@const sparkPts = revenueSummary?.trendPoints ?? []}

  <div class="page">
    <!-- ── Page header ─────────────────────────────────────────────────── -->
    <div class="page-hd">
      <div>
        <div class="eyebrow">FLEET · VEHICLE DETAIL</div>
        <div class="title-row">
          <h1 class="page-title">{v.regNumber}</h1>
          <span
            class="status-badge"
            style="color:{sCfg.color};background:{sCfg.bg};border:1px solid {sCfg.color}30"
          >
            {sCfg.label}
          </span>
        </div>
        <p class="page-sub">Route {v.route || "—"} · {v.organizationId}</p>
      </div>
      <a href="../fleet" class="back-btn">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Fleet
      </a>
    </div>

    <!-- ── Main grid ────────────────────────────────────────────────────── -->
    <div class="main-grid">
      <!-- Left column -->
      <div class="left-col">
        <!-- ── Vehicle info + edit ──────────────────────────────────────── -->
        <div class="panel">
          <div class="panel-hd">
            <div class="panel-ey">Identification</div>
            <div class="panel-ti">Vehicle Info</div>
          </div>
          <div class="panel-body">
            <div class="field-grid">
              <div class="field">
                <div class="field-lbl">Registration</div>
                <div class="field-val mono">{v.regNumber}</div>
              </div>

              <div class="field">
                <div class="field-lbl">Owner ID</div>
                <div class="field-val mono xs">{v.ownerId}</div>
              </div>

              <div class="field">
                <div class="field-lbl">Capacity</div>
                <div class="field-val">{v.capacity ?? "—"} seats</div>
              </div>

              <div class="field">
                <div class="field-lbl">Active</div>
                <div
                  class="field-val"
                  style="color:{v.active ? '#00b09b' : '#f87171'}"
                >
                  {v.active ? "Yes" : "No"}
                </div>
              </div>

              <div class="field full">
                <div class="field-lbl">GPS (last known)</div>
                <div class="field-val mono xs">
                  {v.gpsLat?.toFixed(6) ?? "—"}, {v.gpsLng?.toFixed(6) ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Edit form ─────────────────────────────────────────────────── -->
        <div class="panel">
          <div class="panel-hd">
            <div class="panel-ey">Management</div>
            <div class="panel-ti">Edit Vehicle</div>
          </div>
          <div class="panel-body">
            <div class="form-field">
              <label class="form-lbl" for="edit-route">Route</label>
              <input
                id="edit-route"
                type="text"
                class="form-input"
                bind:value={editRoute}
                placeholder="e.g. 58 Buru → CBD"
              />
            </div>

            <div class="form-field">
              <label class="form-lbl" for="edit-status">Status</label>
              <select
                id="edit-status"
                class="form-input"
                bind:value={editStatus}
              >
                <option value="ACTIVE">Active</option>
                <option value="NON_COMPLIANT">Non-Compliant</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            {#if saveError}
              <div class="form-error">{saveError}</div>
            {/if}
            {#if saveSuccess}
              <div class="form-success">Changes saved.</div>
            {/if}

            <button class="save-btn" onclick={saveVehicle} disabled={saving}>
              {#if saving}
                <span class="spin"></span>Saving…
              {:else}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Save Changes
              {/if}
            </button>
          </div>
        </div>

        <!-- ── Compliance alerts ─────────────────────────────────────────── -->
        <div class="panel">
          <div class="panel-hd">
            <div class="panel-ey">Regulatory</div>
            <div class="panel-ti">Compliance</div>
          </div>

          {#if complianceAlerts.length === 0}
            <div class="panel-empty">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                opacity="0.2"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline
                  points="22 4 12 14.01 9 11.01"
                />
              </svg>
              <span>All compliance checks passing</span>
            </div>
          {:else}
            <div class="alert-list">
              {#each complianceAlerts as alert}
                {@const ac = alertCfg(alert.status)}
                <div
                  class="alert-row"
                  style="background:{ac.bg};border-color:{ac.border}"
                >
                  <div class="alert-type">{alert.type}</div>
                  <div class="alert-expires">
                    Expires {fmtDate(alert.expiryDate)}
                  </div>
                  <span
                    class="alert-badge"
                    style="color:{ac.color};background:{ac.color}15;border:1px solid {ac.color}30"
                  >
                    {alert.status}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Right column -->
      <div class="right-col">
        <!-- ── Revenue summary ───────────────────────────────────────────── -->
        <div class="panel">
          <div class="panel-hd">
            <div class="panel-ey">Performance</div>
            <div class="panel-ti">Revenue</div>
          </div>
          <div class="panel-body">
            <!-- KPI row -->
            <div class="rev-kpis">
              <div class="rev-kpi">
                <div class="rev-kpi-val">
                  {fmtKes(revenueSummary?.totalCollected ?? 0)}
                </div>
                <div class="rev-kpi-lbl">Total Collected</div>
              </div>
              <div class="rev-kpi">
                <div
                  class="rev-kpi-val {(revenueSummary?.variance ?? 0) >= 0
                    ? 'pos'
                    : 'neg'}"
                >
                  {(revenueSummary?.variance ?? 0) >= 0 ? "+" : ""}{fmtKes(
                    revenueSummary?.variance ?? 0,
                  )}
                </div>
                <div class="rev-kpi-lbl">vs Target</div>
              </div>
              <div class="rev-kpi">
                <div class="rev-kpi-val">{revenueSummary?.dayCount ?? 0}</div>
                <div class="rev-kpi-lbl">Days Recorded</div>
              </div>
            </div>

            <!-- Spark line -->
            {#if sparkPts.length >= 2}
              <div class="spark-wrap">
                <div class="spark-lbl">Daily collection trend</div>
                <svg
                  viewBox="0 0 280 52"
                  class="sparkline"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="none"
                >
                  <!-- Fill -->
                  <path
                    d="{buildSparkPath(sparkPts)} L 280 52 L 0 52 Z"
                    fill="rgba(0,176,155,0.08)"
                  />
                  <!-- Line -->
                  <path
                    d={buildSparkPath(sparkPts)}
                    fill="none"
                    stroke="#00b09b"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
            {:else}
              <div class="panel-empty small">No revenue data yet</div>
            {/if}
          </div>
        </div>

        <!-- ── Recent ledger entries ─────────────────────────────────────── -->
        {#if recentLedger.length > 0}
          <div class="panel">
            <div class="panel-hd">
              <div class="panel-ey">Finance</div>
              <div class="panel-ti">Recent Transactions</div>
            </div>
            <div class="ledger-list">
              {#each recentLedger as entry}
                <div class="ledger-row">
                  <div class="ledger-type">{entry.type.replace(/_/g, " ")}</div>
                  <div class="ledger-date">{fmtDate(entry.date)}</div>
                  <div
                    class="ledger-amount {entry.direction === 'in'
                      ? 'in'
                      : 'out'}"
                  >
                    {entry.direction === "in" ? "+" : "−"}{fmtKes(entry.amount)}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- ── Live GPS map ───────────────────────────────────────────────── -->
        <div class="panel panel-map">
          <div class="panel-hd">
            <div>
              <div class="panel-ey">Realtime GPS</div>
              <div class="panel-ti">Live Position</div>
            </div>
            <div class="live-pill">
              <span class="live-dot"></span>
              Live
            </div>
          </div>
          <div class="map-wrap" bind:this={mapContainer}></div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Page ── */
  .page {
    flex: 1;
    padding: 32px 40px;
    font-family: var(--font-body);
    min-width: 0;
  }
  .empty-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 12px;
    color: var(--text-3);
    font-size: 0.88rem;
  }

  /* ── Header ── */
  .page-hd {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 28px;
    gap: 20px;
    flex-wrap: wrap;
  }
  .eyebrow {
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--teal, #00b09b);
    margin-bottom: 6px;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
  }
  .page-title {
    font-family: var(--font-display);
    font-size: clamp(1.5rem, 2vw, 2rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    color: var(--text-1);
    line-height: 1;
  }
  .status-badge {
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 100px;
  }
  .page-sub {
    font-size: 0.8rem;
    color: var(--text-3);
  }
  .back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--text-2);
    text-decoration: none;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .back-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-1);
  }

  /* ── Grid ── */
  .main-grid {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 14px;
    align-items: start;
  }
  .left-col,
  .right-col {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* ── Panels ── */
  .panel {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--rim, rgba(255, 255, 255, 0.07));
    border-radius: 18px;
    overflow: hidden;
  }
  .panel::before {
    content: "";
    display: block;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.05),
      transparent
    );
  }
  .panel-hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
  }
  .panel-ey {
    font-size: 0.56rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 3px;
  }
  .panel-ti {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .panel-body {
    padding: 0 20px 18px;
  }
  .panel-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 20px;
    font-size: 0.78rem;
    color: var(--text-3);
    flex-direction: column;
  }
  .panel-empty.small {
    flex-direction: row;
    padding: 12px 20px;
    justify-content: flex-start;
  }

  /* ── Field grid ── */
  .field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .field.full {
    grid-column: 1 / -1;
  }
  .field-lbl {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 4px;
  }
  .field-val {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-1);
  }
  .field-val.mono {
    font-family: "Courier New", monospace;
    font-size: 0.82rem;
    color: var(--teal, #00b09b);
  }
  .field-val.xs {
    font-size: 0.68rem;
    color: var(--text-2);
  }

  /* ── Form ── */
  .form-field {
    margin-bottom: 14px;
  }
  .form-lbl {
    display: block;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 6px;
  }
  .form-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 9px;
    padding: 9px 12px;
    font-family: var(--font-body);
    font-size: 0.84rem;
    color: var(--text-1);
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .form-input:focus {
    border-color: rgba(0, 176, 155, 0.35);
  }
  .form-error {
    font-size: 0.75rem;
    color: #f87171;
    margin-bottom: 10px;
  }
  .form-success {
    font-size: 0.75rem;
    color: #00b09b;
    margin-bottom: 10px;
  }
  .save-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 10px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.25);
    font-family: var(--font-body);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--teal, #00b09b);
    cursor: pointer;
    transition: all 0.15s;
  }
  .save-btn:hover:not(:disabled) {
    background: rgba(0, 176, 155, 0.18);
  }
  .save-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* ── Compliance alerts ── */
  .alert-list {
    padding: 0 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .alert-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 10px;
    border: 1px solid;
  }
  .alert-type {
    flex: 1;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .alert-expires {
    font-size: 0.68rem;
    color: var(--text-3);
    flex-shrink: 0;
  }
  .alert-badge {
    font-size: 0.56rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    padding: 2px 7px;
    border-radius: 100px;
    flex-shrink: 0;
  }

  /* ── Revenue ── */
  .rev-kpis {
    display: flex;
    gap: 0;
    margin-bottom: 16px;
    border: 1px solid var(--rim, rgba(255, 255, 255, 0.07));
    border-radius: 12px;
    overflow: hidden;
  }
  .rev-kpi {
    flex: 1;
    padding: 12px 14px;
    border-right: 1px solid var(--rim, rgba(255, 255, 255, 0.07));
  }
  .rev-kpi:last-child {
    border-right: none;
  }
  .rev-kpi-val {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1;
    margin-bottom: 4px;
  }
  .rev-kpi-val.pos {
    color: #00b09b;
  }
  .rev-kpi-val.neg {
    color: #f87171;
  }
  .rev-kpi-lbl {
    font-size: 0.58rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
  }

  .spark-wrap {
    padding: 0;
  }
  .spark-lbl {
    font-size: 0.58rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
    margin-bottom: 8px;
  }
  .sparkline {
    width: 100%;
    height: 52px;
    display: block;
  }

  /* ── Ledger ── */
  .ledger-list {
    padding: 0 0 2px;
  }
  .ledger-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    font-size: 0.78rem;
  }
  .ledger-row:last-child {
    border-bottom: none;
  }
  .ledger-type {
    flex: 1;
    color: var(--text-2);
    text-transform: capitalize;
    font-size: 0.72rem;
    font-weight: 500;
  }
  .ledger-date {
    font-size: 0.65rem;
    color: var(--text-3);
    flex-shrink: 0;
  }
  .ledger-amount {
    font-family: var(--font-display);
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    flex-shrink: 0;
  }
  .ledger-amount.in {
    color: #00b09b;
  }
  .ledger-amount.out {
    color: #f87171;
  }

  /* ── Map ── */
  .panel-map .panel-hd {
    padding-bottom: 0;
  }
  .live-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba(0, 176, 155, 0.08);
    border: 1px solid rgba(0, 176, 155, 0.2);
    border-radius: 100px;
    font-size: 0.62rem;
    font-weight: 700;
    color: var(--teal, #00b09b);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .live-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--teal, #00b09b);
    animation: live-pulse 2s ease-out infinite;
  }
  @keyframes live-pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.5);
    }
    70% {
      box-shadow: 0 0 0 5px rgba(0, 176, 155, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0);
    }
  }
  .map-wrap {
    height: 280px;
    border-top: 1px solid var(--rim, rgba(255, 255, 255, 0.07));
    margin-top: 10px;
  }

  /* ── Misc ── */
  .spin {
    width: 11px;
    height: 11px;
    border: 1.5px solid rgba(0, 176, 155, 0.25);
    border-top-color: var(--teal, #00b09b);
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── MapLibre overrides ── */
  :global(.maplibregl-ctrl-group) {
    background: rgba(15, 15, 22, 0.92) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 10px !important;
    backdrop-filter: blur(8px) !important;
  }
  :global(.maplibregl-ctrl-group button) {
    background: transparent !important;
    color: rgba(255, 255, 255, 0.65) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  }
  :global(.maplibregl-ctrl-group button:last-child) {
    border-bottom: none !important;
  }
  :global(.maplibregl-ctrl-group button:hover) {
    background: rgba(0, 176, 155, 0.12) !important;
    color: #00b09b !important;
  }
  :global(.maplibregl-ctrl-attrib) {
    background: rgba(0, 0, 0, 0.55) !important;
    color: rgba(255, 255, 255, 0.35) !important;
    font-size: 9px !important;
    border-radius: 6px !important;
  }

  @media (max-width: 1100px) {
    .page {
      padding: 22px 16px;
    }
    .main-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
