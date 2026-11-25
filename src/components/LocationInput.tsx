import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { isGoogleMapsUrl, parseLatLng } from '../geo';
import { autocomplete, placeDetails, resolveMapsLink, type Suggestion } from '../google';
import { colors } from '../theme';
import type { LatLng, Origin } from '../types';

type Props = {
  apiKey: string;
  near?: LatLng;
  onAdd: (o: Omit<Origin, 'id'>) => void;
  onError: (msg: string) => void;
};

/**
 * One box that accepts any of:
 *  - a place name or address (with Google autocomplete suggestions)
 *  - a pasted Google Maps link (full or maps.app.goo.gl short link)
 *  - raw "lat, lng" coordinates
 * plus a button for the phone's current location.
 */
export function LocationInput({ apiKey, near, onAdd, onError }: Props) {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  const trimmed = text.trim();
  const isLink = isGoogleMapsUrl(trimmed);
  const coords = parseLatLng(trimmed);

  useEffect(() => {
    if (!apiKey || trimmed.length < 3 || isLink || coords) {
      setSuggestions([]);
      return;
    }
    const id = ++seq.current;
    const t = setTimeout(() => {
      autocomplete(apiKey, trimmed, near)
        .then((s) => id === seq.current && setSuggestions(s.slice(0, 5)))
        .catch((e) => id === seq.current && onError(e.message));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, apiKey]);

  const run = async (fn: () => Promise<Omit<Origin, 'id'>>) => {
    setBusy(true);
    try {
      onAdd(await fn());
      setText('');
      setSuggestions([]);
      seq.current++;
    } catch (e: any) {
      onError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!trimmed) return;
    if (coords) return run(async () => ({ label: 'Dropped pin', address: trimmed, ...coords }));
    if (isLink) return run(() => resolveMapsLink(apiKey, trimmed));
    if (suggestions[0]) return run(() => placeDetails(apiKey, suggestions[0].placeId));
    onError('Pick a suggestion, paste a Google Maps link, or enter coordinates.');
  };

  const useMyLocation = () =>
    run(async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new Error('Location permission was denied');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return {
        label: 'My location',
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    });

  return (
    <View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Address, place, or paste a Google Maps link"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={submit}
          editable={!busy}
        />
        <Pressable
          style={({ pressed }) => [styles.addBtn, (!trimmed || busy) && styles.disabled, pressed && styles.pressed]}
          onPress={submit}
          disabled={!trimmed || busy}
          accessibilityRole="button"
          accessibilityLabel="Add location"
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.addText}>Add</Text>}
        </Pressable>
      </View>

      {isLink && <Text style={styles.hint}>Google Maps link detected — tap Add.</Text>}
      {coords && <Text style={styles.hint}>Coordinates detected — tap Add.</Text>}

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((s) => (
            <Pressable
              key={s.placeId}
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressedRow]}
              onPress={() => run(() => placeDetails(apiKey, s.placeId))}
            >
              <Text style={styles.sMain} numberOfLines={1}>
                {s.main}
              </Text>
              {!!s.secondary && (
                <Text style={styles.sSecondary} numberOfLines={1}>
                  {s.secondary}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <Pressable onPress={useMyLocation} disabled={busy} style={styles.myLoc} accessibilityRole="button">
        <Text style={styles.myLocText}>◎ Use my current location</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    minWidth: 64,
    alignItems: 'center',
  },
  addText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  hint: { color: colors.muted, fontSize: 13, marginTop: 6 },
  suggestions: {
    marginTop: 6,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  suggestion: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressedRow: { backgroundColor: colors.accentSoft },
  sMain: { fontSize: 15, color: colors.text, fontWeight: '600' },
  sSecondary: { fontSize: 13, color: colors.muted, marginTop: 2 },
  myLoc: { paddingVertical: 10, alignSelf: 'flex-start' },
  myLocText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
});
