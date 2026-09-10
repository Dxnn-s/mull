import React from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EXAM_WEEK, SCHOOL_NIGHTS } from '@mull/core/schedule';
import { useStore } from '@/store';
import { GUTTER, RADIUS, SPACE, useTheme } from '@/theme';
import { Rule, T } from '@/ui';
import { describeSchedule } from './index';

export default function Sessions() {
  const { state, update } = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hm = state.settings.hardMode;
  const setHm = (patch: Partial<typeof hm>) => update({ settings: { ...state.settings, hardMode: { ...hm, ...patch } } });

  function start(minutes: number) {
    update({ session: { startedAt: Date.now(), endsAt: Date.now() + minutes * 60_000, unlockUntil: null } });
    router.push('/');
  }
  function untilEleven() {
    const end = new Date();
    end.setHours(23, 0, 0, 0);
    if (end.getTime() < Date.now()) end.setDate(end.getDate() + 1);
    update({ session: { startedAt: Date.now(), endsAt: end.getTime(), unlockUntil: null } });
    router.push('/');
  }

  const examOn = hm.enabled && hm.schedule?.start === EXAM_WEEK.start && hm.schedule.days.length === 7;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + SPACE.lg, paddingHorizontal: GUTTER, paddingBottom: SPACE.s40 }}>
      <T v="display">Sessions.</T>

      <Rule label="start one" style={{ marginTop: SPACE.s32 }} />
      <View style={{ flexDirection: 'row', marginTop: SPACE.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border }}>
        {[
          { v: '25', k: 'minutes', on: () => start(25) },
          { v: '50', k: 'minutes', on: () => start(50) },
          { v: '11pm', k: 'until', on: untilEleven },
        ].map((q, i) => (
          <Pressable key={q.v} accessibilityRole="button" onPress={q.on} style={({ pressed }) => [{ flex: 1, paddingVertical: SPACE.lg, borderLeftWidth: i ? 1 : 0, borderLeftColor: c.border, backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
            <View style={{ paddingLeft: i ? SPACE.lg : 0 }}>
              <T v="numeralSm">{q.v}</T>
              <T v="label" color={c.fgMuted} style={{ marginTop: 2 }}>
                {q.k}
              </T>
            </View>
          </Pressable>
        ))}
      </View>

      <Rule label="study hours" style={{ marginTop: SPACE.s32 }} />
      <View style={{ marginTop: SPACE.lg }}>
        <T v="body">{hm.schedule ? describeSchedule(hm.schedule) : 'No hours set.'}</T>
        <View style={{ flexDirection: 'row', gap: SPACE.xl, marginTop: SPACE.sm }}>
          <Pressable onPress={() => setHm({ enabled: true, schedule: SCHOOL_NIGHTS })}>
            <T v="bodySm" color={c.accent} style={{ textDecorationLine: 'underline' }}>
              School nights
            </T>
          </Pressable>
          <Pressable onPress={() => setHm({ schedule: null })}>
            <T v="bodySm" color={c.fgMuted} style={{ textDecorationLine: 'underline' }}>
              Clear
            </T>
          </Pressable>
        </View>
      </View>

      <Rule label="teeth" style={{ marginTop: SPACE.s32 }} />
      <View style={{ marginTop: SPACE.sm }}>
        <Row label="Exam week" hint="every hour of every day" right={<Toggle value={!!examOn} onChange={(v) => setHm({ enabled: v ? true : hm.enabled, schedule: v ? EXAM_WEEK : null })} />} />
        <Row label="Hard mode" hint="no skip button" right={<Toggle value={hm.enabled} onChange={(v) => setHm({ enabled: v })} />} />
        <Row
          label="Block after"
          hint={`${hm.blockMinutes} minutes locked out`}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
              <Step label="−" onPress={() => setHm({ failsBeforeBlock: Math.max(1, hm.failsBeforeBlock - 1) })} />
              <T v="numeralSm">{`${hm.failsBeforeBlock}`}</T>
              <Step label="+" onPress={() => setHm({ failsBeforeBlock: Math.min(5, hm.failsBeforeBlock + 1) })} />
            </View>
          }
          last
        />
      </View>
    </ScrollView>
  );
}

/** Accent track, paper thumb, on every platform. react-native-web needs activeThumbColor or it paints its own teal. */
function Toggle({ value, onChange }: { value: boolean; onChange(v: boolean): void }) {
  const { c } = useTheme();
  const webOnly = { activeThumbColor: c.bg } as object;
  return <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.surface2 }} thumbColor={c.bg} ios_backgroundColor={c.surface2} {...webOnly} />;
}

function Row({ label, hint, right, last }: { label: string; hint?: string; right: React.ReactNode; last?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACE.lg, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border, gap: SPACE.lg }}>
      <View style={{ flex: 1 }}>
        <T v="body">{label}</T>
        {hint ? (
          <T v="bodySm" color={c.fgMuted}>
            {hint}
          </T>
        ) : null}
      </View>
      {right}
    </View>
  );
}

function Step({ label, onPress }: { label: string; onPress(): void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [{ width: 40, height: 40, borderRadius: RADIUS.chip, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border, backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
      <T v="body" color={c.fgMuted}>
        {label}
      </T>
    </Pressable>
  );
}
