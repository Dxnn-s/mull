import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store';
import { GUTTER, SPACE, useTheme } from '@/theme';
import { Chip, Rule, T } from '@/ui';

const DIAL_STATES = ['resting', 'active', 'shielded', 'unlocked', 'hard', 'milestone'] as const;

export default function You() {
  const { state, update } = useStore();
  const { c, palette, mode, setPalette, setMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + SPACE.lg, paddingHorizontal: GUTTER, paddingBottom: SPACE.s40 }}>
      <T v="display">You.</T>

      <View style={{ marginTop: SPACE.s32 }}>
        <NavRow label="Subjects" value={state.settings.subjects.join(', ') || 'None picked'} onPress={() => router.push('/subjects')} />
        <NavRow label="Blocked apps" value={state.blockedAppCount ? `${state.blockedAppCount} apps` : 'None picked'} onPress={() => router.push('/blocked-apps')} />
        <NavRow label="Plans" value="Free" onPress={() => router.push('/paywall')} last />
      </View>

      <Rule label="unlock window" style={{ marginTop: SPACE.s32 }} />
      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg, flexWrap: 'wrap' }}>
        {[10, 15, 30].map((m) => (
          <Chip key={m} label={`${m} min`} selected={state.unlockMinutes === m} onPress={() => update({ unlockMinutes: m })} />
        ))}
      </View>

      <Rule label="paper" style={{ marginTop: SPACE.s32 }} />
      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg, flexWrap: 'wrap' }}>
        <Chip label="amber" selected={palette === 'amber'} onPress={() => setPalette('amber')} />
        <Chip label="sage" selected={palette === 'sage'} onPress={() => setPalette('sage')} />
        <Chip label="light" selected={mode === 'light'} onPress={() => setMode('light')} />
        <Chip label="dark" selected={mode === 'dark'} onPress={() => setMode('dark')} />
      </View>

      <Rule label="dev · dial state" style={{ marginTop: SPACE.s32 }} />
      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg, flexWrap: 'wrap' }}>
        <Chip label="auto" selected={!state.devDial} onPress={() => update({ devDial: null })} />
        {DIAL_STATES.map((s) => (
          <Chip key={s} label={s} selected={state.devDial === s} onPress={() => update({ devDial: s })} />
        ))}
      </View>

      <View style={{ height: 1, backgroundColor: c.border, marginTop: SPACE.s40 }} />
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.lg }}>
        Mull never reads what you type into anything. Cards come from the subjects you picked. Nothing leaves this phone except the request for a card.
      </T>
    </ScrollView>
  );
}

function NavRow({ label, value, onPress, last }: { label: string; value: string; onPress(): void; last?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [{ paddingVertical: SPACE.lg, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border, opacity: pressed ? 0.6 : 1 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: SPACE.lg }}>
        <T v="body">{label}</T>
        <T v="bodySm" color={c.fgMuted} numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>
          {value}
        </T>
      </View>
    </Pressable>
  );
}
