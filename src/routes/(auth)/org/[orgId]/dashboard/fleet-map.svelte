<!-- src/lib/features/fleet/FleetMap.svelte -->
<!--
  Fleet vehicle map — MapLibre GL JS.
  Migrated from Leaflet. Uses the same dark aesthetic as MapView.svelte.

  Differences from MapView.svelte:
    - No draw control (fleet map is read-only)
    - No geofence/route store subscriptions
    - Vehicles rendered as custom HTML markers via maplibregl.Marker
    - Subscribes to fleetStore for live position updates
    - Popup uses the same mp-popup-dark style as Popup.svelte

  VEHICLE COLOUR CODING:
    ACTIVE       → teal  (#00b09b)
    MAINTENANCE  → amber (#f59e0b)
    NON_COMPLIANT→ red   (#f87171)
    SUSPENDED    → grey  (#6b7280)
-->
<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { browser } from "$app/environment"
  import { get } from "svelte/store"
  import {
    fleetStore,
    type Vehicle,
    type VehicleStatus,
  } from "$lib/features/fleet/stores/fleet"

  // ── Props ─────────────────────────────────────────────────────────────────

  interface Props {
    /** MapLibre style URL — defaults to dark Protomaps */
    mapStyle?: string
    /** Initial map centre — defaults to Nairobi CBD */
    center?: [number, number] // [lng, lat]
    zoom?: number
    height?: string
    /** Called when a vehicle marker is clicked */
    onVehicleClick?: (vehicle: Vehicle) => void
  }

  let {
    mapStyle = "https://api.protomaps.com/styles/v4/dark.json?key=REPLACE_WITH_KEY",
    center = [36.8219, -1.2921], // Nairobi CBD [lng, lat]
    zoom = 12,
    height = "500px",
    onVehicleClick,
  }: Props = $props()

  // ── Internal refs ─────────────────────────────────────────────────────────

  let container: HTMLDivElement
  let map: any = null

  /** Live registry: vehicleId → { marker, popup, el } */
  const markerRegistry = new Map<
    string,
    {
      marker: any
      popup: any
      el: HTMLDivElement
    }
  >()

  let unsubscribe: (() => void) | null = null
  let hasInitialisedView = false

  // ── Status colours ────────────────────────────────────────────────────────

  const STATUS_COLOR: Record<VehicleStatus, string> = {
    ACTIVE: "#00b09b",
    MAINTENANCE: "#f59e0b",
    NON_COMPLIANT: "#f87171",
    SUSPENDED: "#6b7280",
  }

  const STATUS_LABEL: Record<VehicleStatus, string> = {
    ACTIVE: "Active",
    MAINTENANCE: "In Maintenance",
    NON_COMPLIANT: "Non-Compliant",
    SUSPENDED: "Suspended",
  }

  // ── Marker element factory ────────────────────────────────────────────────

  function createMarkerEl(vehicle: Vehicle): HTMLDivElement {
    const color = STATUS_COLOR[vehicle.status] ?? "#6b7280"
    const el = document.createElement("div")

    el.className = "fleet-marker"
    el.style.cssText = `
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(0,0,0,0.75);
      border: 2.5px solid ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transform: translate(-50%, -50%);
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 0 10px ${color}55, 0 4px 12px rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
    `

    // Bus icon SVG
    el.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13"/>
        <path d="M16 8h4l3 3v5h-7z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    `

    el.addEventListener("mouseenter", () => {
      el.style.transform = "translate(-50%, -50%) scale(1.25)"
      el.style.boxShadow = `0 0 18px ${color}88, 0 6px 20px rgba(0,0,0,0.5)`
    })
    el.addEventListener("mouseleave", () => {
      el.style.transform = "translate(-50%, -50%)"
      el.style.boxShadow = `0 0 10px ${color}55, 0 4px 12px rgba(0,0,0,0.4)`
    })

    if (onVehicleClick) {
      el.addEventListener("click", () => onVehicleClick(vehicle))
    }

    return el
  }

  function buildPopupHTML(vehicle: Vehicle): string {
    const color = STATUS_COLOR[vehicle.status] ?? "#6b7280"
    const label = STATUS_LABEL[vehicle.status] ?? vehicle.status

    return `
      <div style="
        font-family: var(--font-body, 'DM Sans', sans-serif);
        min-width: 160px;
      ">
        <div style="
          font-size: 0.88rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
        ">${vehicle.regNumber}</div>

        <div style="
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 2px 8px;
          border-radius: 100px;
          background: ${color}18;
          border: 1px solid ${color}40;
          font-size: 0.65rem;
          font-weight: 700;
          color: ${color};
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-bottom: 8px;
        ">
          <span style="
            width: 5px; height: 5px; border-radius: 50%;
            background: ${color}; display: inline-block;
          "></span>
          ${label}
        </div>

        ${
          vehicle.gpsLat && vehicle.gpsLng
            ? `
          <div style="font-size: 0.68rem; color: rgba(255,255,255,0.45); margin-top: 2px; font-family: monospace;">
            ${vehicle.gpsLat.toFixed(5)}, ${vehicle.gpsLng.toFixed(5)}
          </div>
        `
            : ""
        }

        ${
          vehicle.capacity
            ? `
          <div style="font-size: 0.7rem; color: rgba(255,255,255,0.55); margin-top: 4px;">
            Capacity: ${vehicle.capacity} seats
          </div>
        `
            : ""
        }
      </div>
    `
  }

  // ── Marker sync ───────────────────────────────────────────────────────────

  function syncMarkers(vehicles: Vehicle[]): void {
    if (!map) return

    // Import is already resolved by this point — maplibregl is on window
    const maplibregl = (window as any).maplibregl
    if (!maplibregl) return

    const liveIds = new Set(vehicles.map((v) => v.id))

    // Remove stale markers
    for (const [id, entry] of markerRegistry) {
      if (!liveIds.has(id)) {
        entry.popup.remove()
        entry.marker.remove()
        markerRegistry.delete(id)
      }
    }

    const bounds: [number, number][] = []

    for (const vehicle of vehicles) {
      if (!vehicle.gpsLat || !vehicle.gpsLng) continue

      const lngLat: [number, number] = [vehicle.gpsLng, vehicle.gpsLat]
      bounds.push(lngLat)

      const existing = markerRegistry.get(vehicle.id)

      if (existing) {
        // Update position + popup content
        existing.marker.setLngLat(lngLat)
        existing.popup.setHTML(buildPopupHTML(vehicle))

        // Update marker colour if status changed
        const color = STATUS_COLOR[vehicle.status] ?? "#6b7280"
        existing.el.style.borderColor = color
        existing.el.style.boxShadow = `0 0 10px ${color}55, 0 4px 12px rgba(0,0,0,0.4)`
        const svg = existing.el.querySelector("svg")
        if (svg) svg.style.stroke = color
      } else {
        // Create new marker
        const el = createMarkerEl(vehicle)

        const popup = new maplibregl.Popup({
          offset: [0, -18],
          closeButton: false,
          closeOnClick: false,
          className: "mp-popup-dark",
          maxWidth: "220px",
        }).setHTML(buildPopupHTML(vehicle))

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat(lngLat)
          .setPopup(popup)
          .addTo(map)

        el.addEventListener("mouseenter", () => popup.addTo(map))
        el.addEventListener("mouseleave", () => {
          if (!popup.isOpen()) return
          // Keep popup visible briefly so user can click it
          setTimeout(() => {
            if (!el.matches(":hover")) popup.remove()
          }, 200)
        })

        markerRegistry.set(vehicle.id, { marker, popup, el })
      }
    }

    // Fit bounds on first load
    if (!hasInitialisedView && bounds.length > 0) {
      if (bounds.length === 1) {
        map.flyTo({ center: bounds[0], zoom: 14 })
      } else {
        const padding = { top: 60, bottom: 60, left: 60, right: 60 }
        map.fitBounds(bounds, { padding, maxZoom: 15 })
      }
      hasInitialisedView = true
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  onMount(async () => {
    if (!browser) return

    const { default: maplibregl } = await import("maplibre-gl")

    // Expose on window so syncMarkers (called from subscribe callback) can reach it
    ;(window as any).maplibregl = maplibregl

    if (!document.getElementById("maplibre-css")) {
      const link = document.createElement("link")
      link.id = "maplibre-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css"
      document.head.appendChild(link)
    }

    map = new maplibregl.Map({
      container,
      style: mapStyle,
      center,
      zoom,
    })

    await new Promise<void>((res) => map.once("load", res))

    // Compact attribution
    map
      .getContainer()
      .querySelector(".maplibregl-ctrl-attrib")
      ?.classList.add("maplibregl-compact")

    // Initial render + subscribe to live updates
    syncMarkers(get(fleetStore).vehicles)
    unsubscribe = fleetStore.subscribe((state) => syncMarkers(state.vehicles))
  })

  onDestroy(() => {
    unsubscribe?.()
    for (const { marker, popup } of markerRegistry.values()) {
      popup.remove()
      marker.remove()
    }
    markerRegistry.clear()
    map?.remove()
    map = null
  })
</script>

<div class="fleet-map-wrap" style:height>
  <div bind:this={container} class="fleet-map-container"></div>
</div>

<style>
  .fleet-map-wrap {
    position: relative;
    width: 100%;
    border-radius: 18px;
    overflow: hidden;
    background: var(--ink-2, #0f0f16);
    border: 1px solid var(--rim, rgba(255, 255, 255, 0.08));
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .fleet-map-container {
    width: 100%;
    height: 100%;
  }

  /* ── MapLibre control overrides — matches MapView.svelte ─────────────── */
  :global(.maplibregl-ctrl-group) {
    background: rgba(15, 15, 22, 0.92) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 10px !important;
    backdrop-filter: blur(8px) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5) !important;
  }
  :global(.maplibregl-ctrl-group button) {
    background: transparent !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
    color: rgba(255, 255, 255, 0.65) !important;
    transition:
      background 0.15s,
      color 0.15s !important;
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
  :global(.maplibregl-ctrl-attrib a) {
    color: rgba(255, 255, 255, 0.45) !important;
  }

  /* ── Popup dark shell — matches Popup.svelte ─────────────────────────── */
  :global(.mp-popup-dark .maplibregl-popup-content) {
    background: rgba(13, 13, 20, 0.96) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 12px !important;
    padding: 12px 14px !important;
    color: rgba(255, 255, 255, 0.85) !important;
    box-shadow: 0 10px 32px rgba(0, 0, 0, 0.5) !important;
    backdrop-filter: blur(14px) !important;
  }
  :global(.mp-popup-dark .maplibregl-popup-tip) {
    border-top-color: rgba(13, 13, 20, 0.96) !important;
    border-bottom-color: rgba(13, 13, 20, 0.96) !important;
  }

  /* ── Legend ──────────────────────────────────────────────────────────── */
  :global(.fleet-marker) {
    /* Defined in createMarkerEl inline styles — this selector is a no-op
       but kept as a documentation anchor for the CSS class name */
  }
</style>
