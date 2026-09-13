import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEMO_CONCEPTS } from '@mull/core/demo-cards';
import { PROVIDER_INFO } from '@mull/core/provider-info';
import { useStore } from '@/store';
import { EMPTY_STATS } from '@mull/core/stats';
import { GUTTER, SPACE, useTheme } from '@/theme';
import { Chip, Rule, SecondaryButton, T } from '@/ui';

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
        <NavRow label="AI provider" value={state.settings.provider === 'mock' ? 'Built in cards' : PROVIDER_INFO[state.settings.provider].label} onPress={() => router.push('/provider')} />
        <NavRow label="Subjects" value={state.settings.subjects.join(', ') || 'None picked'} onPress={() => router.push('/subjects')} />
        <NavRow label="Blocked apps" value={state.blockedAppCount ? `${state.blockedAppCount} apps` : 'None picked'} onPress={() => router.push('/blocked-apps')} />
        <NavRow label="Plans" value="Free" onPress={() => router.push('/paywall')} />
        <NavRow label="Tutorial" value="Replay" onPress={() => router.push('/welcome')} last />
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

      <Rule label="motion" style={{ marginTop: SPACE.s32 }} />
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.md }}>
        Live: the pattern on the dial turns and a hand sweeps round while a session runs. Still: nothing moves.
      </T>
      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg, flexWrap: 'wrap' }}>
        <Chip label="live" selected={state.liveSeal} onPress={() => update({ liveSeal: true })} />
        <Chip label="still" selected={!state.liveSeal} onPress={() => update({ liveSeal: false })} />
      </View>

      <Rule label="test" style={{ marginTop: SPACE.s32 }} />
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.md }}>
        Mull ships with {DEMO_CONCEPTS.length} written cards, so the gate works with nothing linked. These buttons put the app into each state.
      </T>
      <View style={{ gap: SPACE.sm, marginTop: SPACE.lg }}>
        <SecondaryButton
          label="Start a 25 minute session"
          onPress={() => update({ session: { startedAt: Date.now(), endsAt: Date.now() + 25 * 60_000, unlockUntil: null } })}
        />
        <SecondaryButton
          label="Simulate an unlocked window"
          onPress={() =>
            update({
              session: { startedAt: Date.now() - 10 * 60_000, endsAt: Date.now() + 15 * 60_000, unlockUntil: Date.now() + state.unlockMinutes * 60_000 },
            })
          }
        />
        <SecondaryButton label="Trigger a hard-mode block" onPress={() => update({ block: { until: Date.now() + state.settings.hardMode.blockMinutes * 60_000 } })} />
        <SecondaryButton label="Fill a week of history" onPress={() => update({ ...sampleWeek(state.unlockMinutes) })} />
        <SecondaryButton
          label="Clear everything"
          onPress={() => update({ stats: EMPTY_STATS, memory: {}, block: null, session: null, savedSeconds: 0, blockedAppCount: 0, devDial: null })}
        />
      </View>

      <Rule label="dev · force a dial state" style={{ marginTop: SPACE.s32 }} />
      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg, flexWrap: 'wrap' }}>
        <Chip label="auto" selected={!state.devDial} onPress={() => update({ devDial: null })} />
        {DIAL_STATES.map((x) => (
          <Chip key={x} label={x} selected={state.devDial === x} onPress={() => update({ devDial: x })} />
        ))}
      </View>

      <View style={{ height: 1, backgroundColor: c.border, marginTop: SPACE.s40 }} />
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.lg }}>
        Mull never reads what you type. Cards come from the subjects you picked. Nothing leaves this phone except the request for a card.
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

/**
 * A believable week so Record and the seal have something to show. The seal's
 * figure comes from concepts learned, so this is also how you see it grow.
 */
function sampleWeek(unlockMinutes: number) {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const at = (day: number, hour: number) => monday.getTime() + day * 86_400_000 + hour * 3_600_000;
  const passed = [
    [0, 20, 'the chain rule'], [0, 21, 'p-values'], [1, 19, 'osmosis'], [1, 20, 'kinetic energy'],
    [2, 19, 'big O notation'], [2, 21, 'supply and demand'], [3, 20, 'thesis statements'], [3, 21, 'ser vs estar'],
  ] as const;
  const recent = [
    ...passed.map(([d, h, concept]) => ({ ts: at(d, h), site: 'app', verdict: 'LAZY' as const, gated: true, outcome: 'passed' as const, concept, attempts: 1, ms: 41_000 })),
    { ts: at(0, 22), site: 'app', verdict: 'LAZY' as const, gated: true, outcome: 'skipped' as const, attempts: 1, ms: 9_000 },
    { ts: at(2, 20), site: 'app', verdict: 'LAZY' as const, gated: true, outcome: 'failed' as const, attempts: 1, ms: 52_000 },
    { ts: at(3, 22), site: 'app', verdict: 'LAZY' as const, gated: true, outcome: 'cancelled' as const, attempts: 1, ms: 6_000 },
  ].sort((a, b) => a.ts - b.ts);
  const memory: Record<string, { passedAt: number; passes: number }> = {};
  for (const [d, h, concept] of passed) memory[concept] = { passedAt: at(d, h), passes: 1 };
  return {
    stats: { ...EMPTY_STATS, total: 14, gated: 11, passed: passed.length, failed: 1, skipped: 1, cancelled: 1, streak: 4, bestStreak: 6, recent, corrections: [] },
    memory,
    savedSeconds: passed.length * unlockMinutes * 60,
  };
}
