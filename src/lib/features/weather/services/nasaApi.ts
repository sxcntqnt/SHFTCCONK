// NASA EONET v3 — Earth Observatory Natural Event Tracker
// No API key required. Docs: https://eonet.gsfc.nasa.gov/docs/v3

export interface EonetEvent {
  id: string
  title: string
  category: string
  categoryId: string
  date: string
  coordinates: [number, number] | null // [lng, lat]
  link: string
}

// Category metadata for display
const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  severeStorms:  { icon: "⛈️",  color: "rgba(120, 160, 255, 0.85)" },
  wildfires:     { icon: "🔥",  color: "rgba(255, 120,  60, 0.85)" },
  volcanoes:     { icon: "🌋",  color: "rgba(220,  80,  60, 0.85)" },
  floods:        { icon: "🌊",  color: "rgba( 60, 160, 220, 0.85)" },
  drought:       { icon: "🏜️", color: "rgba(200, 160,  60, 0.85)" },
  earthquakes:   { icon: "🫨",  color: "rgba(180, 140, 100, 0.85)" },
  seaLakeIce:    { icon: "🧊",  color: "rgba(160, 220, 255, 0.85)" },
  snow:          { icon: "❄️",  color: "rgba(200, 230, 255, 0.85)" },
  waterColor:    { icon: "💧",  color: "rgba( 60, 180, 200, 0.85)" },
  dustHaze:      { icon: "🌫️", color: "rgba(180, 170, 140, 0.85)" },
  tempExtremes:  { icon: "🌡️", color: "rgba(255, 100,  80, 0.85)" },
  landslides:    { icon: "⛰️", color: "rgba(140, 120,  80, 0.85)" },
  manmade:       { icon: "⚠️",  color: "rgba(255, 200,  60, 0.85)" },
}

export function getCategoryMeta(categoryId: string) {
  return CATEGORY_META[categoryId] ?? { icon: "⚡", color: "rgba(180, 180, 255, 0.85)" }
}

export function formatEventDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export async function fetchNearbyEonetEvents(
  lat: number,
  lng: number,
  radiusDeg = 15,
): Promise<EonetEvent[]> {
  const w = Math.max(-180, lng - radiusDeg).toFixed(4)
  const s = Math.max(-90,  lat - radiusDeg).toFixed(4)
  const e = Math.min( 180, lng + radiusDeg).toFixed(4)
  const n = Math.min(  90, lat + radiusDeg).toFixed(4)

  const url =
    `https://eonet.gsfc.nasa.gov/api/v3/events` +
    `?status=open&bbox=${w},${s},${e},${n}&limit=10&days=60`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`EONET ${res.status}`)

  const data = await res.json()

  return (data.events ?? []).map((ev: any): EonetEvent => {
    const latestGeom = ev.geometry?.at(-1)
    const coords: [number, number] | null =
      latestGeom?.coordinates ?? null

    return {
      id:          ev.id,
      title:       ev.title,
      category:    ev.categories?.[0]?.title ?? "Unknown",
      categoryId:  ev.categories?.[0]?.id    ?? "",
      date:        latestGeom?.date ?? "",
      coordinates: coords,
      link:        ev.link ?? `https://eonet.gsfc.nasa.gov/events/${ev.id}`,
    }
  })
}