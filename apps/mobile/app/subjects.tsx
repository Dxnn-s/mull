import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUBJECT_CHIPS } from '@mull/core/consent';
import { listConcepts } from '@mull/core/stats';
import { useStore } from '@/store';
import { SPACE, useTheme } from '@/theme';
import { Card, Chip, T, TextButton } from '@/ui';

export default function Subjects() {
  const { state, update } = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const chosen = state.settings.subjects;
  const toggle = (s: string) => update({ settings: { ...state.settings, subjects: chosen.includes(s) ? chosen.filter((x) => x !== s) : [...chosen, s] } });
  const ladder = listConcepts(state.memory).slice(0, 12);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + SPACE.md, paddingHorizontal: SPACE.xl, paddingBottom: SPACE.s40 }}>
      <TextButton label="‹ Back" onPress={() => router.back()} style={{ alignItems: 'flex-start', paddingVertical: SPACE.sm }} />
      <T v="display">Subjects.</T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        Pick what the questions come from.
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.xxl }}>
        {SUBJECT_CHIPS.map((s) => (
          <Chip key={s} label={s} selected={chosen.includes(s)} onPress={() => toggle(s)} />
        ))}
      </View>

      <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.s32 }}>
        your ladder
      </T>
      <Card style={{ marginTop: SPACE.md, gap: SPACE.md }}>
        {ladder.length === 0 ? (
          <T v="bodySm" color={c.fgMuted}>
            Nothing passed yet.
          </T>
        ) : (
          ladder.map((cpt) => (
            <View key={cpt.concept} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T v="body" style={{ flex: 1 }}>
                {cpt.concept}
              </T>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View key={i} style={{ width: 8, height: 12, borderRadius: 2, backgroundColor: i < Math.min(5, cpt.passes) ? c.accent : c.surface2 }} />
                ))}
              </View>
            </View>
          ))
        )}
      </Card>
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.md }}>
        Passed concepts come back later, spaced out.
      </T>
    </ScrollView>
  );
}
