import React, { useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { View } from 'react-native';
import { StoreProvider, useStore } from '@/store';
import { ThemeProvider, useTheme, type Mode, type Palette } from '@/theme';
import { Grain } from '@/ui';

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
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'fade' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="unlock" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="blocked-apps" />
      <Stack.Screen name="subjects" />
    </Stack>
  );
}

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
