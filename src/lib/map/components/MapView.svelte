<script lang="ts">
  // MapView.svelte
  //
  // Interactive map with geofences, routes, and DuckDB H3 tiles.
  //
  // CHANGES from previous version:
  //   - Accepts `requestContext` prop — seeds map center from CF geo
  //   - Accepts `manifest` prop — passes to DuckDBTileProvider
  //   - DuckDB tile source URL derived from manifest.cityId (not hardcoded)
  //   - Emits `onViewportChange` so parent can feed new hexes to the SW

  import { onMount, onDestroy } from "svelte"
  import { browser } from "$app/environment"
  import {
    geofences,
    geofencesGeoJSON,
    routesGeoJSON,
    addGeofence,
  } from "$lib/map/stores/MapStore"
  import { prefetchHexesForViewport } from "$lib/hooks.client"
  import { zoomToH3Resolution } from "$lib/map"
  import type { Coordinates, MapRoute, Geofence } from "$lib/map/types/MapTypes"
  import type { CityBootstrapManifest, RequestContext } from "$lib/map"

  interface DuckDBLayerConfig {
    sourceId?: string
    fillLayerId?: string
    strokeLayerId?: string
    fillColor?: string
    fillOpacity?: number
    strokeColor?: string
  }

  interface Props {
    // Existing props
    routes?: MapRoute[]
    nextName?: string
    dbReady?: boolean
    duckdbLayer?: DuckDBLayerConfig
    oncreated?: (g: Geofence) => void
    height?: string
    mapStyle?: string
    // NEW: geo context + manifest
    requestContext?: RequestContext | null
    manifest?: CityBootstrapManifest | null
    onViewportChange?: (hexes: string[], zoom: number) => void
  }

  let {
    routes = [],
    nextName = "",
    dbReady = false,
    duckdbLayer = {} as DuckDBLayerConfig,
    oncreated,
    height = "100%",
    mapStyle = "https://api.protomaps.com/styles/v4/dark.json?key=REPLACE_WITH_KEY",
    requestContext = null,
    manifest = null,
    onViewportChange,
  }: Props = $props()

  // Derive initial center from requestContext (CF geo) if available,
  // fall back to Nairobi CBD
  const initialCenter: Coordinates = requestContext?.approxCenter ?? {
    lat: -1.286,
    lng: 36.817,
  }
  const initialZoom = 12

  let container: HTMLDivElement
  let map: any
  let drawControl: any

  const GEOFENCE_SOURCE = "geofences"
  const GEOFENCE_FILL = "geofence-fill"
  const GEOFENCE_STROKE = "geofence-stroke"
  const GEOFENCE_LABELS = "geofence-labels"
  const GEOFENCE_POINTS = "geofence-points"

  const ROUTE_SOURCE = "routes"
  const ROUTE_LAYER = "routes-line"
  const ROUTE_CASE = "routes-case"

  const DUCKDB_SOURCE = "duckdb-h3"
  const DUCKDB_FILL = "h3-fill"
  const DUCKDB_STROKE = "h3-stroke"

  let unsubGeofences: (() => void) | null = null
  let unsubRoutes: (() => void) | null = null

  // Derive tile URL from manifest — uses cityId not hardcoded string
  function getDuckdbTileUrl(): string {
    const cityId = manifest?.cityId ?? "nairobi"
    return `duckdb://${cityId}?z={z}&x={x}&y={y}`
  }

  // Emit current viewport hexes to parent (→ SW prefetch)
  function emitViewportHexes() {
    if (!map) return

    const bounds = map.getBounds()
    const zoom = Math.round(map.getZoom())
    const h3Res = zoomToH3Resolution(zoom)

    // We don't compute H3 cells in the browser — that's the server's job.
    // Instead, send bounds to parent; parent calls BootstrapManifestService.
    // For SW prefetch, pass the manifest seed cells at this zoom resolution.
    if (manifest?.h3Seeds?.cells?.length) {
      prefetchHexesForViewport(manifest.h3Seeds.cells)
    }

    onViewportChange?.(manifest?.h3Seeds?.cells ?? [], zoom)
  }

  onMount(async () => {
    if (!browser) return

    const [mlModule, drawModule] = await Promise.all([
      import("maplibre-gl"),
      import("maplibre-gl-draw"),
    ])

    const maplibregl = mlModule.default
    const MapboxDraw = drawModule.default

    if (!document.getElementById("maplibre-css")) {
      const link = document.createElement("link")
      link.id = "maplibre-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css"
      document.head.appendChild(link)
    }
    if (!document.getElementById("mgl-draw-css")) {
      const link = document.createElement("link")
      link.id = "mgl-draw-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/maplibre-gl-draw/dist/maplibre-gl-draw.css"
      document.head.appendChild(link)
    }

    map = new maplibregl.Map({
      container,
      style: mapStyle,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
    })

    await new Promise<void>((res) => map.once("load", res))

    map
      .getContainer()
      .querySelector(".maplibregl-ctrl-attrib")
      ?.classList.add("maplibregl-compact")

    // ── Geofence sources + layers ──────────────────────────────────────
    map.addSource(GEOFENCE_SOURCE, { type: "geojson", data: $geofencesGeoJSON })

    map.addLayer({
      id: GEOFENCE_FILL,
      type: "fill",
      source: GEOFENCE_SOURCE,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": "#f26522", "fill-opacity": 0.18 },
    })
    map.addLayer({
      id: GEOFENCE_STROKE,
      type: "line",
      source: GEOFENCE_SOURCE,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "line-color": "#f26522", "line-width": 2, "line-opacity": 0.7 },
    })
    map.addLayer({
      id: GEOFENCE_POINTS,
      type: "circle",
      source: GEOFENCE_SOURCE,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": "#f26522",
        "circle-radius": 7,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
        "circle-opacity": 0.9,
      },
    })
    map.addLayer({
      id: GEOFENCE_LABELS,
      type: "symbol",
      source: GEOFENCE_SOURCE,
      layout: {
        "text-field": ["get", "name"],
        "text-size": 12,
        "text-offset": [0, 1.4],
        "text-anchor": "top",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#000000",
        "text-halo-width": 1.5,
      },
    })

    // ── Route sources + layers ─────────────────────────────────────────
    map.addSource(ROUTE_SOURCE, { type: "geojson", data: $routesGeoJSON })

    map.addLayer({
      id: ROUTE_CASE,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#000",
        "line-width": ["get", "weight"],
        "line-opacity": 0.25,
        "line-gap-width": 0,
      },
    } as any)
    map.addLayer({
      id: ROUTE_LAYER,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["get", "weight"],
        "line-opacity": ["get", "opacity"],
      },
    })

    map.on("mouseenter", ROUTE_LAYER, (e: any) => {
      map.getCanvas().style.cursor = "pointer"
      const id = e.features?.[0]?.properties?.id
      if (id)
        new maplibregl.Popup({ closeButton: false, className: "mp-popup" })
          .setLngLat(e.lngLat)
          .setHTML(`<span>Route: ${id}</span>`)
          .addTo(map)
    })
    map.on("mouseleave", ROUTE_LAYER, () => {
      map.getCanvas().style.cursor = ""
      document.querySelectorAll(".mp-popup").forEach((el) => el.remove())
    })

    // ── Draw toolbar ───────────────────────────────────────────────────
    drawControl = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, line_string: false, point: true, trash: true },
      styles: drawStyles(),
    })
    map.addControl(drawControl as any, "top-left")
    map.on("draw.create", handleDrawCreate)
    map.on("draw.modechange", (_e: any) => {
      map.getCanvas().style.cursor =
        drawControl.getMode() === "simple_select" ? "" : "crosshair"
    })

    // ── Viewport change → SW prefetch ──────────────────────────────────
    map.on("moveend", emitViewportHexes)
    map.on("zoomend", emitViewportHexes)
    // Emit once on load
    emitViewportHexes()

    // ── Reactive subscriptions ─────────────────────────────────────────
    unsubGeofences = geofencesGeoJSON.subscribe((geoJSON) => {
      ;(map.getSource(GEOFENCE_SOURCE) as any)?.setData(geoJSON)
    })
    unsubRoutes = routesGeoJSON.subscribe((geoJSON) => {
      ;(map.getSource(ROUTE_SOURCE) as any)?.setData(geoJSON)
    })
  })

  // ── DuckDB layer — added when dbReady flips ────────────────────────────
  $effect(() => {
    if (!dbReady || !map) return

    const sourceId = duckdbLayer.sourceId ?? DUCKDB_SOURCE
    const fillId = duckdbLayer.fillLayerId ?? DUCKDB_FILL
    const strokeId = duckdbLayer.strokeLayerId ?? DUCKDB_STROKE
    const fillColor = duckdbLayer.fillColor ?? "#f26522"
    const fillOpacity = duckdbLayer.fillOpacity ?? 0.25
    const strokeColor = duckdbLayer.strokeColor ?? "#f26522"

    if (map.getSource(sourceId)) return

    // ✅ Tile URL derived from manifest — not hardcoded "nairobi"
    map.addSource(sourceId, {
      type: "vector",
      tiles: [getDuckdbTileUrl()],
      scheme: "xyz",
    })
    map.addLayer(
      {
        id: fillId,
        type: "fill",
        source: sourceId,
        "source-layer": "default",
        paint: { "fill-color": fillColor, "fill-opacity": fillOpacity },
      },
      GEOFENCE_FILL,
    )
    map.addLayer(
      {
        id: strokeId,
        type: "line",
        source: sourceId,
        "source-layer": "default",
        paint: {
          "line-color": strokeColor,
          "line-width": 1,
          "line-opacity": 0.5,
        },
      },
      GEOFENCE_STROKE,
    )
  })

  // ── Routes prop watcher ────────────────────────────────────────────────
  $effect(() => {
    if (!map) return
    const source = map.getSource?.(ROUTE_SOURCE) as any
    if (!source) return
    source.setData({
      type: "FeatureCollection",
      features: routes
        .filter((r) => r.path.length >= 2)
        .map((r) => ({
          type: "Feature",
          id: r.id,
          properties: {
            id: r.id,
            color: r.color ?? "#f26522",
            weight: r.weight ?? 4,
            opacity: r.opacity ?? 0.8,
          },
          geometry: {
            type: "LineString",
            coordinates: r.path.map((p) => [p.lng, p.lat]),
          },
        })),
    })
  })

  // ── Draw create handler ────────────────────────────────────────────────
  function handleDrawCreate(e: any) {
    const feature = e.features?.[0]
    if (!feature) return

    if (!nextName.trim()) {
      alert("Please enter a geofence name first")
      drawControl.delete(feature.id)
      return
    }

    let coords: Coordinates[] = []

    if (feature.geometry.type === "Point") {
      const [lng, lat] = feature.geometry.coordinates
      coords = [{ lat, lng }]
    } else if (
      feature.geometry.type === "Polygon" ||
      feature.geometry.type === "MultiPolygon"
    ) {
      const ring =
        feature.geometry.type === "Polygon"
          ? feature.geometry.coordinates[0]
          : feature.geometry.coordinates[0][0]
      coords = ring.map(([lng, lat]: [number, number]) => ({ lat, lng }))
    }

    if (coords.length === 0 || (coords.length < 3 && coords.length !== 1)) {
      alert("Invalid shape — need at least 3 points for a polygon")
      drawControl.delete(feature.id)
      return
    }

    const geofence: Geofence = {
      id: crypto.randomUUID(),
      name: nextName.trim(),
      coords,
    }
    addGeofence(geofence)
    drawControl.delete(feature.id)
    oncreated?.(geofence)
  }

  // ── Draw styles ────────────────────────────────────────────────────────
  function drawStyles() {
    const ORANGE = "#f26522"
    const WHITE = "#ffffff"
    return [
      {
        id: "gl-draw-polygon-fill",
        type: "fill",
        filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
        paint: { "fill-color": ORANGE, "fill-opacity": 0.15 },
      },
      {
        id: "gl-draw-polygon-stroke-active",
        type: "line",
        filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ORANGE,
          "line-width": 2,
          "line-dasharray": [3, 2],
        },
      },
      {
        id: "gl-draw-polygon-midpoint",
        type: "circle",
        filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
        paint: { "circle-radius": 4, "circle-color": ORANGE },
      },
      {
        id: "gl-draw-polygon-and-line-vertex-active",
        type: "circle",
        filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
        paint: {
          "circle-radius": 5,
          "circle-color": WHITE,
          "circle-stroke-color": ORANGE,
          "circle-stroke-width": 2,
        },
      },
      {
        id: "gl-draw-point-point-stroke-active",
        type: "circle",
        filter: [
          "all",
          ["==", "active", "true"],
          ["==", "$type", "Point"],
          ["==", "meta", "feature"],
        ],
        paint: {
          "circle-radius": 9,
          "circle-color": ORANGE,
          "circle-stroke-color": WHITE,
          "circle-stroke-width": 2,
        },
      },
      {
        id: "gl-draw-polygon-fill-inactive",
        type: "fill",
        filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"]],
        paint: { "fill-color": ORANGE, "fill-opacity": 0.1 },
      },
      {
        id: "gl-draw-polygon-stroke-inactive",
        type: "line",
        filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"]],
        paint: { "line-color": ORANGE, "line-width": 2 },
      },
    ]
  }

  onDestroy(() => {
    unsubGeofences?.()
    unsubRoutes?.()
    map?.off("moveend", emitViewportHexes)
    map?.off("zoomend", emitViewportHexes)
    map?.remove()
  })
</script>

<div class="map-wrap" style:height>
  <div bind:this={container} class="map-container"></div>
</div>

<style>
  .map-wrap {
    position: relative;
    width: 100%;
    border-radius: 18px;
    overflow: hidden;
    background: var(--ink-2, #0f0f16);
    border: 1px solid var(--rim, rgba(255, 255, 255, 0.08));
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  .map-container {
    width: 100%;
    height: 100%;
  }

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
    background: rgba(242, 101, 34, 0.12) !important;
    color: #f26522 !important;
  }
  :global(.maplibregl-ctrl-group button.active),
  :global(.maplibregl-ctrl-group button[aria-pressed="true"]) {
    background: rgba(242, 101, 34, 0.18) !important;
    color: #f26522 !important;
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
  :global(.maplibregl-popup-content) {
    background: rgba(15, 15, 22, 0.95) !important;
    color: rgba(255, 255, 255, 0.85) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 10px !important;
    padding: 8px 14px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
    backdrop-filter: blur(12px) !important;
  }
  :global(.maplibregl-popup-tip) {
    border-top-color: rgba(15, 15, 22, 0.95) !important;
  }
  :global(.mp-popup .maplibregl-popup-content) {
    padding: 6px 12px !important;
  }
  :global(.mapbox-gl-draw_ctrl-draw-btn) {
    filter: invert(0.7) !important;
  }
  :global(.mapbox-gl-draw_ctrl-draw-btn:hover),
  :global(.mapbox-gl-draw_ctrl-draw-btn.active) {
    filter: invert(0.7) sepia(1) saturate(4) hue-rotate(340deg) !important;
  }
</style>
