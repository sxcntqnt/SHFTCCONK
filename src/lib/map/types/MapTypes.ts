// src/lib/map/types/mapTypes.ts
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapMarker {
  id: string;
  position: Coordinates;
  label?: string;
  iconUrl?: string;
  color?: string; // Apple-style gradient or accent color
}

export interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  markers: MapMarker[];
}

export interface MapState {
  center: Coordinates;
  zoom: number;
  selectedMarker?: MapMarker;
  layers: MapLayer[];
}
