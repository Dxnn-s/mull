import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listConcepts, medianCardMs } from '@mull/core/stats';
import { buildRecap, weekStart } from '@mull/core/recap';
import { Rosette } from '@/rosette';
import { useStore } from '@/store';
import { GUTTER, SPACE, useTheme } from '@/theme';
import { FigureRow, Rule, T } from '@/ui';
import { formatSaved } from '@/quiz';

export default function Record() {
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
  const concepts = listConcepts(memory);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + SPACE.lg, paddingHorizontal: GUTTER, paddingBottom: SPACE.s40 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <T v="display">Record.</T>
        <View style={{ width: 84, height: 84, marginTop: -SPACE.sm, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          <Rosette size={84} innerRatio={0.28} outerRatio={0.92} seal={{ concepts: concepts.length, streak: stats.bestStreak }} stroke={c.fg} strokeWidth={0.5} opacity={0.34} />
        </View>
      </View>

      <T v="numeralLg" style={{ marginTop: SPACE.xl }}>
        {formatSaved(state.savedSeconds)}
      </T>
      <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.xs }}>
        shielded all time
      </T>

      <FigureRow
        style={{ marginTop: SPACE.xxl }}
        items={[
          { value: week.filter((e) => e.gated).length, caption: 'gated' },
          { value: week.filter((e) => e.outcome === 'passed').length, caption: 'held', accent: true },
          { value: week.filter((e) => e.outcome === 'cancelled').length, caption: 'walked' },
        ]}
      />

      <Rule label="this week" style={{ marginTop: SPACE.s32 }} />
      <View style={{ marginTop: SPACE.lg, gap: SPACE.md }}>
        {days.map((d) => (
          <View key={d.label} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
            <T v="label" color={c.fgMuted} style={{ width: 34 }}>
              {d.label}
            </T>
            <View style={{ flex: 1, height: 6, backgroundColor: c.surface2 }}>
              <View style={{ width: `${Math.round(d.pct * 100)}%`, height: '100%', backgroundColor: c.accent }} />
            </View>
            <T v="label" color={d.decided ? c.fg : c.fgFaint} style={{ width: 36, textAlign: 'right' }}>
              {d.decided ? `${Math.round(d.pct * 100)}%` : '—'}
            </T>
          </View>
        ))}
      </View>

      <Rule label="detail" style={{ marginTop: SPACE.s32 }} />
      <View style={{ marginTop: SPACE.lg }}>
        <Line k="Median card" v={median ? `${Math.round(median / 1000)}s` : '—'} />
        <Line k="Concepts learned" v={String(concepts.length)} />
        <Line k="Best streak" v={String(stats.bestStreak)} last />
      </View>

      <Rule label="monday recap" style={{ marginTop: SPACE.s32 }} />
      <T v="body" style={{ marginTop: SPACE.lg, fontFamily: 'GeistMono_400Regular', fontSize: 13.5, lineHeight: 21 }}>
        {recap}
      </T>
      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          await Clipboard.setStringAsync(recap);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        style={{ paddingVertical: SPACE.md, alignSelf: 'flex-start' }}
      >
        <T v="label" color={c.accent}>
          {copied ? 'copied' : 'copy'}
        </T>
      </Pressable>
    </ScrollView>
  );
}

function Line({ k, v, last }: { k: string; v: string; last?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: SPACE.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border }}>
      <T v="body" color={c.fgMuted}>
        {k}
      </T>
      <T v="body">{v}</T>
    </View>
  );
}
