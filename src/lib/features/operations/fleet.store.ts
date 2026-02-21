// lib/stores/fleet.store.ts
import { writable, derived } from 'svelte/store';
import { persist, createIndexedDBStorage } from '@macfja/svelte-persistent-store';

export interface Vehicle {
  id: string;
  registration: string;
  route: string;
  status: 'ACTIVE' | 'NON_COMPLIANT' | 'MAINTENANCE' | 'SUSPENDED';
  insuranceExpiry: string;
  lastMaintenance?: string; // New for predictive
}

const fleetWritable = persist(writable<Vehicle[]>([]), createIndexedDBStorage(), 'fleet');

export const fleetStore = {
  ...fleetWritable,
  activeCount: derived(fleetWritable, $fleet => $fleet.filter(v => v.status === 'ACTIVE').length),
  // More derived: e.g., maintenanceDue: derived(...) { logic for predictions }
};