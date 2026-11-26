import type { LastSearch } from '../searchContext';

/** Marker ids: `o:<index>` for a location, `v:<placeId>` for a venue. */
export type ResultsMapProps = {
  search: LastSearch;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Extra space at the bottom of the map that is covered by the detail card. */
  bottomInset?: number;
};

export const originMarkerId = (i: number) => `o:${i}`;
export const venueMarkerId = (placeId: string) => `v:${placeId}`;
