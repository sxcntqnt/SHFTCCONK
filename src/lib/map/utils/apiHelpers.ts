// src/lib/map/utils/apiHelpers.ts
import type { BoundingBox } from '../types/MapTypes';

function toNum(val: unknown): number {
  const n = parseFloat(String(val));
  if (isNaN(n)) throw new RangeError(`Cannot parse coordinate: ${val}`);
  return n;
}

export function parseBounds(boundsStr?: string): BoundingBox | null {
  if (!boundsStr) return null;
  try {
    if (boundsStr.startsWith('{')) {
      const p = JSON.parse(boundsStr);
      return {
        northEast: { lat: toNum(p.neLat ?? p.northEast?.lat), lng: toNum(p.neLng ?? p.northEast?.lng) },
        southWest: { lat: toNum(p.swLat ?? p.southWest?.lat), lng: toNum(p.swLng ?? p.southWest?.lng) },
      };
    }
    const parts = boundsStr.split(',').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      return {
        southWest: { lat: parts[0], lng: parts[1] },
        northEast: { lat: parts[2], lng: parts[3] },
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saturationToColor(saturation: number): string {
  if (saturation <= 0.3) return '#22C55E';
  if (saturation <= 0.6) return '#EAB308';
  if (saturation <= 0.8) return '#F97316';
  return '#EF4444';
}