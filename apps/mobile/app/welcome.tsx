import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUBJECT_CHIPS } from '@mull/core/consent';
import { Rosette } from '@/rosette';
import { useStore } from '@/store';
import { GUTTER, SPACE, useTheme } from '@/theme';
import { Chip, PrimaryButton, Rule, T, TextButton } from '@/ui';

/**
 * The tutorial. Shows itself once on a fresh install and is replayable from You,
 * so it is a screen rather than a one-shot. Four steps, each doing exactly one
 * thing, and the subject step actually writes settings rather than describing
 * them: an onboarding that only talks is an onboarding people skip.
 */
export default function Welcome() {
  const { state, update } = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const chosen = state.settings.subjects;
  const toggle = (s: string) => update({ settings: { ...state.settings, subjects: chosen.includes(s) ? chosen.filter((x) => x !== s) : [...chosen, s] } });

  function finish() {
    update({ onboardedAt: Date.now() });
    router.replace('/');
  }

  const pad = { paddingTop: insets.top + SPACE.xl, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + SPACE.s32 };

  const steps = [
    {
      eyebrow: 'mull · 1 of 4',
      title: 'Think first.',
      body: 'Pick the apps you want to slow down. When you open one, Mull asks you a question first. Get it right and you get fifteen minutes.',
      cta: 'Go on',
    },
    {
      eyebrow: 'mull · 2 of 4',
      title: 'What a card is.',
      body: 'A short explanation, then two questions. Get both right and you are in. Get one wrong and Mull tells you why, then asks again. Once you pass a topic, it will not come back for a few days.',
      cta: 'Makes sense',
    },
    {
      eyebrow: 'mull · 3 of 4',
      title: 'Pick your subjects.',
      body: 'Your cards come from these. Pick what you are actually studying.',
      cta: chosen.length ? 'Next' : 'Pick at least one',
    },
    {
      eyebrow: 'mull · 4 of 4',
      title: 'Set the block.',
      body:
        Platform.OS === 'web'
          ? 'On your phone, one Shortcuts automation sends you to Mull when you open ChatGPT. It takes about a minute to set up, once. Blocked apps shows you how.'
          : 'Choose which apps to shield. Apple’s own picker does the choosing, so Mull never sees your list.',
      cta: 'Start',
    },
  ];

  const s = steps[step]!;
  const canAdvance = step !== 2 || chosen.length > 0;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={pad}>
      <View style={{ alignItems: 'center', height: 150, justifyContent: 'center' }}>
        <Rosette size={150} innerRatio={0.3} outerRatio={0.9} seal={{ concepts: step * 4, streak: step * 2 }} stroke={c.fg} strokeWidth={0.55} opacity={0.4} driftPerMinute={0} />
      </View>

      <T v="label" color={c.accent} style={{ marginTop: SPACE.xl }}>
        {s.eyebrow}
      </T>
      <T v="display" style={{ marginTop: SPACE.md }}>
        {s.title}
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.md }}>
        {s.body}
      </T>

      {step === 2 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.xl }}>
          {SUBJECT_CHIPS.map((x) => (
            <Chip key={x} label={x} selected={chosen.includes(x)} onPress={() => toggle(x)} />
          ))}
        </View>
      )}

      {step === 3 && (
        <>
          <Rule label="after this" style={{ marginTop: SPACE.xl }} />
          <View style={{ marginTop: SPACE.lg, gap: SPACE.sm }}>
            {['Start a session from Today.', 'Open a blocked app. Mull catches it.', 'Pass the card. Get your fifteen minutes.'].map((line, i) => (
              <View key={line} style={{ flexDirection: 'row', gap: SPACE.md }}>
                <T v="label" color={c.accent} style={{ width: 14 }}>
                  {String(i + 1)}
                </T>
                <T v="bodySm" color={c.fgMuted} style={{ flex: 1 }}>
                  {line}
                </T>
              </View>
            ))}
          </View>
        </>
      )}

      <PrimaryButton label={s.cta} disabled={!canAdvance} onPress={() => (step === steps.length - 1 ? finish() : setStep(step + 1))} style={{ marginTop: SPACE.s32 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.xs }}>
        {step > 0 ? <TextButton label="Back" onPress={() => setStep(step - 1)} align="left" /> : <View />}
        <TextButton label="Skip" onPress={finish} align="right" />
      </View>

      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: SPACE.lg }}>
        {steps.map((_, i) => (
          <Pressable key={i} onPress={() => setStep(i)} hitSlop={8}>
            <View style={{ width: i === step ? 18 : 6, height: 3, backgroundColor: i === step ? c.accent : c.fgFaint }} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
