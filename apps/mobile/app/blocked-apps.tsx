import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store';
import { GUTTER, RADIUS, SPACE, useTheme } from '@/theme';
import { Chip, Rule, SecondaryButton, T, TextButton } from '@/ui';

/**
 * Session A placeholder. The real screen calls Apple's FamilyActivityPicker from
 * the Screen Time module (Session B) and renders the returned tokens with Apple's
 * Label view. Until then the grid shows count-only tiles so the layout is real.
 */
export default function BlockedApps() {
  const { state, update } = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const n = state.blockedAppCount;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + SPACE.md, paddingHorizontal: GUTTER, paddingBottom: SPACE.s40 }}>
      <TextButton label="Back" onPress={() => router.back()} align="left" />
      <T v="display" style={{ marginTop: SPACE.sm }}>
        Blocked apps.
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        {n ? `${n} app${n === 1 ? '' : 's'}, shielded whenever a session is running.` : 'Pick the apps to shield while a session is running.'}
      </T>

      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xxl }}>
        <Chip label="AI apps" selected={n === 3} onPress={() => update({ blockedAppCount: 3 })} />
        <Chip label="Exam week" selected={n === 6} onPress={() => update({ blockedAppCount: 6 })} />
      </View>

      <Rule label="picked" style={{ marginTop: SPACE.s32 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE.lg }}>
        {Array.from({ length: n }, (_, i) => (
          <View key={i} style={{ width: 66, height: 66, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accentBorder }} />
          </View>
        ))}
        <Pressable accessibilityRole="button" onPress={() => update({ blockedAppCount: n + 1 })} style={({ pressed }) => [{ width: 66, height: 66, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.fgFaint, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 }]}>
          <T v="label" color={c.fgMuted}>
            add
          </T>
        </Pressable>
      </View>

      {n > 0 && <SecondaryButton label="Clear the list" onPress={() => update({ blockedAppCount: 0 })} style={{ marginTop: SPACE.s32 }} />}
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.xl }}>
        Apple's own picker chooses these. Mull is handed a sealed token for each one, never a name, so the list above is a count and nothing more.
      </T>
    </ScrollView>
  );
}
