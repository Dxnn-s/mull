import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUBJECT_CHIPS } from '@mull/core/consent';
import { Rosette } from '@/rosette';
import { useStore } from '@/store';
import { GUTTER, SPACE, useTheme } from '@/theme';
import { Chip, PrimaryButton, T, TextButton } from '@/ui';

/**
 * The tutorial. Shows itself once on a fresh install and is replayable from You,
 * so it is a screen rather than a one-shot. Four steps, each doing exactly one
 * thing, and the subject step actually writes settings rather than describing
 * them: an onboarding that only talks is an onboarding people skip.
 *
 * Every step is one short line and then a list. The first draft wrote each step
 * as a paragraph, which nobody reads standing in front of a tutorial, and the
 * first step is a sequence of events anyway, so it should look like one.
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

  const pad = { paddingTop: insets.top + SPACE.lg, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + SPACE.s32 };

  const steps = [
    {
      eyebrow: 'mull · 1 of 4',
      title: 'You answer a question first.',
      lead: 'Every time you reach for ChatGPT:',
      items: ['Tap ChatGPT, and Mull opens instead.', 'Answer one question about what you are studying.', 'ChatGPT opens for fifteen minutes.'],
      numbered: true,
      cta: 'Go on',
    },
    {
      eyebrow: 'mull · 2 of 4',
      title: 'What it asks you.',
      lead: 'A few sentences on one topic, then two questions about it.',
      items: [
        'Both right and ChatGPT opens.',
        'One wrong and Mull shows the answer and why, then asks two new ones.',
        'Pass a topic and it rests for a few days.',
      ],
      numbered: false,
      cta: 'Makes sense',
    },
    {
      eyebrow: 'mull · 3 of 4',
      title: 'Pick your subjects.',
      lead: 'The questions come from these. Pick what you are studying right now.',
      items: [],
      numbered: false,
      cta: chosen.length ? 'Next' : 'Pick at least one',
    },
    {
      eyebrow: 'mull · 4 of 4',
      title: 'Set up the block.',
      lead: Platform.OS === 'web' ? 'One Shortcuts automation, about a minute to set up:' : 'Choose the apps to block:',
      items:
        Platform.OS === 'web'
          ? ['Open Blocked apps and follow the steps.', 'After that, tapping ChatGPT opens Mull first.', 'Start a session from Today whenever you sit down to work.']
          : ['Apple’s own picker does the choosing, so Mull never sees your list.', 'Blocked apps are shielded whenever a session is running.', 'Start a session from Today whenever you sit down to work.'],
      numbered: true,
      cta: 'Start',
    },
  ];

  const s = steps[step]!;
  const canAdvance = step !== 2 || chosen.length > 0;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={pad}>
      <View style={{ alignItems: 'center', height: 120, justifyContent: 'center' }}>
        <Rosette size={120} innerRatio={0.3} outerRatio={0.9} seal={{ concepts: step * 4, streak: step * 2 }} stroke={c.fg} strokeWidth={0.55} opacity={0.4} driftPerMinute={0} />
      </View>

      <T v="label" color={c.accent} style={{ marginTop: SPACE.lg }}>
        {s.eyebrow}
      </T>
      <T v="display" style={{ marginTop: SPACE.md }}>
        {s.title}
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.md }}>
        {s.lead}
      </T>

      {s.items.length > 0 && <List items={s.items} numbered={s.numbered} />}

      {step === 2 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.xl }}>
          {SUBJECT_CHIPS.map((x) => (
            <Chip key={x} label={x} selected={chosen.includes(x)} onPress={() => toggle(x)} />
          ))}
        </View>
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

/**
 * Numbered when the lines happen in order, marked when they are just facts.
 * Hairlines between rows rather than around them, which is how every other list
 * in the app is drawn.
 */
function List({ items, numbered }: { items: string[]; numbered: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: SPACE.lg, gap: SPACE.md }}>
      {items.map((line, i) => (
        <View key={line} style={{ flexDirection: 'row', gap: SPACE.md }}>
          {numbered ? (
            <T v="label" color={c.accent} style={{ width: 16 }}>
              {String(i + 1)}
            </T>
          ) : (
            // A middle dot at label size is nearly invisible on paper. A small
            // filled square sits on the same grid as the numerals and reads.
            <View style={{ width: 16, paddingTop: 8 }}>
              <View style={{ width: 5, height: 5, backgroundColor: c.accent }} />
            </View>
          )}
          <T v="body" style={{ flex: 1 }}>
            {line}
          </T>
        </View>
      ))}
    </View>
  );
}
