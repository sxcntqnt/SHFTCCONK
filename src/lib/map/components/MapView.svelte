<script lang="ts">
  /**
   * MapView
   *
   * Replaces the Leaflet map with MapLibre GL JS + svelte-maplibre-gl.
   *
   * Features:
   *  - Routes rendered as GeoJSON line layers
   *  - Geofences rendered as GeoJSON polygon + point layers  (from MapStore)
   *  - Draw toolbar via @mapbox/maplibre-gl-draw (polygon, rectangle, marker)
   *  - Optional DuckDB H3 vector tile layer (when dbReady = true)
   *  - Custom dark map style matching the app design system
   *
   * Props match the old Leaflet component interface exactly so drop-in
   * replacement requires zero changes at call-sites.
   */

  import { onMount, onDestroy } from "svelte"
  import { browser } from "$app/environment"
  import {
    geofences,
    geofencesGeoJSON,
    routesGeoJSON,
    addGeofence,
  } from "$lib/map/stores/MapStore"
  import type {
    Coordinates,
    MapRoute,
    Geofence,
    DuckDBLayerConfig,
  } from "$lib/map/types/MapTypes"

  // ── Props ─────────────────────────────────────────────────────────────────

  interface Props {
    initialCenter?: Coordinates
    initialZoom?: number
    routes?: MapRoute[]
    /** Name to attach to the next drawn geofence */
    nextName?: string
    /** Set true once DuckDBTileProvider signals onReady */
    dbReady?: boolean
    /** DuckDB H3 layer config — only used when dbReady is true */
    duckdbLayer?: DuckDBLayerConfig
    /** Called after a new Geofence is created via the draw tool */
    oncreated?: (g: Geofence) => void
    /** Height of the map container. Default: "100%" */
    height?: string
    /** Dark style override. Default: Protomaps dark. */
    mapStyle?: string
  }

  let {
    initialCenter = { lat: -1.286, lng: 36.817 },
    initialZoom = 12,
    routes = [],
    nextName = "",
    dbReady = false,
    duckdbLayer,
    oncreated,
    height = "100%",
    mapStyle = "https://api.protomaps.com/styles/v4/dark.json?key=REPLACE_WITH_KEY",
  }: Props = $props()

  // ── Map DOM ref & instance ────────────────────────────────────────────────

  let container: HTMLDivElement
  let map: any // maplibregl.Map
  let drawControl: any // MapboxDraw instance

  // ── Source/layer IDs ──────────────────────────────────────────────────────
  const GEOFENCE_SOURCE = "geofences"
  const GEOFENCE_FILL = "geofence-fill"
  const GEOFENCE_STROKE = "geofence-stroke"
  const GEOFENCE_LABELS = "geofence-labels"
  const GEOFENCE_POINTS = "geofence-points"

  const ROUTE_SOURCE = "routes"
  const ROUTE_LAYER = "routes-line"
  const ROUTE_CASE = "routes-case" // halo under the line

  const DUCKDB_SOURCE = "duckdb-h3"
  const DUCKDB_FILL = "h3-fill"
  const DUCKDB_STROKE = "h3-stroke"

  // ── Init ──────────────────────────────────────────────────────────────────

  onMount(async () => {
    if (!browser) return

    const [mlModule, drawModule] = await Promise.all([
      import("maplibre-gl"),
      // @ts-ignore — types may not ship with the package
      import("@mapbox/maplibre-gl-draw"),
    ])

    const maplibregl = mlModule.default
    const MapboxDraw = drawModule.default

    // ── Inject MapLibre CSS ──────────────────────────────────────────────
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
      link.href =
        "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.css"
      document.head.appendChild(link)
    }

    // ── Create map ───────────────────────────────────────────────────────
    map = new maplibregl.Map({
      container,
      style: mapStyle,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
    })

    await new Promise<void>((res) => map.once("load", res))

    // ── Attribution control tweak ────────────────────────────────────────
    map
      .getContainer()
      .querySelector(".maplibregl-ctrl-attrib")
      ?.classList.add("maplibregl-compact")

    // ── Geofence sources + layers ────────────────────────────────────────
    map.addSource(GEOFENCE_SOURCE, {
      type: "geojson",
      data: $geofencesGeoJSON,
    })

    // Fill (polygons only)
    map.addLayer({
      id: GEOFENCE_FILL,
      type: "fill",
      source: GEOFENCE_SOURCE,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": "#f26522",
        "fill-opacity": 0.18,
      },
    })

    // Stroke
    map.addLayer({
      id: GEOFENCE_STROKE,
      type: "line",
      source: GEOFENCE_SOURCE,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "line-color": "#f26522",
        "line-width": 2,
        "line-opacity": 0.7,
      },
    })

    // Point geofences
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

    // Labels
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

    // ── Route sources + layers ───────────────────────────────────────────
    map.addSource(ROUTE_SOURCE, {
      type: "geojson",
      data: $routesGeoJSON,
    })

    // Halo/casing under the line
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

    // Route tooltip on hover
    map.on("mouseenter", ROUTE_LAYER, (e: any) => {
      map.getCanvas().style.cursor = "pointer"
      const id = e.features?.[0]?.properties?.id
      if (id) {
        new maplibregl.Popup({ closeButton: false, className: "mp-popup" })
          .setLngLat(e.lngLat)
          .setHTML(`<span>Route: ${id}</span>`)
          .addTo(map)
      }
    })
    map.on("mouseleave", ROUTE_LAYER, () => {
      map.getCanvas().style.cursor = ""
      document.querySelectorAll(".mp-popup").forEach((el) => el.remove())
    })

    // ── Draw toolbar ─────────────────────────────────────────────────────
    drawControl = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        line_string: false,
        point: true,
        trash: true,
      },
      styles: drawStyles(),
    })
    map.addControl(drawControl as any, "top-left")

    map.on("draw.create", handleDrawCreate)
    map.on("draw.modechange", () => {
      // Keep cursor consistent
      map.getCanvas().style.cursor =
        drawControl.getMode() === "simple_select" ? "" : "crosshair"
    })

    // ── Geofences reactive update ────────────────────────────────────────
    const unsubGeofences = geofencesGeoJSON.subscribe((geoJSON) => {
      ;(map.getSource(GEOFENCE_SOURCE) as any)?.setData(geoJSON)
    })

    // ── Routes reactive update ───────────────────────────────────────────
    const unsubRoutes = routesGeoJSON.subscribe((geoJSON) => {
      ;(map.getSource(ROUTE_SOURCE) as any)?.setData(geoJSON)
    })

    // Store unsubs for cleanup
    ;(map as any)._appUnsubs = [unsubGeofences, unsubRoutes]

    return () => {
      unsubGeofences()
      unsubRoutes()
    }
  })

  // ── DuckDB layer — added reactively once dbReady flips ───────────────────

  $effect(() => {
    if (!dbReady || !map) return

    const cfg = duckdbLayer ?? {}
    const sourceId = cfg.sourceId ?? DUCKDB_SOURCE
    const fillId = cfg.fillLayerId ?? DUCKDB_FILL
    const strokeId = cfg.strokeLayerId ?? DUCKDB_STROKE
    const fillColor = cfg.fillColor ?? "#f26522"
    const fillOpacity = cfg.fillOpacity ?? 0.25
    const strokeColor = cfg.strokeColor ?? "#f26522"

    if (map.getSource(sourceId)) return // already added

    map.addSource(sourceId, {
      type: "vector",
      tiles: [`duckdb://nairobi?z={z}&x={x}&y={y}`],
      scheme: "xyz",
    })

    map.addLayer(
      {
        id: fillId,
        type: "fill",
        source: sourceId,
        "source-layer": "default",
        paint: {
          "fill-color": fillColor,
          "fill-opacity": fillOpacity,
        },
      },
      GEOFENCE_FILL, // insert below geofences
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

  // ── Routes prop watcher ───────────────────────────────────────────────────

  $effect(() => {
    // routes prop changed — update store so the subscriber fires
    if (!map) return
    const source = map.getSource?.(ROUTE_SOURCE) as any
    if (!source) return
    const geojson = {
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
    }
    source.setData(geojson)
  })

  // ── Draw create handler ───────────────────────────────────────────────────

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

    // Remove the draw-tool feature (the GeoJSON source takes over rendering)
    drawControl.delete(feature.id)

    oncreated?.(geofence)
  }

  // ── Draw styles (dark theme) ──────────────────────────────────────────────

  function drawStyles() {
    const ORANGE = "#f26522"
    const WHITE = "#ffffff"
    return [
      // Fill (active polygon while drawing)
      {
        id: "gl-draw-polygon-fill",
        type: "fill",
        filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
        paint: { "fill-color": ORANGE, "fill-opacity": 0.15 },
      },
      // Stroke (active)
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
      // Midpoints
      {
        id: "gl-draw-polygon-midpoint",
        type: "circle",
        filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
        paint: { "circle-radius": 4, "circle-color": ORANGE },
      },
      // Vertices
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
      // Point marker
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
      // Inactive features
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

  // ── Cleanup ───────────────────────────────────────────────────────────────

  onDestroy(() => {
    ;(map as any)?._appUnsubs?.forEach((fn: () => void) => fn())
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
    /* Dark border matching design system */
    border: 1px solid var(--rim, rgba(255, 255, 255, 0.08));
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .map-container {
    width: 100%;
    height: 100%;
  }

  /* ── MapLibre control overrides — dark theme ────────────────────────────── */
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

  /* Attribution */
  :global(.maplibregl-ctrl-attrib) {
    background: rgba(0, 0, 0, 0.55) !important;
    color: rgba(255, 255, 255, 0.35) !important;
    font-size: 9px !important;
    border-radius: 6px !important;
  }
  :global(.maplibregl-ctrl-attrib a) {
    color: rgba(255, 255, 255, 0.45) !important;
  }

  /* Popup override */
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

  /* Draw toolbar icon tints */
  :global(.mapbox-gl-draw_ctrl-draw-btn) {
    filter: invert(0.7) !important;
  }
  :global(.mapbox-gl-draw_ctrl-draw-btn:hover),
  :global(.mapbox-gl-draw_ctrl-draw-btn.active) {
    filter: invert(0.7) sepia(1) saturate(4) hue-rotate(340deg) !important;
  }
</style>
