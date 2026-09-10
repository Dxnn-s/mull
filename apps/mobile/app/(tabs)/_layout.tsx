import React from 'react';
import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACE, useTheme } from '@/theme';

/**
 * Label-only tabs with a rule over the active one. No icon set, because a row of
 * generic glyphs is the fastest way to look like every other app.
 */
interface TabBarProps {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit(e: { type: 'tabPress'; target: string; canPreventDefault: true }): { defaultPrevented: boolean };
    navigate(name: string): void;
  };
}

function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.border, paddingBottom: insets.bottom || SPACE.md, backgroundColor: c.bg }}>
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const label = (descriptors[route.key]?.options.title ?? route.name) as string;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: 'center', paddingTop: SPACE.md, paddingBottom: SPACE.sm }}
          >
            <View style={{ height: 2, width: 20, backgroundColor: focused ? c.accent : 'transparent', marginBottom: SPACE.sm }} />
            <Text style={[t.label, { color: focused ? c.fg : c.fgMuted }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }} tabBar={(p) => <TabBar {...(p as unknown as TabBarProps)} />}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="sessions" options={{ title: 'Sessions' }} />
      <Tabs.Screen name="stats" options={{ title: 'Record' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}
