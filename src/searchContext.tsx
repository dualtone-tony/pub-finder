import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { LatLng, Origin, VenueResult } from './types';

/** The search currently shown on the home screen, shared with the map screen. */
export type LastSearch = {
  origins: Origin[];
  /** In the same order as the list (current sort / filter). */
  results: VenueResult[];
  center: LatLng;
  radius: number;
};

const Ctx = createContext<{
  lastSearch: LastSearch | null;
  setLastSearch: (s: LastSearch | null) => void;
} | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [lastSearch, setLastSearch] = useState<LastSearch | null>(null);
  const value = useMemo(() => ({ lastSearch, setLastSearch }), [lastSearch]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLastSearch() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLastSearch must be used inside <SearchProvider>');
  return ctx;
}
