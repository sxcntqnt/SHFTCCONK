// lib/features/services/weatherApi.ts
export type WeatherData = {
  name: string
  lat: number
  lng: number
  temperature: number
  windspeed: number
  weathercode: number
  time: string // ISO 8601 in local timezone thanks to &timezone=auto
  source: "search" | "map-click" | "geofence"
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

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`

  const res = await fetch(url)

  if (!res.ok) {
    let errorMsg = `Failed to fetch weather (HTTP ${res.status})`
    try {
      const errJson = await res.json()
      errorMsg += `: ${errJson.reason || errJson.error?.message || res.statusText}`
    } catch {
      errorMsg += `: ${res.statusText}`
    }
    throw new Error(errorMsg)
  }

  const json = await res.json()

  if (!json.current) {
    throw new Error("No current weather data in response")
  }

  const current = json.current

  return {
    name,
    lat,
    lng,
    temperature: current.temperature_2m,
    windspeed: current.wind_speed_10m,
    weathercode: current.weather_code,
    time: current.time,
    source,
  }
}
