import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View, type ColorValue } from 'react-native';
import { FONT, useTheme } from '@/theme';

function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: 18, fontFamily: FONT.monoMedium }}>{glyph}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.border, borderTopWidth: 1, height: 84, paddingTop: 8 },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.fgMuted,
        tabBarLabelStyle: { fontFamily: FONT.monoMedium, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Icon glyph="●" color={color} /> }} />
      <Tabs.Screen name="sessions" options={{ title: 'Sessions', tabBarIcon: ({ color }) => <Icon glyph="◔" color={color} /> }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: ({ color }) => <Icon glyph="▮" color={color} /> }} />
      <Tabs.Screen name="you" options={{ title: 'You', tabBarIcon: ({ color }) => <Icon glyph="◐" color={color} /> }} />
    </Tabs>
  );
}
