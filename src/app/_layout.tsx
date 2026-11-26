import { Stack } from 'expo-router';
import { SearchProvider } from '../searchContext';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <SearchProvider>
      <Stack
        screenOptions={{
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, title: 'Meet in the Middle' }} />
        <Stack.Screen name="map" options={{ title: 'Map' }} />
      </Stack>
    </SearchProvider>
  );
}
