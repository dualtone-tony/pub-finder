import { useImage } from 'expo-image';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { useEffect, useMemo, useRef } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
// Apple Maps in expo-maps needs iOS 17+ (and pin taps need iOS 18+).
const IOS_MAJOR = Platform.OS === 'ios' ? parseInt(String(Platform.Version), 10) : 0;

export function ResultsMap({ search, selectedId, onSelect, bottomInset = 0 }: ResultsMapProps) {
  const appleRef = useRef<AppleMaps.MapView>(null);
  const googleRef = useRef<GoogleMaps.MapView>(null);
  const { width, height } = useWindowDimensions();
  const originIcons = useImages(originMarkers);
  const venueIcons = useImages(venueMarkers);

  const camera = useMemo(() => {
    const b = bounds([...search.origins, ...search.results], search);
    return { coordinates: boundsCenter(b), zoom: fitZoom(b, width, Math.max(200, height - 120 - bottomInset)) };
    // Only frame the map when the search itself changes, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.center.latitude, search.center.longitude, search.radius, search.origins.length]);

  // When the detail card is closed, clear the native selection too, so tapping
  // the same pin again reopens it.
  useEffect(() => {
    if (selectedId !== null) return;
    Promise.resolve(appleRef.current?.selectMarker()).catch(() => {});
    Promise.resolve(googleRef.current?.selectMarker()).catch(() => {});
  }, [selectedId]);

  const circle = {
    id: 'area',
    center: search.center,
    radius: search.radius,
    color: CIRCLE_FILL,
    lineColor: colors.accent,
    lineWidth: 2,
  };

  if (Platform.OS === 'ios' && IOS_MAJOR < 17) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.unsupported]}>
        <Text style={styles.unsupportedText}>The map needs iOS 17 or later.</Text>
        <Pressable
          onPress={() =>
            Linking.openURL(
              `https://www.google.com/maps/search/pubs+and+bars/@${search.center.latitude},${search.center.longitude},12z`,
            )
          }
        >
          <Text style={styles.unsupportedLink}>Open the area in Google Maps ↗</Text>
        </Pressable>
      </View>
    );
  }

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
        ref={appleRef}
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
      ref={googleRef}
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

const styles = StyleSheet.create({
  unsupported: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.bg },
  unsupportedText: { fontSize: 16, color: colors.text },
  unsupportedLink: { fontSize: 16, fontWeight: '700', color: colors.accent },
});
