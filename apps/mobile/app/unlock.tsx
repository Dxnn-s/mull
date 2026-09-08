import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { isHardModeNow } from '@mull/core/schedule';
import { applyEvent, rememberPass } from '@mull/core/stats';
import type { GateCard, ReviewItem } from '@mull/core/types';
import { gradeCard, makeCard, pickConcept, formatClock } from '@/quiz';
import { useStore } from '@/store';
import { RADIUS, SPACE, useTheme } from '@/theme';
import { Card, Eyebrow, PrimaryButton, SecondaryButton, T, TextButton } from '@/ui';

type Phase =
  | { kind: 'loading'; subject: string; concept: string }
  | { kind: 'explain'; card: GateCard; subject: string; attempts: number; review: ReviewItem[] }
  | { kind: 'quiz'; card: GateCard; subject: string; attempts: number }
  | { kind: 'blocked'; until: number; review: ReviewItem[] }
  | { kind: 'error'; message: string };

/**
 * The gate. One card, four states, no way out except Cancel (and not even that
 * in hard mode). A pass opens the shield for unlockMinutes.
 */
export default function Unlock() {
  const { state, update } = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hard = isHardModeNow(state.settings);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [shownAt] = useState(Date.now());
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [qi, setQi] = useState(0);

  useEffect(() => {
    if (state.block && state.block.until > Date.now()) {
      setPhase({ kind: 'blocked', until: state.block.until, review: [] });
      return;
    }
    const pick = pickConcept(state.settings.subjects, state.memory, state.settings.conceptMemoryDays);
    if (!pick) {
      setPhase({ kind: 'error', message: 'Pick at least one subject first.' });
      return;
    }
    setPhase({ kind: 'loading', ...pick });
    makeCard(state.settings, pick.subject, pick.concept)
      .then((card) => {
        setAnswers(card.questions.map(() => null));
        setPhase({ kind: 'explain', card, subject: pick.subject, attempts: 0, review: [] });
      })
      .catch((err) => setPhase({ kind: 'error', message: err instanceof Error ? err.message : String(err) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function record(outcome: 'passed' | 'failed' | 'skipped' | 'cancelled' | 'blocked', concept?: string, attempts?: number) {
    return applyEvent(state.stats, { ts: Date.now(), site: 'app', verdict: 'LAZY', gated: true, outcome, concept, attempts, ms: Date.now() - shownAt });
  }

  function finishPass(card: GateCard, attempts: number) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const session = state.session ?? { startedAt: Date.now(), endsAt: Date.now() + 25 * 60_000, unlockUntil: null };
    update({
      stats: record('passed', card.concept, attempts),
      memory: rememberPass(state.memory, card.concept),
      session: { ...session, unlockUntil: Date.now() + state.unlockMinutes * 60_000 },
    });
    router.back();
  }

  function answer() {
    if (!phase || phase.kind !== 'quiz') return;
    const attempts = phase.attempts + 1;
    const g = gradeCard(phase.card, answers);
    if (g.passed) return finishPass(phase.card, attempts);
    if (state.settings.hardMode.enabled && hard && attempts >= state.settings.hardMode.failsBeforeBlock) {
      const until = Date.now() + state.settings.hardMode.blockMinutes * 60_000;
      update({ stats: record('blocked', phase.card.concept, attempts), block: { until } });
      setPhase({ kind: 'blocked', until, review: g.review });
      return;
    }
    update({ stats: record('failed', phase.card.concept, attempts) });
    setAnswers(g.reshuffled.questions.map(() => null));
    setQi(0);
    setPhase({ kind: 'explain', card: g.reshuffled, subject: phase.subject, attempts, review: g.review });
  }

  function skip() {
    if (!phase || (phase.kind !== 'explain' && phase.kind !== 'quiz') || hard) return;
    update({ stats: record('skipped', phase.card.concept, phase.attempts) });
    router.back();
  }
  function cancel() {
    if (phase && (phase.kind === 'explain' || phase.kind === 'quiz')) update({ stats: record('cancelled', phase.card.concept, phase.attempts) });
    router.back();
  }

  const pad = { paddingTop: insets.top + SPACE.lg, paddingHorizontal: SPACE.xl, paddingBottom: insets.bottom + SPACE.s32 };

  if (!phase || phase.kind === 'loading') {
    return (
      <View style={[{ flex: 1, backgroundColor: c.bg }, pad]}>
        <Eyebrow>mull · unlock</Eyebrow>
        <T v="title" style={{ marginTop: SPACE.lg }}>
          {phase ? phase.concept : ''}
        </T>
        <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
          writing a 40-second lesson
        </T>
        <TextButton label="Cancel" onPress={cancel} style={{ marginTop: SPACE.s40 }} />
      </View>
    );
  }

  if (phase.kind === 'error') {
    return (
      <View style={[{ flex: 1, backgroundColor: c.bg }, pad]}>
        <Eyebrow color={c.danger}>mull · couldn't load</Eyebrow>
        <T v="title" style={{ marginTop: SPACE.lg }}>
          No card.
        </T>
        <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
          {phase.message}
        </T>
        <SecondaryButton label="Close" onPress={() => router.back()} style={{ marginTop: SPACE.s32 }} />
      </View>
    );
  }

  if (phase.kind === 'blocked') {
    return <Blocked until={phase.until} review={phase.review} onClose={() => router.back()} />;
  }

  if (phase.kind === 'explain') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={pad}>
        <Eyebrow color={phase.review.length ? c.danger : undefined}>{phase.review.length ? 'mull · missed' : 'mull · unlock'}</Eyebrow>
        <T v="title" style={{ marginTop: SPACE.lg }}>
          {phase.review.length ? 'Not that one.' : `${phase.card.concept}.`}
        </T>
        <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.xs }}>
          {phase.subject}
        </T>
        {phase.review.length > 0 && <AnswerKey items={phase.review} />}
        <T v="body" style={{ marginTop: SPACE.xl }}>
          {phase.card.explanation}
        </T>
        <PrimaryButton label={phase.review.length ? 'New question' : 'I read it, quiz me'} onPress={() => setPhase({ kind: 'quiz', card: phase.card, subject: phase.subject, attempts: phase.attempts })} style={{ marginTop: SPACE.s32 }} />
        {hard ? (
          <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.md, textAlign: 'center' }}>
            {`${Math.max(0, state.settings.hardMode.failsBeforeBlock - phase.attempts)} misses left tonight.`}
          </T>
        ) : (
          <TextButton label="Skip (counts against you)" onPress={skip} />
        )}
        {!hard && <TextButton label="Cancel" onPress={cancel} style={{ alignItems: 'flex-end' }} />}
      </ScrollView>
    );
  }

  const q = phase.card.questions[qi]!;
  const last = qi === phase.card.questions.length - 1;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={pad}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Eyebrow>mull · unlock</Eyebrow>
        <T v="label" color={c.fgMuted}>
          {`${qi + 1} of ${phase.card.questions.length}`}
        </T>
      </View>
      <T v="body" style={{ marginTop: SPACE.xl, fontSize: 18, lineHeight: 26 }}>
        {q.q}
      </T>
      <View style={{ marginTop: SPACE.lg, gap: SPACE.sm }}>
        {q.choices.map((choice, j) => {
          const selected = answers[qi] === j;
          return (
            <Pressable
              key={j}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setAnswers((a) => a.map((v, k) => (k === qi ? j : v)))}
              style={{ minHeight: 56, borderRadius: RADIUS.card, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, flexDirection: 'row', gap: SPACE.md, alignItems: 'center', backgroundColor: selected ? c.accentSoft : c.surface, borderWidth: 1, borderColor: selected ? c.accentBorder : c.border }}
            >
              <T v="label" color={selected ? c.accent : c.fgMuted}>
                {String.fromCharCode(65 + j)}
              </T>
              <T v="body" style={{ flex: 1 }}>
                {choice}
              </T>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton label={last ? 'Answer' : 'Next'} disabled={answers[qi] == null} onPress={() => (last ? answer() : setQi(qi + 1))} style={{ marginTop: SPACE.s32 }} />
      {!hard && <TextButton label="Cancel" onPress={cancel} style={{ alignItems: 'flex-end' }} />}
    </ScrollView>
  );
}

function AnswerKey({ items }: { items: ReviewItem[] }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: SPACE.lg, gap: SPACE.md }}>
      {items.map((r, i) => (
        <Card key={i}>
          <T v="bodySm" color={c.fgMuted}>
            {r.q}
          </T>
          <T v="body" style={{ marginTop: SPACE.xs }}>
            {`${r.correct} was right.`}
            {r.picked ? ` You picked ${r.picked}.` : ''}
          </T>
          {r.why ? (
            <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.xs }}>
              {r.why}
            </T>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

function Blocked({ until, review, onClose }: { until: number; review: ReviewItem[]; onClose(): void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const minutes = Math.ceil((until - now) / 60_000);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + SPACE.lg, paddingHorizontal: SPACE.xl, paddingBottom: insets.bottom + SPACE.s32 }}>
      <Eyebrow color={c.danger}>mull · blocked</Eyebrow>
      <T v="title" style={{ marginTop: SPACE.lg }}>
        That is enough misses.
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        {`Come back in ${Math.max(1, minutes)} minute${minutes === 1 ? '' : 's'}.`}
      </T>
      <T v="numeral" color={c.danger} style={{ marginTop: SPACE.xxl, textAlign: 'center' }}>
        {formatClock(until - now)}
      </T>
      {review.length > 0 && <AnswerKey items={review} />}
      <SecondaryButton label="Close" onPress={onClose} style={{ marginTop: SPACE.s32 }} />
    </ScrollView>
  );
}
