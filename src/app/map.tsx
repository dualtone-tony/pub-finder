import { Stack } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResultCard } from '../components/ResultCard';
import { ResultsMap } from '../components/ResultsMap';
import { originMarkerId, venueMarkerId } from '../components/ResultsMap.types';
import { formatDistance } from '../geo';
import { useLastSearch } from '../searchContext';
import { colors, originColors, originLetter } from '../theme';
import type { LatLng } from '../types';

const googleMapsAt = (p: LatLng, query?: string) =>
  query
    ? `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${p.latitude},${p.longitude},13z`
    : `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`;

export default function MapScreen() {
  const { lastSearch } = useLastSearch();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  if (!lastSearch) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Run a search first, then open the map.</Text>
      </View>
    );
  }

  const { origins, results, center, radius } = lastSearch;
  const venueIndex = results.findIndex((v) => venueMarkerId(v.id) === selectedId);
  const originIndex = origins.findIndex((_, i) => originMarkerId(i) === selectedId);
  const venue = venueIndex >= 0 ? results[venueIndex] : null;
  const origin = originIndex >= 0 ? origins[originIndex] : null;
  // Room for the legend pill; the detail card simply overlays the map.
  const cardSpace = 90;

  return (
    <View style={styles.fill}>
      <Stack.Screen
        options={{
          title: `${results.length} pubs & bars`,
          headerRight: () => (
            <Pressable
              onPress={() => Linking.openURL(googleMapsAt(center, 'pubs and bars'))}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Open this area in Google Maps"
            >
              <Text style={styles.headerLink}>Google Maps ↗</Text>
            </Pressable>
          ),
        }}
      />

      <ResultsMap search={lastSearch} selectedId={selectedId} onSelect={setSelectedId} bottomInset={cardSpace} />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
        {venue ? (
          <View style={styles.sheet}>
            <Pressable style={styles.close} onPress={() => setSelectedId(null)} hitSlop={10} accessibilityLabel="Close">
              <Text style={styles.closeText}>Close ✕</Text>
            </Pressable>
            <ScrollView style={{ maxHeight: 340 }} bounces={false}>
              <ResultCard venue={venue} origins={origins} rank={venueIndex + 1} />
            </ScrollView>
            <Pressable
              style={styles.primary}
              onPress={() =>
                Linking.openURL(
                  venue.mapsUri ??
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}&query_place_id=${venue.id}`,
                )
              }
              accessibilityRole="link"
            >
              <Text style={styles.primaryText}>Open in Google Maps</Text>
            </Pressable>
          </View>
        ) : origin ? (
          <View style={[styles.sheet, styles.row]}>
            <View style={[styles.badge, { backgroundColor: originColors[originIndex % originColors.length] }]}>
              <Text style={styles.badgeText}>{originLetter(originIndex)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{origin.label}</Text>
              {!!origin.address && (
                <Text style={styles.sub} numberOfLines={1}>
                  {origin.address}
                </Text>
              )}
            </View>
            <Pressable onPress={() => Linking.openURL(googleMapsAt(origin))} accessibilityRole="link" hitSlop={8}>
              <Text style={styles.headerLink}>Google Maps ↗</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.legend}>
            <Text style={styles.legendText}>
              Tap a pin for drive times · searched within {formatDistance(radius)} of the midpoint
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: colors.muted, fontSize: 16, textAlign: 'center' },
  headerLink: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  sheet: {
    backgroundColor: colors.bg,
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  close: { alignSelf: 'flex-end', paddingHorizontal: 6, paddingBottom: 6 },
  closeText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  primary: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontWeight: '800' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  legend: {
    alignSelf: 'center',
    backgroundColor: 'rgba(31, 26, 20, 0.85)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  legendText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
