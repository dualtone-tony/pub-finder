import { haversine } from './geo';
import type { LatLng } from './types';

/** Bounding box of a set of points plus a circle. */
export function bounds(points: LatLng[], circle?: { center: LatLng; radius: number }) {
  const pts = [...points];
  if (circle) {
    const dLat = circle.radius / 111320;
    const dLng = circle.radius / (111320 * Math.cos((circle.center.latitude * Math.PI) / 180));
    pts.push(
      { latitude: circle.center.latitude + dLat, longitude: circle.center.longitude + dLng },
      { latitude: circle.center.latitude - dLat, longitude: circle.center.longitude - dLng },
    );
  }
  const lats = pts.map((p) => p.latitude);
  const lngs = pts.map((p) => p.longitude);
  return { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) };
}

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/**
 * Web-Mercator zoom level that fits the bounds into a view of the given size
 * (in dp), with some padding. Works for both Google and Apple maps.
 */
export function fitZoom(b: ReturnType<typeof bounds>, widthDp: number, heightDp: number, padding = 0.8): number {
  const lngSpan = Math.max(1e-6, b.east - b.west);
  const latSpan = Math.max(1e-6, (mercY(b.north) - mercY(b.south)) * (180 / Math.PI));
  const zx = Math.log2((widthDp * padding * 360) / (256 * lngSpan));
  const zy = Math.log2((heightDp * padding * 360) / (256 * latSpan));
  return Math.max(2, Math.min(17, Math.min(zx, zy)));
}

export const boundsCenter = (b: ReturnType<typeof bounds>): LatLng => ({
  latitude: (b.north + b.south) / 2,
  longitude: (b.east + b.west) / 2,
});

export { haversine };
