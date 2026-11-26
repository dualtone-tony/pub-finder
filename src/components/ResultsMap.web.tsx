import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { bounds } from '../mapGeometry';
import { originMarkers, venueMarkers } from '../markerAssets';
import { colors, originLetter } from '../theme';
import type { LatLng } from '../types';
import { originMarkerId, venueMarkerId, type ResultsMapProps } from './ResultsMap.types';

/**
 * expo-maps has no web implementation, so on web we draw a simple schematic:
 * the search circle and the pins at their relative positions, still tappable.
 */
export function ResultsMap({ search, selectedId, onSelect, bottomInset = 0 }: ResultsMapProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const b = bounds([...search.origins, ...search.results], search);
  const cosLat = Math.cos((search.center.latitude * Math.PI) / 180);
  const spanX = Math.max(1e-6, (b.east - b.west) * cosLat);
  const spanY = Math.max(1e-6, b.north - b.south);
  const pad = 36;
  const availH = Math.max(1, size.h - bottomInset);
  const scale = Math.min((size.w - pad * 2) / spanX, (availH - pad * 2) / spanY);
  const ox = (size.w - spanX * scale) / 2;
  const oy = (availH - spanY * scale) / 2;
  const pos = (p: LatLng) => ({
    left: ox + (p.longitude - b.west) * cosLat * scale,
    top: oy + (b.north - p.latitude) * scale,
  });
  const c = pos(search.center);
  const r = (search.radius / 111320) * scale;

  return (
    <Pressable
      style={[StyleSheet.absoluteFill, styles.bg]}
      onPress={() => onSelect(null)}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size.w > 0 && (
        <>
          <View style={[styles.circle, { left: c.left - r, top: c.top - r, width: r * 2, height: r * 2, borderRadius: r }]} />
          {search.results.map((v, i) => {
            const p = pos(v);
            const id = venueMarkerId(v.id);
            return (
              <Pressable
                key={id}
                onPress={() => onSelect(id)}
                style={[styles.abs, { left: p.left - 18, top: p.top - 47, zIndex: selectedId === id ? 90 : 50 - i }]}
                accessibilityLabel={`${i + 1}. ${v.name}`}
              >
                <Image source={venueMarkers[i]} style={[styles.venue, selectedId === id && styles.selected]} />
              </Pressable>
            );
          })}
          {search.origins.map((o, i) => {
            const p = pos(o);
            const id = originMarkerId(i);
            return (
              <Pressable
                key={id}
                onPress={() => onSelect(id)}
                style={[styles.abs, { left: p.left - 16, top: p.top - 16, zIndex: 100 }]}
                accessibilityLabel={`${originLetter(i)} · ${o.label}`}
              >
                <Image source={originMarkers[i % originMarkers.length]} style={styles.origin} />
              </Pressable>
            );
          })}
          <Text style={styles.note}>Schematic view — the phone app shows a full Google / Apple map.</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: '#E8EEF0', overflow: 'hidden' },
  circle: { position: 'absolute', backgroundColor: 'rgba(180, 83, 9, 0.12)', borderWidth: 2, borderColor: colors.accent },
  abs: { position: 'absolute' },
  venue: { width: 36, height: 47 },
  origin: { width: 32, height: 32 },
  selected: { transform: [{ scale: 1.25 }] },
  note: { position: 'absolute', top: 8, left: 12, right: 12, fontSize: 12, color: colors.muted, zIndex: 0 },
});
