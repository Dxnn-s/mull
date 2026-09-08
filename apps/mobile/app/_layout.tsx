import React, { useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { View } from 'react-native';
import { StoreProvider, useStore } from '@/store';
import { ThemeProvider, type Mode, type Palette } from '@/theme';

function Themed({ children }: { children: React.ReactNode }) {
  const { state, update } = useStore();
  const onChange = useCallback((palette: Palette, theme: Mode) => update({ settings: { ...state.settings, palette, theme } }), [state.settings, update]);
  return (
    <ThemeProvider palette={state.settings.palette} mode={state.settings.theme} onChange={onChange}>
      <StatusBar style={state.settings.theme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ InstrumentSerif_400Regular, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, GeistMono_400Regular, GeistMono_500Medium });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#0a0a0e' }} />;
  return (
    <StoreProvider>
      <Themed>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="unlock" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="blocked-apps" options={{ presentation: 'card' }} />
          <Stack.Screen name="subjects" options={{ presentation: 'card' }} />
        </Stack>
      </Themed>
    </StoreProvider>
  );
}
