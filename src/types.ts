export type LatLng = { latitude: number; longitude: number };

/** A starting point the user has added (home, work, a friend's house...). */
export type Origin = LatLng & {
  id: string;
  label: string;
  address?: string;
};

export type Venue = LatLng & {
  id: string;
  name: string;
  address?: string;
  rating?: number;
  ratingCount?: number;
  openNow?: boolean;
  /** Google's "good for watching sports" attribute; undefined when Google doesn't know. */
  showsSport?: boolean;
  mapsUri?: string;
  kind?: string;
};

export type Drive = {
  /** Seconds, or null when no driving route exists. */
  seconds: number | null;
  meters: number | null;
};

export type VenueResult = Venue & {
  /** One entry per origin, same order as the origins array. */
  drives: Drive[];
  distanceFromCentreM: number;
};

export type VenueFilter = 'both' | 'pub' | 'bar';
export type AreaSize = 'normal' | 'wide' | 'xwide';
export type SortMode = 'fairest' | 'total' | 'rating' | 'centre';
