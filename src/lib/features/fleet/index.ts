// src/lib/features/fleet/index.ts

export const vehicleModelLoaders = {
  "14":      () => import("../../../../static/models/isuzu_erga_mio_bus.svelte"),
  "26":   () => import("../../../../static/models/japanese_bus_osaka_city_bus_osaka.svelte"),
  "33":   () => import("../../../../static/models/retro_anime_vintage_volkswagen_van.svelte"),
  "matatu-generic": () => import("../../../../static/models/GenericMatatu.svelte"),
} satisfies Record<string, () => Promise<{ default: any }>>;
  // add new buses here — no other code changes needed

/** Union of all valid keys in the vehicle model registry */
export type VehicleModelKey = keyof typeof vehicleModelLoaders;