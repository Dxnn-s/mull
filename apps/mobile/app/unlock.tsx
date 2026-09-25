import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { isHardModeNow } from '@mull/core/schedule';
import { applyEvent, promptHash, rememberPass } from '@mull/core/stats';
import { readIntent } from '@mull/core/intent';
import type { IntentRead } from '@mull/core/intent';
import type { GateCard, ReviewItem } from '@mull/core/types';
import { gradeCard, isLinked, makeCard, makeCardForQuestion, pickConcept, formatClock } from '@/quiz';
import { matchConcept } from '@mull/core/cards';
import { preClassify } from '@mull/core/pre-classify';
import { shuffleChoices } from '@mull/core/gate';
import { useStore } from '@/store';
import { useTour } from '@/tour';
import { GUTTER, RADIUS, SPACE, useTheme } from '@/theme';
import { PrimaryButton, Rule, SecondaryButton, T, TextButton } from '@/ui';

type Phase =
  | { kind: 'ask' }
  | { kind: 'released'; reason: string; prompt: string }
  | { kind: 'loading'; subject: string; concept: string }
  | { kind: 'explain'; card: GateCard; subject: string; attempts: number; review: ReviewItem[] }
  | { kind: 'quiz'; card: GateCard; subject: string; attempts: number }
  | { kind: 'blocked'; until: number; review: ReviewItem[] }
  | { kind: 'error'; message: string };

/**
 * The gate. One card, four states, no way out except Cancel, and not even that
 * in hard mode. A pass opens the shield for unlockMinutes.
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
  // Set when ask mode had nothing written and no account to write one.
  const [unmatched, setUnmatched] = useState(false);
  const [asked, setAsked] = useState('');
  const tour = useTour();
  // Why they are asking, read from what they have done before.
  const [intent, setIntent] = useState<IntentRead | null>(null);

  // Ask mode opens with the question box. Subject mode goes straight to a card.
  useEffect(() => {
    if (state.block && state.block.until > Date.now()) {
      setPhase({ kind: 'blocked', until: state.block.until, review: [] });
      return;
    }
    if (state.gateMode === 'ask') {
      setPhase({ kind: 'ask' });
      return;
    }
    startSubjectCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startSubjectCard() {
    // With no AI account linked, stay inside the written bank so the gate still
    // works rather than failing at the provider.
    const unlinked = state.settings.provider === 'mock' || !state.settings.apiKey.trim();
    const pick = pickConcept(state.settings.subjects, state.memory, state.settings.conceptMemoryDays, Date.now(), unlinked);
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
  }

  /**
   * What ask mode does with the question, cheapest route first.
   *
   * Real work goes straight through, free and offline: preClassify already
   * recognises a code block, a pasted draft, a long prompt. That escape hatch is
   * what keeps the gate from punishing the work it is supposed to protect.
   *
   * Then the bank, matched by name, so a question about a topic we have written
   * is taught with no model and no cost. Only after both miss does it fall back
   * to a card from the subjects, which is subject mode's behaviour and always
   * works. A linked account writes a card on the exact concept instead.
   */
  function submitQuestion(text: string) {
    const prompt = text.trim();
    if (!prompt) return;
    setAsked(prompt);

    const effort = preClassify(prompt);
    if (effort) {
      setPhase({ kind: 'released', reason: effort, prompt });
      update({ stats: applyEvent(state.stats, { ts: Date.now(), site: 'app', verdict: 'LEGIT', gated: false, outcome: 'released', attempts: 0, ms: Date.now() - shownAt }) });
      return;
    }

    const match = matchConcept(prompt);
    if (match) {
      const read = readIntent({
        concept: match.concept,
        prompt,
        memory: state.memory,
        recent: state.stats.recent,
        msToSubmit: Date.now() - shownAt,
      });
      setIntent(read);
      // A concept they already passed gets a reminder, not the whole lesson.
      const trimmed = read.questions < match.questions.length ? { ...match, questions: match.questions.slice(0, read.questions) } : match;
      const card = shuffleChoices(trimmed, Date.now());
      setAnswers(card.questions.map(() => null));
      setPhase({ kind: 'explain', card, subject: match.subject, attempts: 0, review: [] });
      return;
    }

    // Nothing written for it. With an account linked, write one for this exact
    // question, which is the only way the gate covers what someone is actually
    // studying rather than the ten subjects we happened to write cards for.
    if (isLinked(state.settings)) {
      setPhase({ kind: 'loading', subject: '', concept: prompt.trim().slice(0, 48) });
      makeCardForQuestion(state.settings, prompt)
        .then((res) => {
          if (res.kind === 'released') {
            setPhase({ kind: 'released', reason: res.reason, prompt });
            update({ stats: applyEvent(state.stats, { ts: Date.now(), site: 'app', verdict: 'LEGIT', gated: false, outcome: 'released', attempts: 0, ms: Date.now() - shownAt }) });
            return;
          }
          setAnswers(res.card.questions.map(() => null));
          setPhase({ kind: 'explain', card: res.card, subject: res.subject, attempts: 0, review: [] });
        })
        .catch((err) => setPhase({ kind: 'error', message: err instanceof Error ? err.message : String(err) }));
      return;
    }

    // Unlinked: the bank is all there is, so ask about something they study and
    // say plainly why it is not about what they asked.
    setUnmatched(true);
    startSubjectCard();
  }

  function record(outcome: 'passed' | 'failed' | 'skipped' | 'cancelled' | 'blocked', concept?: string, attempts?: number) {
    return applyEvent(state.stats, { ts: Date.now(), site: 'app', verdict: 'LAZY', gated: true, outcome, concept, attempts, ms: Date.now() - shownAt, ...(asked ? { promptHash: promptHash(asked) } : {}) });
  }

  function finishPass(card: GateCard, attempts: number) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const session = state.session ?? { startedAt: Date.now(), endsAt: Date.now() + 25 * 60_000, unlockUntil: null };
    update({
      stats: record('passed', card.concept, attempts),
      memory: rememberPass(state.memory, card.concept),
      session: { ...session, unlockUntil: Date.now() + state.unlockMinutes * 60_000 },
    });
    tour.signal('pass');
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
    tour.signal('pass');
    router.back();
  }
  function cancel() {
    if (phase && (phase.kind === 'explain' || phase.kind === 'quiz')) update({ stats: record('cancelled', phase.card.concept, phase.attempts) });
    tour.signal('pass');
    router.back();
  }

  const pad = { paddingTop: insets.top + SPACE.xl, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + SPACE.s32 };

  if (!phase || phase.kind === 'loading') {
    return (
      <View style={[{ flex: 1 }, pad]}>
        <T v="label" color={c.accent}>
          mull · unlock
        </T>
        <T v="title" style={{ marginTop: SPACE.xl }}>
          {phase ? `${phase.concept}.` : ''}
        </T>
        <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
          Writing a forty-second lesson.
        </T>
        <TextButton label="Cancel" onPress={cancel} align="left" style={{ marginTop: SPACE.s40 }} />
      </View>
    );
  }

  if (phase.kind === 'error') {
    return (
      <View style={[{ flex: 1 }, pad]}>
        <T v="label" color={c.danger}>
          mull · no card
        </T>
        <T v="title" style={{ marginTop: SPACE.xl }}>
          Nothing to ask you.
        </T>
        <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
          {phase.message}
        </T>
        <SecondaryButton label="Close" onPress={() => router.back()} style={{ marginTop: SPACE.s32 }} />
      </View>
    );
  }

  if (phase.kind === 'blocked') return <Blocked until={phase.until} review={phase.review} onClose={() => router.back()} />;

  if (phase.kind === 'ask') return <Ask onSubmit={submitQuestion} onCancel={cancel} />;

  if (phase.kind === 'released') return <Released reason={phase.reason} prompt={phase.prompt} onClose={() => router.back()} />;

  if (phase.kind === 'explain') {
    const missed = phase.review.length > 0;
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={pad}>
        <T v="label" color={missed ? c.danger : c.accent}>
          {missed ? 'mull · missed' : 'mull · unlock'}
        </T>
        <T v="title" style={{ marginTop: SPACE.xl }}>
          {missed ? 'Not that one.' : `${phase.card.concept}.`}
        </T>
        <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
          {phase.subject}
        </T>

        {intent && intent.intent !== 'first' && !missed && (
          <View style={{ marginTop: SPACE.lg, flexDirection: 'row', gap: SPACE.md, alignItems: 'baseline' }}>
            <T v="label" color={intent.intent === 'grinding' ? c.danger : c.accent}>
              {intent.intent === 'forgot' ? 'again' : intent.intent === 'reflex' ? 'slow down' : 'repeat'}
            </T>
            <T v="bodySm" color={c.fgMuted} style={{ flex: 1 }}>
              {intent.why}
              {intent.brief ? ' One question.' : ''}
            </T>
          </View>
        )}

        {tour.active && (
          <View style={{ marginTop: SPACE.lg, borderWidth: 1, borderColor: c.accentBorder, backgroundColor: c.accentSoft, borderRadius: RADIUS.card, padding: SPACE.md }}>
            <T v="bodySm" color={c.accent}>
              This is a real card. Read it, answer both, and the dial unlocks.
            </T>
          </View>
        )}

        {unmatched && !missed && (
          <View style={{ marginTop: SPACE.lg, borderLeftWidth: 2, borderLeftColor: c.accentBorder, paddingLeft: SPACE.md }}>
            <T v="bodySm" color={c.fgMuted}>
              Nothing written for what you asked, so here is one from your subjects. Link an account and Mull writes cards for anything you are studying. One tap, free.
            </T>
          </View>
        )}

        {missed && <AnswerKey items={phase.review} />}

        <T v="body" style={{ marginTop: SPACE.xxl }}>
          {phase.card.explanation}
        </T>

        <PrimaryButton label={missed ? 'Try a new question' : 'I read it, quiz me'} onPress={() => setPhase({ kind: 'quiz', card: phase.card, subject: phase.subject, attempts: phase.attempts })} style={{ marginTop: SPACE.s32 }} />
        {hard ? (
          <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.lg, textAlign: 'center' }}>
            {`${Math.max(0, state.settings.hardMode.failsBeforeBlock - phase.attempts)} misses left tonight.`}
          </T>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.xs }}>
            <TextButton label="Skip, counts against you" onPress={skip} align="left" />
            <TextButton label="Cancel" onPress={cancel} align="right" />
          </View>
        )}
      </ScrollView>
    );
  }

  const q = phase.card.questions[qi]!;
  const last = qi === phase.card.questions.length - 1;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={pad}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T v="label" color={c.accent}>
          mull · unlock
        </T>
        <T v="label" color={c.fgMuted}>
          {`${qi + 1} of ${phase.card.questions.length}`}
        </T>
      </View>

      <T v="body" style={{ marginTop: SPACE.xl, fontSize: 19, lineHeight: 28 }}>
        {q.q}
      </T>

      <View style={{ marginTop: SPACE.xl, borderTopWidth: 1, borderTopColor: c.border }}>
        {q.choices.map((choice, j) => {
          const selected = answers[qi] === j;
          return (
            <Pressable
              key={j}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setAnswers((a) => a.map((v, k) => (k === qi ? j : v)))}
              style={{ minHeight: 58, paddingVertical: SPACE.md, paddingHorizontal: selected ? SPACE.md : 0, borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: 'row', gap: SPACE.md, alignItems: 'center', backgroundColor: selected ? c.accentSoft : 'transparent', borderRadius: selected ? RADIUS.card : 0 }}
            >
              <T v="label" color={selected ? c.accent : c.fgFaint}>
                {String.fromCharCode(65 + j)}
              </T>
              <T v="body" style={{ flex: 1 }}>
                {choice}
              </T>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton label={last ? 'Check my answers' : 'Next question'} disabled={answers[qi] == null} onPress={() => (last ? answer() : setQi(qi + 1))} style={{ marginTop: SPACE.s32 }} />
      {!hard && <TextButton label="Cancel" onPress={cancel} align="right" />}
    </ScrollView>
  );
}

function AnswerKey({ items }: { items: ReviewItem[] }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: SPACE.xxl }}>
      <Rule label="the answer" />
      {items.map((r, i) => (
        <View key={i} style={{ paddingVertical: SPACE.lg, borderBottomWidth: i === items.length - 1 ? 0 : 1, borderBottomColor: c.border }}>
          <T v="bodySm" color={c.fgMuted}>
            {r.q}
          </T>
          <T v="body" style={{ marginTop: SPACE.xs }}>
            <T v="body" color={c.accent}>
              {r.correct}
            </T>
            {r.picked ? `, not ${r.picked}.` : '. You left it blank.'}
          </T>
          {r.why ? (
            <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.xs }}>
              {r.why}
            </T>
          ) : null}
        </View>
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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + SPACE.xl, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + SPACE.s32 }}>
      <T v="label" color={c.danger}>
        mull · blocked
      </T>
      <T v="title" style={{ marginTop: SPACE.xl }}>
        That is enough misses.
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        {`Come back in ${Math.max(1, minutes)} minute${minutes === 1 ? '' : 's'}. Go think without the machine for a bit.`}
      </T>
      <T v="numeralLg" color={c.fg} style={{ marginTop: SPACE.xxl }}>
        {formatClock(until - now)}
      </T>
      {review.length > 0 && <AnswerKey items={review} />}
      <SecondaryButton label="Close" onPress={onClose} style={{ marginTop: SPACE.s32 }} />
    </ScrollView>
  );
}

/**
 * The question box. This is the original product: Mull is supposed to teach the
 * thing you were about to ask, and on a phone the only way to know that is to
 * ask. It is not extra typing, it is the same typing moved, so the text is
 * handed onward afterwards rather than thrown away.
 */
function Ask({ onSubmit, onCancel }: { onSubmit(text: string): void; onCancel(): void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + SPACE.xl, paddingHorizontal: GUTTER, paddingBottom: SPACE.s40 }}>
      <T v="label" color={c.accent}>
        mull · unlock
      </T>
      <T v="title" style={{ marginTop: SPACE.xl }}>
        What were you about to ask?
      </T>
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        Type it here instead. Real work goes straight through. A question you could answer yourself gets a card first.
      </T>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="e.g. what is the chain rule"
        placeholderTextColor={c.fgFaint}
        multiline
        autoFocus
        style={{
          marginTop: SPACE.xl,
          minHeight: 120,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: RADIUS.card,
          padding: SPACE.lg,
          color: c.fg,
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 16,
          lineHeight: 24,
          textAlignVertical: 'top',
        }}
      />
      <PrimaryButton label="Continue" disabled={!text.trim()} onPress={() => onSubmit(text)} style={{ marginTop: SPACE.lg }} />
      <TextButton label="Cancel" onPress={onCancel} align="right" />
    </ScrollView>
  );
}

/**
 * Released without a card. Worth its own screen rather than a silent pass,
 * because being told your work counted as work is the moment the gate stops
 * feeling arbitrary.
 */
function Released({ reason, prompt, onClose }: { reason: string; prompt: string; onClose(): void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  return (
    <View style={{ flex: 1, paddingTop: insets.top + SPACE.xl, paddingHorizontal: GUTTER }}>
      <T v="label" color={c.accent}>
        mull · no card needed
      </T>
      <T v="title" style={{ marginTop: SPACE.xl }}>
        That is real work.
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        {`Let through without a card: ${reason.replace('effort shown: ', '')}. Mull only stops the questions you could answer yourself.`}
      </T>
      <PrimaryButton
        label={copied ? 'Copied, go ahead' : 'Copy my question'}
        onPress={async () => {
          await Clipboard.setStringAsync(prompt);
          setCopied(true);
        }}
        style={{ marginTop: SPACE.s32 }}
      />
      <TextButton label="Close" onPress={onClose} align="right" />
    </View>
  );
}
