import { fetchNearbyEonetEvents, type EonetEvent } from "./nasaApi"

export type WeatherData = {
  name: string
  lat: number
  lng: number
  temperature: number
  windspeed: number
  weathercode: number
  humidity: number          // ← new: relative humidity %
  time: string
  source: "search" | "map-click" | "geofence" | "default"
  nasaEvents: EonetEvent[]  // ← new: nearby EONET events
}

export async function fetchWeather(
  lat: number,
  lng: number,
  name: string,
  source: WeatherData["source"],
): Promise<WeatherData> {
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error("Invalid coordinates")
  }

  // Fire both requests in parallel — EONET failure never blocks weather
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,wind_speed_10m,weather_code,relative_humidity_2m` +
    `&timezone=auto`

  const [res, nasaEvents] = await Promise.all([
    fetch(weatherUrl),
    fetchNearbyEonetEvents(lat, lng).catch(() => [] as EonetEvent[]),
  ])

  if (!res.ok) {
    let msg = `Failed to fetch weather (HTTP ${res.status})`
    try {
      const err = await res.json()
      msg += `: ${err.reason || err.error?.message || res.statusText}`
    } catch {
      msg += `: ${res.statusText}`
    }
    throw new Error(msg)
  }

  const json = await res.json()
  if (!json.current) throw new Error("No current weather data in response")

  const c = json.current

  return {
    name,
    lat,
    lng,
    temperature: c.temperature_2m,
    windspeed:   c.wind_speed_10m,
    weathercode: c.weather_code,
    humidity:    c.relative_humidity_2m ?? 0,
    time:        c.time,
    source,
    nasaEvents,
  }
}