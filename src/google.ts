import { isShortMapsUrl, parseGoogleMapsUrl } from './geo';
import type { Drive, LatLng, Origin, Venue, VenueFilter } from './types';

/**
 * Thin client for the Google Maps Platform REST APIs this app uses:
 *  - Places API (New): autocomplete, place details, text search, nearby search
 *  - Routes API: computeRouteMatrix for driving times
 */

const PLACES = 'https://places.googleapis.com/v1';
const ROUTES = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

export class GoogleApiError extends Error {}

async function call<T>(key: string, url: string, fieldMask: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': fieldMask,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new GoogleApiError(`Unexpected response from Google (${res.status})`);
  }
  if (!res.ok) {
    const err = Array.isArray(json) ? json[0]?.error : json?.error;
    throw new GoogleApiError(err?.message ?? `Google request failed (${res.status})`);
  }
  return json as T;
}

type ApiPlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { openNow?: boolean };
  goodForWatchingSports?: boolean;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text: string };
};

export type Suggestion = { placeId: string; main: string; secondary?: string };

export async function autocomplete(key: string, input: string, near?: LatLng): Promise<Suggestion[]> {
  const body: any = { input };
  if (near) body.locationBias = { circle: { center: near, radius: 50000 } };
  const json = await call<{ suggestions?: any[] }>(
    key,
    `${PLACES}/places:autocomplete`,
    'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat',
    body,
  );
  return (json.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter(Boolean)
    .map((p: any) => ({
      placeId: p.placeId,
      main: p.structuredFormat?.mainText?.text ?? '',
      secondary: p.structuredFormat?.secondaryText?.text,
    }));
}

const toOrigin = (p: ApiPlace, label?: string): Omit<Origin, 'id'> => ({
  label: label ?? p.displayName?.text ?? 'Location',
  address: p.formattedAddress,
  latitude: p.location!.latitude,
  longitude: p.location!.longitude,
});

export async function placeDetails(key: string, placeId: string): Promise<Omit<Origin, 'id'>> {
  const p = await call<ApiPlace>(
    key,
    `${PLACES}/places/${encodeURIComponent(placeId)}`,
    'id,displayName,formattedAddress,location',
  );
  if (!p.location) throw new GoogleApiError('That place has no location');
  return toOrigin(p);
}

export async function textSearch(key: string, query: string): Promise<Omit<Origin, 'id'> | null> {
  const json = await call<{ places?: ApiPlace[] }>(
    key,
    `${PLACES}/places:searchText`,
    'places.id,places.displayName,places.formattedAddress,places.location',
    { textQuery: query, pageSize: 1 },
  );
  const p = json.places?.find((x) => x.location);
  return p ? toOrigin(p) : null;
}

/** Follow a maps.app.goo.gl style short link to the full URL it redirects to. */
async function expandShortUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (res.url && res.url !== url) return res.url;
    // Some redirects land on an interstitial page that carries the real URL in its HTML.
    const html = await res.text();
    const m = html.match(/https:\/\/www\.google\.[a-z.]+\/maps\/[^"'\s<>]+/);
    if (m) return m[0].replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
  } catch {
    // fall through
  }
  throw new GoogleApiError(
    "Couldn't open that short link. Try opening it in Google Maps and copying the full URL, or type the address instead.",
  );
}

/** Turn a pasted Google Maps link into a location. */
export async function resolveMapsLink(key: string, link: string): Promise<Omit<Origin, 'id'>> {
  const url = isShortMapsUrl(link) ? await expandShortUrl(link) : link;
  const parsed = parseGoogleMapsUrl(url);
  if (!parsed) throw new GoogleApiError("Couldn't find a location in that link");

  if (parsed.placeId) {
    try {
      return await placeDetails(key, parsed.placeId);
    } catch {
      // fall back to coordinates / name below
    }
  }
  if (parsed.coords) {
    return {
      label: parsed.query?.split(',')[0] || 'Dropped pin',
      address: parsed.query,
      ...parsed.coords,
    };
  }
  const found = await textSearch(key, parsed.query!);
  if (!found) throw new GoogleApiError(`No place found for “${parsed.query}”`);
  return found;
}

const TYPES: Record<VenueFilter, string[]> = {
  both: ['pub', 'bar'],
  pub: ['pub'],
  bar: ['bar'],
};

export async function searchVenues(
  key: string,
  center: LatLng,
  radius: number,
  filter: VenueFilter,
): Promise<Venue[]> {
  const json = await call<{ places?: ApiPlace[] }>(
    key,
    `${PLACES}/places:searchNearby`,
    [
      'places.id',
      'places.displayName',
      'places.shortFormattedAddress',
      'places.formattedAddress',
      'places.location',
      'places.rating',
      'places.userRatingCount',
      'places.currentOpeningHours.openNow',
      'places.goodForWatchingSports',
      'places.googleMapsUri',
      'places.primaryTypeDisplayName',
    ].join(','),
    {
      includedTypes: TYPES[filter],
      maxResultCount: 20,
      rankPreference: 'POPULARITY',
      locationRestriction: { circle: { center, radius: Math.round(radius) } },
    },
  );
  return (json.places ?? [])
    .filter((p) => p.location)
    .map((p) => ({
      id: p.id,
      name: p.displayName?.text ?? 'Unnamed',
      address: p.shortFormattedAddress ?? p.formattedAddress,
      latitude: p.location!.latitude,
      longitude: p.location!.longitude,
      rating: p.rating,
      ratingCount: p.userRatingCount,
      openNow: p.currentOpeningHours?.openNow,
      showsSport: p.goodForWatchingSports,
      mapsUri: p.googleMapsUri,
      kind: p.primaryTypeDisplayName?.text,
    }));
}

type MatrixElement = {
  originIndex?: number;
  destinationIndex?: number;
  duration?: string;
  distanceMeters?: number;
  condition?: string;
};

const waypoint = (p: LatLng) => ({
  waypoint: { location: { latLng: { latitude: p.latitude, longitude: p.longitude } } },
});

/**
 * Driving time from every origin to every destination, using current traffic.
 * Returns drives[destinationIndex][originIndex].
 */
export async function drivingMatrix(key: string, origins: LatLng[], destinations: LatLng[]): Promise<Drive[][]> {
  const out: Drive[][] = destinations.map(() => origins.map(() => ({ seconds: null, meters: null })));
  // Traffic-aware matrices are limited in size, so keep each request to <= 100 elements.
  const chunk = Math.max(1, Math.floor(100 / origins.length));
  const requests: Promise<void>[] = [];
  for (let start = 0; start < destinations.length; start += chunk) {
    const slice = destinations.slice(start, start + chunk);
    requests.push(
      call<MatrixElement[]>(key, ROUTES, 'originIndex,destinationIndex,duration,distanceMeters,condition', {
        origins: origins.map(waypoint),
        destinations: slice.map(waypoint),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }).then((elements) => {
        for (const e of elements) {
          if (e.condition !== 'ROUTE_EXISTS' || e.duration == null) continue;
          const d = start + (e.destinationIndex ?? 0);
          out[d][e.originIndex ?? 0] = {
            seconds: parseInt(e.duration, 10),
            meters: e.distanceMeters ?? null,
          };
        }
      }),
    );
  }
  await Promise.all(requests);
  return out;
}
