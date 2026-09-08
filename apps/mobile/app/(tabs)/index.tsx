import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hardModeUntil, isHardModeNow } from '@mull/core/schedule';
import { holdRate } from '@mull/core/stats';
import { Orb, type OrbState } from '@/orb';
import { useStore } from '@/store';
import { SPACE, useTheme } from '@/theme';
import { PrimaryButton, StatTile, T } from '@/ui';
import { formatClock, formatSaved } from '@/quiz';

export default function Home() {
  const { state, update } = useStore();
  const { c, palette, setPalette } = useTheme();
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

  let orb: OrbState = 'resting';
  let progress = 0;
  let label = 'READY';
  let value = 'no session';
  if (unlocked && session) {
    orb = 'unlocked';
    progress = (unlocked - now) / (state.unlockMinutes * 60_000);
    label = 'UNLOCKED';
    value = formatClock(unlocked - now);
  } else if (session) {
    orb = hard ? 'hard' : 'active';
    progress = 1 - (session.endsAt - now) / (session.endsAt - session.startedAt);
    label = hard ? 'HARD' : 'FOCUS';
    value = formatClock(session.endsAt - now);
  } else if (hard) {
    orb = 'hard';
    label = 'HARD';
    value = until ?? '';
  }
  if (state.devOrb) orb = state.devOrb as OrbState;

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const saved = state.savedSeconds + (session ? Math.floor((now - session.startedAt) / 1000) : 0);
  const decided = state.stats.passed + state.stats.skipped + state.stats.cancelled;

  function start(minutes: number) {
    update({ session: { startedAt: Date.now(), endsAt: Date.now() + minutes * 60_000, unlockUntil: null } });
  }
  function end() {
    if (!session) return;
    update({ session: null, savedSeconds: state.savedSeconds + Math.floor((Math.min(now, session.endsAt) - session.startedAt) / 1000) });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + SPACE.md, paddingHorizontal: SPACE.xl, paddingBottom: SPACE.s40 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="label" color={c.accent}>
          mull
        </T>
        <Pressable accessibilityRole="button" accessibilityLabel="Switch palette" hitSlop={12} onPress={() => setPalette(palette === 'amber' ? 'sage' : 'amber')}>
          <T v="label" color={c.fgMuted}>
            ◐
          </T>
        </Pressable>
      </View>

      <View style={{ marginTop: SPACE.s32 }}>
        <Orb state={orb} progress={progress} label={label} value={value} a11y={session ? `Session active, ${value} left.` : hard ? `Hard mode, ${until}.` : 'No session.'} />
      </View>

      <View style={{ alignItems: 'center', marginTop: SPACE.s32 }}>
        <T v="numeral" color={c.accent} accessibilityLabel={`${formatSaved(saved)} saved today`}>
          {formatSaved(saved)}
        </T>
        <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
          saved today
        </T>
      </View>

      <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.xxl }}>
        <StatTile value={decided === 0 ? '–' : `${Math.round(holdRate(state.stats) * 100)}%`} caption="hold" data />
        <StatTile value={state.stats.streak} caption="streak" data />
      </View>

      <View style={{ marginTop: SPACE.xxl, gap: SPACE.md }}>
        {session ? (
          <>
            {!unlocked && <PrimaryButton label="Pass a card, unlock 15 min" onPress={() => router.push('/unlock')} />}
            <PrimaryButton label="End session" onPress={end} style={unlocked ? undefined : { backgroundColor: c.surface2, shadowOpacity: 0 }} />
          </>
        ) : (
          <PrimaryButton label="Start session" onPress={() => start(25)} />
        )}
      </View>

      <Pressable onPress={() => router.push('/sessions')} style={{ marginTop: SPACE.lg }}>
        <T v="bodySm" color={c.fgMuted}>
          {state.settings.hardMode.enabled && state.settings.hardMode.schedule ? `Hard mode ${describeSchedule(state.settings.hardMode.schedule)}.` : state.settings.hardMode.enabled ? 'Hard mode is always on.' : 'No study hours set. Tap to add.'}
        </T>
      </Pressable>
      <Pressable onPress={() => router.push('/blocked-apps')} style={{ marginTop: SPACE.sm }}>
        <T v="bodySm" color={c.fgMuted}>
          {state.blockedAppCount ? `${state.blockedAppCount} apps shielded during sessions.` : 'No apps picked yet. Tap to choose.'}
        </T>
      </Pressable>
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
