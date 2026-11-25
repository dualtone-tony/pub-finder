import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { directionsUrl, formatDistance, formatDuration } from '../geo';
import { colors, originColors, originLetter } from '../theme';
import type { Origin, VenueResult } from '../types';

export function ResultCard({ venue, origins, rank }: { venue: VenueResult; origins: Origin[]; rank: number }) {
  const times = venue.drives.map((d) => d.seconds).filter((s): s is number => s != null);
  const longest = times.length ? Math.max(...times) : null;
  const spread = times.length > 1 ? Math.max(...times) - Math.min(...times) : null;

  const open = () =>
    Linking.openURL(
      venue.mapsUri ??
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}&query_place_id=${venue.id}`,
    );

  return (
    <View style={styles.card}>
      <Pressable onPress={open} accessibilityRole="link" accessibilityHint="Opens in Google Maps">
        <View style={styles.header}>
          <Text style={styles.rank}>{rank}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{venue.name}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[
                venue.rating != null ? `★ ${venue.rating.toFixed(1)}${venue.ratingCount ? ` (${venue.ratingCount})` : ''}` : null,
                venue.kind,
                `${formatDistance(venue.distanceFromCentreM)} from midpoint`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {!!venue.address && (
              <Text style={styles.address} numberOfLines={1}>
                {venue.address}
              </Text>
            )}
          </View>
          {venue.openNow != null && (
            <Text style={[styles.open, { color: venue.openNow ? colors.good : colors.bad }]}>
              {venue.openNow ? 'Open' : 'Closed'}
            </Text>
          )}
        </View>
      </Pressable>

      <View style={styles.drives}>
        {origins.map((o, i) => {
          const d = venue.drives[i];
          const isLongest = origins.length > 1 && d?.seconds != null && d.seconds === longest;
          return (
            <Pressable
              key={o.id}
              style={({ pressed }) => [styles.drive, pressed && { backgroundColor: colors.accentSoft }]}
              onPress={() => Linking.openURL(directionsUrl(o, venue))}
              accessibilityRole="link"
              accessibilityLabel={`Directions from ${o.label}: ${formatDuration(d?.seconds)}`}
            >
              <View style={[styles.badge, { backgroundColor: originColors[i % originColors.length] }]}>
                <Text style={styles.badgeText}>{originLetter(i)}</Text>
              </View>
              <Text style={styles.from} numberOfLines={1}>
                {o.label}
              </Text>
              <Text style={[styles.time, isLongest && styles.longest]}>🚗 {formatDuration(d?.seconds)}</Text>
              <Text style={styles.dist}>{formatDistance(d?.meters)}</Text>
            </Pressable>
          );
        })}
      </View>
      {spread != null && (
        <Text style={styles.footer}>
          Longest drive {formatDuration(longest)} · difference {formatDuration(spread)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '800',
    overflow: 'hidden',
  },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  address: { fontSize: 13, color: colors.muted, marginTop: 1 },
  open: { fontSize: 12, fontWeight: '700' },
  drives: { marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 6 },
  drive: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderRadius: 8 },
  badge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  from: { flex: 1, fontSize: 14, color: colors.text },
  time: { fontSize: 14, fontWeight: '700', color: colors.text },
  longest: { color: colors.accent },
  dist: { fontSize: 12, color: colors.muted, width: 56, textAlign: 'right' },
  footer: { fontSize: 12, color: colors.muted, marginTop: 6 },
});
