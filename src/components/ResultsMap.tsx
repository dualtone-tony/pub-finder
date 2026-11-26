import { useImage } from 'expo-image';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { bounds, boundsCenter, fitZoom } from '../mapGeometry';
import { originMarkers, venueMarkers } from '../markerAssets';
import { colors, originColors, originLetter } from '../theme';
import { originMarkerId, venueMarkerId, type ResultsMapProps } from './ResultsMap.types';

const CIRCLE_FILL = 'rgba(180, 83, 9, 0.12)';

/** Loads a fixed list of bundled images; the list never changes length, so hook order is stable. */
function useImages(sources: number[]) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return sources.map((src) => useImage(src));
}

/**
 * Native map: Google Maps on Android, Apple Maps on iOS.
 * Shows the search circle, every starting location (lettered) and every venue (numbered as in the list).
 */
export function ResultsMap({ search, onSelect, bottomInset = 0 }: ResultsMapProps) {
  const { width, height } = useWindowDimensions();
  const originIcons = useImages(originMarkers);
  const venueIcons = useImages(venueMarkers);

  const camera = useMemo(() => {
    const b = bounds([...search.origins, ...search.results], search);
    return { coordinates: boundsCenter(b), zoom: fitZoom(b, width, Math.max(200, height - 120 - bottomInset)) };
    // Only frame the map when the search itself changes, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.center.latitude, search.center.longitude, search.radius, search.origins.length]);

  const circle = {
    id: 'area',
    center: search.center,
    radius: search.radius,
    color: CIRCLE_FILL,
    lineColor: colors.accent,
    lineWidth: 2,
  };

  if (Platform.OS === 'ios') {
    const annotations: AppleMaps.Annotation[] = [
      ...search.origins.map((o, i) => ({
        id: originMarkerId(i),
        coordinates: o,
        title: `${originLetter(i)} · ${o.label}`,
        text: originLetter(i),
        textColor: '#FFFFFF',
        backgroundColor: originColors[i % originColors.length],
      })),
      ...search.results.map((v, i) => ({
        id: venueMarkerId(v.id),
        coordinates: v,
        title: `${i + 1}. ${v.name}`,
        text: String(i + 1),
        textColor: '#431407',
        backgroundColor: '#F59E0B',
      })),
    ];
    return (
      <AppleMaps.View
        style={StyleSheet.absoluteFill}
        cameraPosition={camera}
        circles={[circle]}
        annotations={annotations}
        onAnnotationClick={(a) => onSelect(a.id ?? null)}
        onMarkerClick={(m) => onSelect(m.id ?? null)}
        onMapClick={() => onSelect(null)}
        uiSettings={{ compassEnabled: true, scaleBarEnabled: true }}
      />
    );
  }

  const markers: GoogleMaps.Marker[] = [
    ...search.origins.map((o, i) => ({
      id: originMarkerId(i),
      coordinates: o,
      title: `${originLetter(i)} · ${o.label}`,
      icon: originIcons[i] ?? undefined,
      anchor: { x: 0.5, y: 0.5 },
      zIndex: 100,
    })),
    ...search.results.map((v, i) => ({
      id: venueMarkerId(v.id),
      coordinates: v,
      title: `${i + 1}. ${v.name}`,
      icon: venueIcons[i] ?? undefined,
      anchor: { x: 0.5, y: 1 },
      // Better-ranked venues draw on top when pins overlap.
      zIndex: 50 - i,
    })),
  ];
  return (
    <GoogleMaps.View
      style={StyleSheet.absoluteFill}
      cameraPosition={camera}
      circles={[circle]}
      markers={markers}
      onMarkerClick={(m) => onSelect(m.id ?? null)}
      onMapClick={() => onSelect(null)}
      contentPadding={{ bottom: bottomInset }}
      uiSettings={{ mapToolbarEnabled: false, zoomControlsEnabled: false, compassEnabled: true }}
    />
  );
}
