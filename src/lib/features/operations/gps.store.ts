// lib/stores/gps.store.ts
import { writable } from 'svelte/store';

/* ============================================================
   VEHICLE GPS + ENVIRONMENTAL STATE (NE06M Tracker + Rain)
============================================================ */
export interface GPSData {
  vehicleId: string;
  lat: number;
  lng: number;
  speed?: number;           // km/h
  heading?: number;         // degrees
  altitude?: number;        // meters
  satellites?: number;      // number of satellites
  fixStatus?: 'NO_FIX' | '2D_FIX' | '3D_FIX';
  hdop?: number;            // horizontal dilution of precision
  timestamp: string;        // ISO string
  organizationId?: string;

  // Environmental / sensors
  rain?: boolean | number;  // boolean for presence, number for intensity in mm/h
  [key: string]: any;       // future sensors
}

/* ============================================================
   STORE
============================================================ */
export const gpsStore = writable<GPSData[]>([]);

/* ============================================================
   DERIVED UTILITIES
============================================================ */
export function getVehicleGPS(vehicleId: string): GPSData | undefined {
  let data: GPSData | undefined;
  gpsStore.subscribe(store => {
    data = store.find(v => v.vehicleId === vehicleId);
  })();
  return data;
}

export function getActiveVehiclesGPS(): GPSData[] {
  let vehicles: GPSData[] = [];
  gpsStore.subscribe(store => {
    vehicles = store.filter(v => v.fixStatus !== 'NO_FIX');
  })();
  return vehicles;
}

/* ============================================================
   ENVIRONMENTAL UTILITIES
============================================================ */
export function getVehiclesInRain(): GPSData[] {
  let vehicles: GPSData[] = [];
  gpsStore.subscribe(store => {
    vehicles = store.filter(v => v.rain === true || (typeof v.rain === 'number' && v.rain > 0));
  })();
  return vehicles;
}