import { writable, derived } from 'svelte/store';
import type { MapLayer } from '$lib/map/types/MapTypes.ts';
import { mapState } from './MapStore';

export const layers = writable<MapLayer[]>([]);

// Derived visible layers for rendering
export const visibleLayers = derived([layers, mapState], ([$layers, $mapState]) =>
  $mapState.layers.filter(layer => layer.visible)
);

export function addLayer(layer: MapLayer) {
  layers.update(l => [...l, layer]);
}
