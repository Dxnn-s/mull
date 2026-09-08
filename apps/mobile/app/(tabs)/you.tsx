import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store';
import { SPACE, useTheme } from '@/theme';
import { Card, Chip, T } from '@/ui';

const ORB_STATES = ['resting', 'active', 'shielded', 'unlocked', 'hard', 'milestone'] as const;

export default function You() {
  const { state, update } = useStore();
  const { c, palette, mode, setPalette, setMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + SPACE.lg, paddingHorizontal: SPACE.xl, paddingBottom: SPACE.s40 }}>
      <T v="display">You.</T>

      <Pressable onPress={() => router.push('/subjects')} style={{ marginTop: SPACE.s32 }}>
        <Card>
          <T v="label" color={c.fgMuted}>
            subjects
          </T>
          <T v="body" style={{ marginTop: SPACE.xs }}>
            {state.settings.subjects.join(', ') || 'None picked'}
          </T>
        </Card>
      </Pressable>
      <Pressable onPress={() => router.push('/blocked-apps')} style={{ marginTop: SPACE.md }}>
        <Card>
          <T v="label" color={c.fgMuted}>
            blocked apps
          </T>
          <T v="body" style={{ marginTop: SPACE.xs }}>
            {state.blockedAppCount ? `${state.blockedAppCount} apps` : 'None picked'}
          </T>
        </Card>
      </Pressable>

      <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.s32 }}>
        unlock window
      </T>
      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md, flexWrap: 'wrap' }}>
        {[10, 15, 30].map((m) => (
          <Chip key={m} label={`${m} min`} selected={state.unlockMinutes === m} onPress={() => update({ unlockMinutes: m })} />
        ))}
      </View>

      <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.s32 }}>
        look
      </T>
      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md, flexWrap: 'wrap' }}>
        <Chip label="amber" selected={palette === 'amber'} onPress={() => setPalette('amber')} />
        <Chip label="sage" selected={palette === 'sage'} onPress={() => setPalette('sage')} />
        <Chip label="dark" selected={mode === 'dark'} onPress={() => setMode('dark')} />
        <Chip label="light" selected={mode === 'light'} onPress={() => setMode('light')} />
      </View>

      <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.s32 }}>
        dev · orb state
      </T>
      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md, flexWrap: 'wrap' }}>
        <Chip label="auto" selected={!state.devOrb} onPress={() => update({ devOrb: null })} />
        {ORB_STATES.map((s) => (
          <Chip key={s} label={s} selected={state.devOrb === s} onPress={() => update({ devOrb: s })} />
        ))}
      </View>

      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.s40 }}>
        Mull never reads a prompt. Cards come from your subjects. Nothing leaves this phone except the quiz request.
      </T>
      <Pressable onPress={() => router.push('/paywall')} style={{ marginTop: SPACE.lg }}>
        <T v="bodySm" color={c.accent}>
          Plans
        </T>
      </Pressable>
    </ScrollView>
  );
}
