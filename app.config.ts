import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json. The Google Maps SDK on Android reads its key from the
 * AndroidManifest at build time, so feed it the same key the app uses for the
 * Places / Routes APIs (set as an EAS environment variable, or in .env locally).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  return {
    ...(config as ExpoConfig),
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(key ? { googleMaps: { apiKey: key } } : {}),
      },
    },
  };
};
