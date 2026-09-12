import React, { useCallback } from 'react';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// Per-weight subpaths on purpose. Importing from a font package's root pulls
// every weight and italic it ships: geist-mono alone added thirty 102KB files
// to the bundle for the two faces actually used.
import { useFonts } from 'expo-font';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk/400Regular';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { View } from 'react-native';
import { StoreProvider, useStore } from '@/store';
import { ThemeProvider, useTheme, type Mode, type Palette } from '@/theme';
import { Grain } from '@/ui';
import { registerServiceWorker } from '@/pwa';

/**
 * Expo Router vendors React Navigation, whose default theme paints rgb(242,242,242)
 * behind every screen. There is no importable ThemeProvider to override, so each
 * screen gets the paper colour directly and the grain floats on top of the whole
 * navigator at 2%, which is imperceptible over text and gives the stock its tooth.
 */
function Paper({ children }: { children: React.ReactNode }) {
  const { c, mode } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {children}
      <Grain />
    </View>
  );
}

function Themed({ children }: { children: React.ReactNode }) {
  const { state, update } = useStore();
  const onChange = useCallback((palette: Palette, theme: Mode) => update({ settings: { ...state.settings, palette, theme } }), [state.settings, update]);
  return (
    <ThemeProvider palette={state.settings.palette} mode={state.settings.theme} onChange={onChange}>
      <Paper>{children}</Paper>
    </ThemeProvider>
  );
}

function Routes() {
  const { c } = useTheme();
  const { state, ready } = useStore();
  // Wait for storage before deciding, or a returning user gets the tutorial
  // again for a frame on every cold start.
  if (ready && !state.onboardedAt) return <Redirect href="/welcome" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'fade' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" options={{ animation: 'none' }} />
      <Stack.Screen name="unlock" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="blocked-apps" />
      <Stack.Screen name="subjects" />
    </Stack>
  );
}

registerServiceWorker();

export default function RootLayout() {
  const [loaded] = useFonts({ InstrumentSerif_400Regular, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, GeistMono_400Regular, GeistMono_500Medium });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#f7f3e9' }} />;
  return (
    <StoreProvider>
      <Themed>
        <Routes />
      </Themed>
    </StoreProvider>
  );
}
