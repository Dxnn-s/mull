import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store';
import { RADIUS, SPACE, useTheme } from '@/theme';
import { Chip, SecondaryButton, T, TextButton } from '@/ui';

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
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + SPACE.md, paddingHorizontal: SPACE.xl, paddingBottom: SPACE.s40 }}>
      <TextButton label="‹ Back" onPress={() => router.back()} style={{ alignItems: 'flex-start', paddingVertical: SPACE.sm }} />
      <T v="display">Blocked apps.</T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        {n ? `${n} app${n === 1 ? '' : 's'}. Shielded during every session.` : 'Pick the apps to shield during sessions.'}
      </T>

      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xxl }}>
        <Chip label="AI apps" selected={n === 3} onPress={() => update({ blockedAppCount: 3 })} />
        <Chip label="Exam week" selected={n === 6} onPress={() => update({ blockedAppCount: 6 })} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE.xxl }}>
        {Array.from({ length: n }, (_, i) => (
          <View key={i} style={{ width: 72, height: 72, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.accentSoft }} />
          </View>
        ))}
        <Pressable accessibilityRole="button" onPress={() => update({ blockedAppCount: n + 1 })} style={{ width: 72, height: 72, borderRadius: 16, borderWidth: 1, borderColor: c.accentBorder, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
          <T v="label" color={c.accent}>
            add
          </T>
        </Pressable>
      </View>

      <SecondaryButton label="Edit list" onPress={() => update({ blockedAppCount: 0 })} style={{ marginTop: SPACE.s32, borderRadius: RADIUS.button }} />
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.md }}>
        Apple's picker chooses the apps. Mull only ever sees a count and an opaque token, never a name.
      </T>
    </ScrollView>
  );
}
