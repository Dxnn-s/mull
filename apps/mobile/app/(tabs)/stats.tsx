import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listConcepts, medianCardMs } from '@mull/core/stats';
import { buildRecap, weekStart } from '@mull/core/recap';
import { useStore } from '@/store';
import { SPACE, useTheme } from '@/theme';
import { Card, StatTile, T } from '@/ui';
import { formatSaved } from '@/quiz';

export default function Stats() {
  const { state } = useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const { stats, memory } = state;
  const start = weekStart();
  const week = stats.recent.filter((e) => e.ts >= start.getTime());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const from = d.getTime();
    const evs = stats.recent.filter((e) => e.ts >= from && e.ts < from + 86_400_000);
    const decided = evs.filter((e) => e.outcome === 'passed' || e.outcome === 'skipped' || e.outcome === 'cancelled').length;
    const held = evs.filter((e) => e.outcome === 'passed').length;
    return { label: d.toLocaleDateString(undefined, { weekday: 'short' }), pct: decided ? held / decided : 0, decided };
  });
  const recap = buildRecap(stats, memory);
  const median = medianCardMs(stats);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + SPACE.lg, paddingHorizontal: SPACE.xl, paddingBottom: SPACE.s40 }}>
      <T v="display">Stats.</T>
      <View style={{ alignItems: 'center', marginTop: SPACE.s32 }}>
        <T v="numeral" color={c.accent}>
          {formatSaved(state.savedSeconds)}
        </T>
        <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
          saved all time
        </T>
      </View>
      <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.xxl }}>
        <StatTile value={week.filter((e) => e.gated).length} caption="gated" data />
        <StatTile value={week.filter((e) => e.outcome === 'passed').length} caption="held" data />
        <StatTile value={week.filter((e) => e.outcome === 'cancelled').length} caption="walked away" data />
      </View>

      <Card style={{ marginTop: SPACE.md, gap: SPACE.sm }}>
        {days.map((d) => (
          <View key={d.label} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
            <T v="label" color={c.fgMuted} style={{ width: 36 }}>
              {d.label}
            </T>
            <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: c.accentSoft, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(d.pct * 100)}%`, height: '100%', backgroundColor: c.accent }} />
            </View>
            <T v="label" color={c.fgMuted} style={{ width: 40, textAlign: 'right' }}>
              {d.decided ? `${Math.round(d.pct * 100)}%` : '–'}
            </T>
          </View>
        ))}
      </Card>

      <View style={{ marginTop: SPACE.lg, gap: SPACE.xs }}>
        <T v="bodySm" color={c.fgMuted}>{`Median card: ${median ? `${Math.round(median / 1000)}s` : '–'}`}</T>
        <T v="bodySm" color={c.fgMuted}>{`Concepts learned: ${listConcepts(memory).length}`}</T>
      </View>

      <Card style={{ marginTop: SPACE.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T v="label" color={c.accent}>
            monday recap
          </T>
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await Clipboard.setStringAsync(recap);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <T v="label" color={c.fgMuted}>
              {copied ? 'copied' : 'copy'}
            </T>
          </Pressable>
        </View>
        <T v="bodySm" style={{ marginTop: SPACE.sm, fontFamily: 'GeistMono_400Regular' }}>
          {recap}
        </T>
      </Card>
    </ScrollView>
  );
}
