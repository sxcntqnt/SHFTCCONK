import { writable } from 'svelte/store';
import type { MapState, MapMarker, Coordinates } from '$lib/map/types/MapTypes.ts';

export const defaultCenter: Coordinates = { lat: 1.2921, lng: 36.8219 }; // Nairobi

export const mapState = writable<MapState>({
  center: defaultCenter,
  zoom: 6,
  layers: [],
});

export function setCenter(center: Coordinates) {
  mapState.update(state => ({ ...state, center }));
}

export function setZoom(zoom: number) {
  mapState.update(state => ({ ...state, zoom }));
}

export function selectMarker(marker: MapMarker | undefined) {
  mapState.update(state => ({ ...state, selectedMarker: marker }));
}

export function addMarkerToLayer(layerId: string, marker: MapMarker) {
  mapState.update(state => ({
    ...state,
    layers: state.layers.map(layer =>
      layer.id === layerId
        ? { ...layer, markers: [...layer.markers, marker] }
        : layer
    ),
  }));
}

export function toggleLayerVisibility(layerId: string) {
  mapState.update(state => ({
    ...state,
    layers: state.layers.map(layer =>
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ),
  }));
}

export interface Geofence {
  name: string;
  coords: Coordinates[]; // always an array for polygon consistency
}

export const geofences = writable<Geofence[]>([]);


