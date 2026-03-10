// src/lib/features/fleet/index.ts

export const vehicleModelLoaders = {
  "14"            : () => import("$static/models/isuzu_erga_mio_bus.svelte"),
  "osaka"         : () => import("$static/models/japanese_bus_osaka_city_bus_osaka.svelte"),
  "retro"         : () => import("$static/models/retro_anime_vintage_volkswagen_van.svelte"),
  "matatu-generic": () => import("$static/models/GenericMatatu.svelte"),
  // add new buses here — no other code changes needed
} satisfies Record<string, () => Promise<{ default: any }>>;

/** Union of all valid keys in the vehicle model registry */
export type VehicleModelKey = keyof typeof vehicleModelLoaders;