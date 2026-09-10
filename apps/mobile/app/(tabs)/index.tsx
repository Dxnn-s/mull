import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hardModeUntil, isHardModeNow } from '@mull/core/schedule';
import { holdRate } from '@mull/core/stats';
import { Dial, type DialState } from '@/dial';
import { useStore } from '@/store';
import { GUTTER, SPACE, useTheme } from '@/theme';
import { FigureRow, PrimaryButton, T, TextButton } from '@/ui';
import { formatClock, formatSaved } from '@/quiz';

export default function Today() {
  const { state, update } = useStore();
  const { c, palette, mode, setPalette } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const session = state.session && state.session.endsAt > now ? state.session : null;
  const unlocked = session?.unlockUntil && session.unlockUntil > now ? session.unlockUntil : null;
  const hard = isHardModeNow(state.settings, new Date(now));
  const until = hardModeUntil(state.settings, new Date(now));

  let dial: DialState = 'resting';
  let progress = 0;
  let label = 'no session';
  let value = '';
  if (unlocked && session) {
    dial = 'unlocked';
    progress = (unlocked - now) / (state.unlockMinutes * 60_000);
    label = 'unlocked';
    value = formatClock(unlocked - now);
  } else if (session) {
    dial = hard ? 'hard' : 'active';
    progress = 1 - (session.endsAt - now) / (session.endsAt - session.startedAt);
    label = hard ? 'hard mode' : 'focus';
    value = formatClock(session.endsAt - now);
  } else if (hard) {
    dial = 'hard';
    label = 'hard mode';
    value = until ?? '';
  }
  if (state.devDial) dial = state.devDial as DialState;

  const saved = state.savedSeconds + (session ? Math.floor((now - session.startedAt) / 1000) : 0);
  const decided = state.stats.passed + state.stats.skipped + state.stats.cancelled;
  const today = new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  function start(minutes: number) {
    update({ session: { startedAt: Date.now(), endsAt: Date.now() + minutes * 60_000, unlockUntil: null } });
  }
  function end() {
    if (!session) return;
    update({ session: null, savedSeconds: state.savedSeconds + Math.floor((Math.min(now, session.endsAt) - session.startedAt) / 1000) });
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + SPACE.md, paddingHorizontal: GUTTER, paddingBottom: SPACE.s40 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T v="label" color={c.accent}>
          mull
        </T>
        <Pressable accessibilityRole="button" accessibilityLabel="Switch palette" hitSlop={14} onPress={() => setPalette(palette === 'amber' ? 'sage' : 'amber')}>
          <T v="label" color={c.fgMuted}>
            {palette}
          </T>
        </Pressable>
      </View>
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.xs }}>
        {today}
      </T>

      <View style={{ marginTop: SPACE.s32, marginBottom: SPACE.s32 }}>
        <Dial state={dial} progress={progress} label={label} value={value} a11y={session ? `Session active, ${value} left.` : hard ? `Hard mode, ${until}.` : 'No session.'} />
      </View>

      <T v="numeralLg" color={c.fg}>
        {formatSaved(saved)}
      </T>
      <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.xs }}>
        shielded today
      </T>

      <FigureRow
        style={{ marginTop: SPACE.xxl }}
        items={[
          { value: decided === 0 ? '—' : `${Math.round(holdRate(state.stats) * 100)}%`, caption: 'held', accent: decided > 0 },
          { value: state.stats.streak, caption: 'streak' },
          { value: state.blockedAppCount || '—', caption: 'apps' },
        ]}
      />

      <View style={{ marginTop: SPACE.xxl }}>
        {session ? (
          <>
            {!unlocked && <PrimaryButton label={`Pass a card, unlock ${state.unlockMinutes} min`} onPress={() => router.push('/unlock')} />}
            <TextButton label="End session" onPress={end} align={unlocked ? 'center' : 'center'} style={{ marginTop: unlocked ? 0 : SPACE.xs }} />
          </>
        ) : (
          <PrimaryButton label="Start a session" onPress={() => start(25)} />
        )}
      </View>

      <View style={{ marginTop: SPACE.xl, gap: SPACE.xs }}>
        <Pressable onPress={() => router.push('/sessions')}>
          <T v="bodySm" color={c.fgMuted}>
            {state.settings.hardMode.enabled && state.settings.hardMode.schedule
              ? `Hard mode ${describeSchedule(state.settings.hardMode.schedule)}.`
              : state.settings.hardMode.enabled
                ? 'Hard mode is always on.'
                : 'No study hours set. Tap to add.'}
          </T>
        </Pressable>
        <Pressable onPress={() => router.push('/blocked-apps')}>
          <T v="bodySm" color={c.fgMuted}>
            {state.blockedAppCount ? `${state.blockedAppCount} apps shielded during a session.` : 'No apps picked yet. Tap to choose.'}
          </T>
        </Pressable>
      </View>
      <View style={{ height: 1, backgroundColor: c.border, marginTop: SPACE.xl }} />
      <T v="label" color={c.fgFaint} style={{ marginTop: SPACE.md }}>
        {mode === 'light' ? 'paper' : 'ink'} · {palette}
      </T>
    </ScrollView>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function describeSchedule(s: { days: number[]; start: string; end: string }): string {
  const d = [...s.days].sort();
  const days = d.length === 7 ? 'every day' : d.length > 2 && d.every((x, i) => i === 0 || x === d[i - 1]! + 1) ? `${DAYS[d[0]!]} to ${DAYS[d[d.length - 1]!]}` : d.map((x) => DAYS[x]).join(', ');
  return `${days}, ${clock(s.start)} to ${clock(s.end)}`;
}
function clock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const hh = (h ?? 0) % 12 === 0 ? 12 : (h ?? 0) % 12;
  return `${hh}${m ? `:${String(m).padStart(2, '0')}` : ''} ${(h ?? 0) < 12 ? 'am' : 'pm'}`;
}
