import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUBJECT_CHIPS } from '@mull/core/consent';
import { listConcepts } from '@mull/core/stats';
import { useStore } from '@/store';
import { GUTTER, SPACE, useTheme } from '@/theme';
import { Chip, Rule, T, TextButton } from '@/ui';

export default function Subjects() {
  const { state, update } = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const chosen = state.settings.subjects;
  const toggle = (s: string) => update({ settings: { ...state.settings, subjects: chosen.includes(s) ? chosen.filter((x) => x !== s) : [...chosen, s] } });
  const ladder = listConcepts(state.memory).slice(0, 12);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + SPACE.md, paddingHorizontal: GUTTER, paddingBottom: SPACE.s40 }}>
      <TextButton label="Back" onPress={() => router.back()} align="left" />
      <T v="display" style={{ marginTop: SPACE.sm }}>
        Subjects.
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        Pick what the questions come from.
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.xxl }}>
        {SUBJECT_CHIPS.map((s) => (
          <Chip key={s} label={s} selected={chosen.includes(s)} onPress={() => toggle(s)} />
        ))}
      </View>

      <Rule label="your ladder" style={{ marginTop: SPACE.s32 }} />
      <View style={{ marginTop: SPACE.lg }}>
        {ladder.length === 0 ? (
          <T v="bodySm" color={c.fgMuted}>
            Nothing passed yet. Concepts you pass show up here and come back later, spaced out.
          </T>
        ) : (
          ladder.map((cpt, i) => (
            <View key={cpt.concept} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACE.md, borderBottomWidth: i === ladder.length - 1 ? 0 : 1, borderBottomColor: c.border }}>
              <T v="body" style={{ flex: 1 }} numberOfLines={1}>
                {cpt.concept}
              </T>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {[0, 1, 2, 3, 4].map((j) => (
                  <View key={j} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: j < Math.min(5, cpt.passes) ? c.accent : 'transparent', borderWidth: 1, borderColor: j < Math.min(5, cpt.passes) ? c.accent : c.fgFaint }} />
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
