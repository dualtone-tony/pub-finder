import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationInput } from '../components/LocationInput';
import { ResultCard } from '../components/ResultCard';
import { centroid, formatDistance, haversine, searchArea } from '../geo';
import { drivingMatrix, searchVenues } from '../google';
import { useLastSearch } from '../searchContext';
import { load, save } from '../storage';
import { colors, originColors, originLetter } from '../theme';
import type { AreaSize, Origin, SortMode, VenueFilter, VenueResult } from '../types';

const ENV_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map(([v, label]) => (
        <Pressable
          key={v}
          onPress={() => onChange(v)}
          style={[styles.chip, v === value && styles.chipOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: v === value }}
        >
          <Text style={[styles.chipText, v === value && styles.chipTextOn]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function sortResults(list: VenueResult[], mode: SortMode): VenueResult[] {
  const max = (v: VenueResult) => Math.max(...v.drives.map((d) => d.seconds ?? Infinity));
  const total = (v: VenueResult) => v.drives.reduce((s, d) => s + (d.seconds ?? Infinity), 0);
  const cmp: Record<SortMode, (a: VenueResult, b: VenueResult) => number> = {
    fairest: (a, b) => max(a) - max(b) || total(a) - total(b),
    total: (a, b) => total(a) - total(b) || max(a) - max(b),
    rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0),
    centre: (a, b) => a.distanceFromCentreM - b.distanceFromCentreM,
  };
  return [...list].sort(cmp[mode]);
}

export default function Home() {
  const [apiKey, setApiKey] = useState(ENV_KEY);
  const [keyDraft, setKeyDraft] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [filter, setFilter] = useState<VenueFilter>('both');
  const [area, setArea] = useState<AreaSize>('normal');
  const [sort, setSort] = useState<SortMode>('centre');
  const [openOnly, setOpenOnly] = useState(false);
  const [sportOnly, setSportOnly] = useState(false);
  const [results, setResults] = useState<VenueResult[] | null>(null);
  const [searchedOrigins, setSearchedOrigins] = useState<Origin[]>([]);
  const [searchedArea, setSearchedArea] = useState<ReturnType<typeof searchArea> | null>(null);
  const { setLastSearch } = useLastSearch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const resultsY = useRef(0);
  const jumpToResults = useRef(false);

  useEffect(() => {
    (async () => {
      const [k, o] = await Promise.all([load('apiKey', ''), load<Origin[]>('origins', [])]);
      if (k) setApiKey(k);
      else if (!ENV_KEY) setShowSettings(true);
      setOrigins(o);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) save('origins', origins);
  }, [origins, loaded]);

  const preview = useMemo(() => (origins.length ? searchArea(origins, area) : null), [origins, area]);

  const addOrigin = (o: Omit<Origin, 'id'>) => {
    setError(null);
    setOrigins((prev) => [...prev, { ...o, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);
  };

  const renameOrigin = (id: string, label: string) =>
    setOrigins((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)));

  const removeOrigin = (id: string) => setOrigins((prev) => prev.filter((o) => o.id !== id));

  const search = async () => {
    if (!apiKey) return setShowSettings(true);
    if (!origins.length) return;
    setLoading(true);
    setError(null);
    try {
      const { center, radius } = searchArea(origins, area);
      const venues = await searchVenues(apiKey, center, radius, filter);
      if (!venues.length) {
        setResults([]);
      } else {
        const drives = await drivingMatrix(apiKey, origins, venues);
        setResults(
          venues.map((v, i) => ({ ...v, drives: drives[i], distanceFromCentreM: haversine(center, v) })),
        );
      }
      setSearchedOrigins(origins);
      setSearchedArea({ center, radius });
      jumpToResults.current = true;
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const shown = useMemo(() => {
    if (!results) return [];
    const filtered = results.filter(
      (r) => (!openOnly || r.openNow !== false) && (!sportOnly || r.showsSport === true),
    );
    return sortResults(filtered, sort);
  }, [results, sort, openOnly, sportOnly]);

  // Share what's on screen with the map view, in the same order as the list.
  useEffect(() => {
    setLastSearch(results && searchedArea ? { origins: searchedOrigins, results: shown, ...searchedArea } : null);
  }, [shown, results, searchedOrigins, searchedArea, setLastSearch]);

  const saveKey = async () => {
    const k = keyDraft.trim();
    setApiKey(k);
    await save('apiKey', k);
    setShowSettings(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Meet in the Middle</Text>
              <Text style={styles.subtitle}>Pubs & bars between everyone, with drive times</Text>
            </View>
            <Pressable
              onPress={() => {
                setKeyDraft(apiKey);
                setShowSettings(true);
              }}
              style={styles.gear}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 22 }}>⚙︎</Text>
            </Pressable>
          </View>

          <Text style={styles.section}>Locations</Text>
          {origins.map((o, i) => (
            <View key={o.id} style={styles.origin}>
              <View style={[styles.badge, { backgroundColor: originColors[i % originColors.length] }]}>
                <Text style={styles.badgeText}>{originLetter(i)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.originLabel}
                  value={o.label}
                  onChangeText={(t) => renameOrigin(o.id, t)}
                  accessibilityLabel={`Name for location ${originLetter(i)}`}
                />
                <Text style={styles.originAddr} numberOfLines={1}>
                  {o.address ?? `${o.latitude.toFixed(5)}, ${o.longitude.toFixed(5)}`}
                </Text>
              </View>
              <Pressable
                onPress={() => removeOrigin(o.id)}
                hitSlop={10}
                accessibilityLabel={`Remove ${o.label}`}
                accessibilityRole="button"
              >
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            </View>
          ))}

          <LocationInput
            apiKey={apiKey}
            near={origins.length ? centroid(origins) : undefined}
            onAdd={addOrigin}
            onError={setError}
          />

          <Text style={styles.section}>Looking for</Text>
          <Chips
            options={[
              ['both', 'Pubs & bars'],
              ['pub', 'Pubs'],
              ['bar', 'Bars'],
            ]}
            value={filter}
            onChange={setFilter}
          />

          <Text style={styles.section}>Search area around the midpoint</Text>
          <Chips
            options={[
              ['normal', 'Normal'],
              ['wide', 'Wide'],
              ['xwide', 'Extra wide'],
            ]}
            value={area}
            onChange={setArea}
          />
          {preview && (
            <Text style={styles.hint}>
              Within {formatDistance(preview.radius)} of {preview.center.latitude.toFixed(4)},{' '}
              {preview.center.longitude.toFixed(4)}
            </Text>
          )}

          <Pressable
            style={({ pressed }) => [styles.searchBtn, (!origins.length || loading) && styles.disabled, pressed && { opacity: 0.85 }]}
            onPress={search}
            disabled={!origins.length || loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.searchText}>
                {origins.length ? 'Find pubs & bars' : 'Add a location to start'}
              </Text>
            )}
          </Pressable>

          {error && <Text style={styles.error}>{error}</Text>}

          {results && (
            <>
              <View
                style={styles.resultsHead}
                onLayout={(e) => {
                  resultsY.current = e.nativeEvent.layout.y;
                  if (jumpToResults.current) {
                    jumpToResults.current = false;
                    scrollRef.current?.scrollTo({ y: Math.max(0, resultsY.current - 8), animated: true });
                  }
                }}
              >
                <Text style={styles.section}>
                  {shown.length} result{shown.length === 1 ? '' : 's'}
                </Text>
                <Link href="/map" asChild>
                  <Pressable style={styles.mapBtn} accessibilityRole="button" accessibilityLabel="Show results on a map">
                    <Text style={styles.mapBtnText}>🗺 Map</Text>
                  </Pressable>
                </Link>
              </View>
              <View style={styles.filters}>
                <Pressable
                  onPress={() => setOpenOnly((v) => !v)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: openOnly }}
                >
                  <Text style={[styles.toggle, openOnly && { color: colors.accent }]}>
                    {openOnly ? '☑' : '☐'} Open now
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSportOnly((v) => !v)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: sportOnly }}
                  accessibilityHint="Only places Google lists as good for watching sports"
                >
                  <Text style={[styles.toggle, sportOnly && { color: colors.accent }]}>
                    {sportOnly ? '☑' : '☐'} 📺 Shows sport
                  </Text>
                </Pressable>
              </View>
              <Chips
                options={[
                  ['fairest', 'Fairest'],
                  ['total', 'Least total driving'],
                  ['rating', 'Rating'],
                  ['centre', 'Nearest midpoint'],
                ]}
                value={sort}
                onChange={setSort}
              />
              <Text style={[styles.hint, { marginBottom: 10 }]}>
                {sort === 'fairest'
                  ? 'Ranked so the person with the longest drive has the shortest possible trip.'
                  : 'Tap a venue to open it in Google Maps, or a drive time for directions.'}
              </Text>
              {shown.length === 0 && (
                <Text style={styles.hint}>
                  {sportOnly
                    ? 'None of these are listed by Google as showing sport — try a wider area or turn the filter off.'
                    : 'Nothing found here — try a wider search area.'}
                </Text>
              )}
              {shown.map((v, i) => (
                <ResultCard key={v.id} venue={v} origins={searchedOrigins} rank={i + 1} />
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Google Maps API key</Text>
            <Text style={styles.hint}>
              The app calls Google directly from your phone. Create a key in Google Cloud Console with the
              “Places API (New)”, “Routes API” and (for the map on Android) “Maps SDK for Android” enabled. It’s stored only on this device.
            </Text>
            <TextInput
              style={[styles.originLabel, styles.keyInput]}
              value={keyDraft}
              onChangeText={setKeyDraft}
              placeholder="AIza..."
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable style={[styles.searchBtn, styles.secondaryBtn, { flex: 1 }]} onPress={() => setShowSettings(false)}>
                <Text style={[styles.searchText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.searchBtn, { flex: 1 }]} onPress={saveKey}>
                <Text style={styles.searchText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 48 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 2 },
  gear: { padding: 8 },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8 },
  origin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 8,
  },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontWeight: '800' },
  originLabel: { fontSize: 16, fontWeight: '600', color: colors.text, padding: 0 },
  originAddr: { fontSize: 13, color: colors.muted, marginTop: 2 },
  remove: { fontSize: 18, color: colors.muted, paddingHorizontal: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  hint: { fontSize: 13, color: colors.muted, marginTop: 6 },
  searchBtn: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 22 },
  secondaryBtn: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  searchText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  error: { color: colors.bad, marginTop: 12, fontSize: 14 },
  resultsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  toggle: { fontSize: 14, fontWeight: '600', color: colors.muted },
  filters: { flexDirection: 'row', gap: 18, marginBottom: 10 },
  mapBtn: { backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 6 },
  mapBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bg, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  keyInput: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: 14 },
});
