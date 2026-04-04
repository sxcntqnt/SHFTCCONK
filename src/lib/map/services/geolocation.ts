// src/lib/map/services/geolocation.ts
import type { Coordinates } from "$lib/map/types/MapTypes.ts"

export async function getUserLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject("Geolocation not supported")
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
    )
  })
}
