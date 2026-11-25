import type { AreaSize, LatLng } from './types';

const R = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Geographic midpoint (averages 3D unit vectors, so it behaves across the antimeridian). */
export function centroid(points: LatLng[]): LatLng {
  let x = 0, y = 0, z = 0;
  for (const p of points) {
    const lat = toRad(p.latitude), lng = toRad(p.longitude);
    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
  }
  const n = points.length;
  x /= n; y /= n; z /= n;
  return {
    latitude: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    longitude: toDeg(Math.atan2(y, x)),
  };
}

const AREA_FACTOR: Record<AreaSize, number> = { tight: 0.2, normal: 0.35, wide: 0.6 };
const SINGLE_RADIUS: Record<AreaSize, number> = { tight: 1000, normal: 2500, wide: 6000 };

/**
 * The circle to search for venues: centred on the midpoint of all the
 * locations, sized relative to how spread out they are, so the results sit
 * "between" everyone rather than next to one person.
 */
export function searchArea(points: LatLng[], size: AreaSize): { center: LatLng; radius: number } {
  const center = centroid(points);
  if (points.length < 2) return { center, radius: SINGLE_RADIUS[size] };
  const spread = Math.max(...points.map((p) => haversine(center, p)));
  // Places API caps the radius at 50 km.
  const radius = Math.min(50000, Math.max(800, spread * AREA_FACTOR[size]));
  return { center, radius };
}

export function formatDistance(m: number | null | undefined): string {
  if (m == null) return '–';
  if (m < 1000) return `${Math.round(m)} m`;
  const km = m / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function formatDuration(s: number | null | undefined): string {
  if (s == null) return 'no route';
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const valid = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/** "51.5074, -0.1278" style input. */
export function parseLatLng(text: string): LatLng | null {
  const m = text.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
  return valid(lat, lng) ? { latitude: lat, longitude: lng } : null;
}

export type ParsedMapsUrl = {
  coords?: LatLng;
  /** A place name or address extracted from the link, to look up if there are no coordinates. */
  query?: string;
  placeId?: string;
};

export function isGoogleMapsUrl(text: string): boolean {
  return /^https?:\/\/(?:[\w-]+\.)*(?:google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|goo\.gl\/maps|maps\.app\.goo\.gl|g\.co\/kgs)/i.test(
    text.trim(),
  );
}

export function isShortMapsUrl(text: string): boolean {
  return /^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\//i.test(text.trim());
}

/**
 * Pull a location out of a full Google Maps link, e.g.
 *   https://www.google.com/maps/place/The+Crown/@51.50,-0.12,17z/data=!3d51.501!4d-0.123
 *   https://www.google.com/maps/search/?api=1&query=51.5,-0.12
 *   https://maps.google.com/?q=Some+Pub,+London
 */
export function parseGoogleMapsUrl(url: string): ParsedMapsUrl | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const full = decodeURIComponent(u.href);
  const out: ParsedMapsUrl = {};

  // !3d<lat>!4d<lng> is the actual pin; @lat,lng is just the map viewport.
  const pin = [...full.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g)].pop();
  if (pin && valid(+pin[1], +pin[2])) out.coords = { latitude: +pin[1], longitude: +pin[2] };

  for (const key of ['query', 'q', 'destination', 'daddr', 'll', 'center']) {
    const v = u.searchParams.get(key);
    if (!v) continue;
    const ll = parseLatLng(v);
    if (ll) out.coords ??= ll;
    else out.query ??= v;
  }
  const pid = u.searchParams.get('query_place_id') ?? u.searchParams.get('place_id');
  if (pid) out.placeId = pid;

  const place = u.pathname.match(/\/maps\/(?:place|search)\/([^/@]+)/);
  if (place) {
    const name = decodeURIComponent(place[1].replace(/\+/g, ' ')).trim();
    const ll = parseLatLng(name);
    if (ll) out.coords ??= ll;
    else if (name) out.query ??= name;
  }

  if (!out.coords) {
    const at = full.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (at && valid(+at[1], +at[2])) out.coords = { latitude: +at[1], longitude: +at[2] };
  }

  return out.coords || out.query || out.placeId ? out : null;
}

export function directionsUrl(origin: LatLng, dest: LatLng & { id?: string; name?: string }): string {
  const p = new URLSearchParams({
    api: '1',
    origin: `${origin.latitude},${origin.longitude}`,
    destination: dest.name ?? `${dest.latitude},${dest.longitude}`,
    travelmode: 'driving',
  });
  if (dest.id) p.set('destination_place_id', dest.id);
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}
