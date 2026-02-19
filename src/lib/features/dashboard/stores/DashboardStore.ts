// src/lib/features/dashboard/stores/DashboardStore.ts
import { writable, derived } from 'svelte/store';

export const favoriteDrivers = writable<any[]>([]);
export const favoriteMatatus = writable<any[]>([]);
export const favoriteConductors = writable<any[]>([]); // ← NEW
export const rememberedMatatus = writable<any[]>([]);
export const searchQuery = writable('');

// Derived filters
export const filteredDrivers = derived(
  [favoriteDrivers, searchQuery],
  ([$drivers, $query]) =>
    $drivers.filter(d => d.name.toLowerCase().includes($query.toLowerCase()))
);

export const filteredMatatus = derived(
  [favoriteMatatus, searchQuery],
  ([$matatus, $query]) =>
    $matatus.filter(m => m.name.toLowerCase().includes($query.toLowerCase()))
);

export const filteredRememberedMatatus = derived(
  [rememberedMatatus, searchQuery],
  ([$remembered, $query]) =>
    $remembered.filter(m => m.name.toLowerCase().includes($query.toLowerCase()))
);

export const filteredConductors = derived(  // ← NEW
  [favoriteConductors, searchQuery],
  ([$conductors, $query]) =>
    $conductors.filter(c => c.name.toLowerCase().includes($query.toLowerCase()))
);

export const isLoadingFavorites = writable(true);

// Action functions
export function addFavoriteDriver(driver: any) {
  favoriteDrivers.update(list => [...list, driver]);
}

export function addFavoriteMatatu(matatu: any) {
  favoriteMatatus.update(list => [...list, matatu]);
}

export function addFavoriteConductor(conductor: any) {  // ← NEW
  favoriteConductors.update(list => [...list, conductor]);
}

export function addRememberedMatatu(matatu: any) {
  rememberedMatatus.update(list => [...list, matatu]);
}

// Data loader (expanded with conductors mock)
export async function loadFavoriteData() {
  isLoadingFavorites.set(true);
  try {
    // Your real API calls...
    // const driversRes = await fetch('/api/drivers');
    // etc.

    // For now: fallback mock (add conductors)
    favoriteDrivers.set([
      { id: 1, name: 'John Doe', vehicle: 'Matatu XYZ', rating: 4.8 },
      { id: 2, name: 'Jane Smith', vehicle: 'Matatu ABC', rating: 4.9 }
    ]);

    favoriteMatatus.set([
      { id: 1, name: 'Matatu Route 1', driver: 'John Doe' },
      { id: 2, name: 'Matatu Route 2', driver: 'Jane Smith' }
    ]);

    favoriteConductors.set([  // ← NEW mock data
      { id: 1, name: 'Alex K.', route: '111', rating: 4.7, notes: 'Always cheerful' },
      { id: 2, name: 'Mike O.', route: '125', rating: 4.6, notes: 'Quick with change' }
    ]);
  } catch (err) {
    console.error('Error loading favorites:', err);
    // Same fallback as above...
  } finally {
    isLoadingFavorites.set(false);
  }
}