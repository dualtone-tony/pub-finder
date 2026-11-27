# Meet in the Middle — pub finder

A mobile app (Expo / React Native, iOS + Android) where you add several
locations and it finds **pubs and bars in the area between them**, showing the
**driving time from every location to every result**.

## Features

- Add locations by:
  - typing an address or place name (Google autocomplete)
  - pasting a **Google Maps link** — full links or `maps.app.goo.gl` share links
  - typing coordinates (`51.5074, -0.1278`)
  - "Use my current location"
- Rename locations (e.g. "Tony", "Sam") — they're saved between launches.
- Searches a circle around the geographic midpoint, sized to how spread out the
  locations are (Normal / Wide / Extra wide). Pubs & bars, pubs only, or bars only.
- Up to 20 venues, each with live-traffic driving time and distance from each location.
- Sort by **Fairest** (shortest longest-drive), least total driving, rating, or
  nearest the midpoint. Filter to open now, and to places that show sport
  (Google's "good for watching sports" attribute — 📺 tag on the card).
- Tap a venue to open it in Google Maps; tap a drive time for turn-by-turn directions.
- **Map view** (🗺 Map button on the results): the search circle, every location
  (lettered A, B, C…) and every venue (numbered as in the list). Tap a pin for its
  drive times and an "Open in Google Maps" button. Google Maps on Android, Apple
  Maps on iOS. The map uses native code, so it needs a real build (APK / dev
  build), not Expo Go.

## Google API key

The app calls Google Maps Platform directly. In Google Cloud Console:

1. Create a project with billing enabled.
2. Enable **Places API (New)**, **Routes API** and **Maps SDK for Android**.
3. Create an API key. Restrict it to those three APIs.

Then either paste the key in the app (⚙︎ settings — stored only on the device),
or put it in `.env` before building:

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

The Android map reads its key from the build (`app.config.ts` copies
`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` into the Android manifest), so the map needs
the key set at build time — the in-app setting only covers search and drive times.

Note: anything in an `EXPO_PUBLIC_` variable is bundled into the app, so only
do that for a key restricted to these APIs.

Each search costs one Nearby Search plus one Route Matrix request per ~100
venue×location pairs; autocomplete runs as you type.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

## Building an APK

Uses EAS Build (free Expo account, builds in the cloud — no Android Studio needed):

```bash
npx eas-cli@latest login
npx eas-cli@latest init            # links the project to your Expo account (first time only)
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY \
    --value "AIza..." --visibility sensitive
npx eas-cli@latest build --platform android --profile preview
```

When it finishes you get a link / QR code to download the `.apk` and install it
on your phone (allow "install unknown apps" when prompted). `.env` is
gitignored and is not uploaded to EAS, which is why the key goes in an EAS
environment variable instead.

## Building for iPhone

You need an **Apple Developer Program** membership ($99/year) to install on a
real iPhone. EAS creates and manages the certificates and provisioning
profiles for you — just log in with your Apple ID when it asks.

The `production` profile reads the `production` EAS environment, so add the key
there too:

```bash
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY \
    --value "AIza..." --visibility sensitive
```

**Option A — TestFlight (recommended).** Install via Apple's TestFlight app;
easy to share with friends (up to 100 internal testers, no device registration).

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

The first run asks to create the app in App Store Connect. When Apple has
processed the build (~10–30 min after upload), add yourself as a tester in
App Store Connect → TestFlight, then install from the TestFlight app.

**Option B — direct install (ad hoc).** No TestFlight, but every iPhone must be
registered first:

```bash
npx eas-cli@latest device:create          # open the link on each iPhone
npx eas-cli@latest build --platform ios --profile preview
```

Open the build link on the iPhone to install. iOS 16+ also needs
Settings → Privacy & Security → **Developer Mode** turned on.

**Option C — iOS Simulator** (Mac only, no Apple account needed):
`npx eas-cli@latest build --platform ios --profile ios-simulator`.

iOS notes: the map uses Apple Maps (no extra Google API needed); it needs
iOS 17+, and tapping pins on the map needs iOS 18+. Bundle ID is
`com.dualtone.meetinthemiddle`.

## Code layout

- `src/app/` — screens (Expo Router): `index.tsx` search + results, `map.tsx` map view
- `src/components/ResultsMap.tsx` — native map (`expo-maps`); `ResultsMap.web.tsx` is a schematic fallback for web
- `src/searchContext.tsx` — shares the current results with the map screen
- `src/components/LocationInput.tsx` — address / link / coordinates / GPS input
- `src/components/ResultCard.tsx` — venue with per-location drive times
- `src/google.ts` — Places API (New) + Routes API client
- `src/geo.ts` — midpoint, search radius, Google Maps link parsing, formatting
