import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUBJECT_CHIPS } from '@mull/core/consent';
import { listConcepts } from '@mull/core/stats';
import { useStore } from '@/store';
import { GUTTER, SPACE, useTheme } from '@/theme';
import { isLinked } from '@/quiz';
import { RADIUS } from '@/theme';
import { Chip, Rule, SecondaryButton, T, TextButton } from '@/ui';

export default function Subjects() {
  const { state, update } = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const chosen = state.settings.subjects;
  const toggle = (s: string) => update({ settings: { ...state.settings, subjects: chosen.includes(s) ? chosen.filter((x) => x !== s) : [...chosen, s] } });
  const ladder = listConcepts(state.memory).slice(0, 12);
  const [typed, setTyped] = useState('');
  // Anything they added that is not one of the ten we ship.
  const custom = chosen.filter((x) => !SUBJECT_CHIPS.includes(x));
  const linked = isLinked(state.settings);

  function addSubject() {
    const name = typed.trim().replace(/\s+/g, ' ');
    if (!name || chosen.some((x) => x.toLowerCase() === name.toLowerCase())) {
      setTyped('');
      return;
    }
    update({ settings: { ...state.settings, subjects: [...chosen, name] } });
    setTyped('');
  }

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
        {custom.map((s) => (
          <Chip key={s} label={s} selected onPress={() => toggle(s)} />
        ))}
      </View>

      <Rule label="something else" style={{ marginTop: SPACE.s32 }} />
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.md }}>
        {linked
          ? 'Add whatever you are actually studying. Mull writes cards for it.'
          : 'Add whatever you are actually studying. Cards for it need an account linked, which is one tap and free.'}
      </T>
      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg }}>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          onSubmitEditing={addSubject}
          returnKeyType="done"
          placeholder="AP Bio unit 4, Korean, music theory"
          placeholderTextColor={c.fgFaint}
          autoCapitalize="none"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: RADIUS.card,
            paddingHorizontal: SPACE.lg,
            paddingVertical: SPACE.md,
            color: c.fg,
            fontFamily: 'SpaceGrotesk_400Regular',
            fontSize: 15,
          }}
        />
        <SecondaryButton label="Add" onPress={addSubject} />
      </View>

      <Rule label="your ladder" style={{ marginTop: SPACE.s32 }} />
      <View style={{ marginTop: SPACE.lg }}>
        {ladder.length === 0 ? (
          <T v="bodySm" color={c.fgMuted}>
            Nothing yet. Topics you pass show up here, then come back later to check you still know them.
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
