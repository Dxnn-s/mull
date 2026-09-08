import React from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EXAM_WEEK, SCHOOL_NIGHTS } from '@mull/core/schedule';
import { useStore } from '@/store';
import { RADIUS, SPACE, useTheme } from '@/theme';
import { Card, T } from '@/ui';
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
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + SPACE.lg, paddingHorizontal: SPACE.xl, paddingBottom: SPACE.s40 }}>
      <T v="display">Sessions.</T>

      <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.s32 }}>
        quick start
      </T>
      <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md }}>
        {[
          { v: '25', k: 'min', on: () => start(25) },
          { v: '50', k: 'min', on: () => start(50) },
          { v: '11pm', k: 'until', on: untilEleven },
        ].map((q) => (
          <Pressable key={q.v} accessibilityRole="button" onPress={q.on} style={{ flex: 1 }}>
            <Card style={{ alignItems: 'center', paddingVertical: SPACE.lg }}>
              <T v="numeralSm">{q.v}</T>
              <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.xs }}>
                {q.k}
              </T>
            </Card>
          </Pressable>
        ))}
      </View>

      <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.s32 }}>
        study hours
      </T>
      <Card style={{ marginTop: SPACE.md, gap: SPACE.md }}>
        <Row label={hm.schedule ? describeSchedule(hm.schedule) : 'No hours set'} right={<Text_ color={c.fgMuted}>{hm.schedule ? '' : ''}</Text_>} />
        <Pressable onPress={() => setHm({ enabled: true, schedule: SCHOOL_NIGHTS })}>
          <T v="bodySm" color={c.accent}>
            Use school nights (Mon to Thu, 7 to 11 pm)
          </T>
        </Pressable>
        <Pressable onPress={() => setHm({ schedule: null })}>
          <T v="bodySm" color={c.fgMuted}>
            Clear hours
          </T>
        </Pressable>
      </Card>

      <Card style={{ marginTop: SPACE.md, gap: SPACE.lg }}>
        <Row label="Exam week" right={<Toggle value={!!examOn} onChange={(v) => setHm({ enabled: v ? true : hm.enabled, schedule: v ? EXAM_WEEK : null })} />} />
        <Row label="Hard mode" right={<Toggle value={hm.enabled} onChange={(v) => setHm({ enabled: v })} />} />
        <Row
          label="Block after"
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
              <Step label="−" onPress={() => setHm({ failsBeforeBlock: Math.max(1, hm.failsBeforeBlock - 1) })} />
              <T v="numeralSm">{`${hm.failsBeforeBlock}`}</T>
              <Step label="+" onPress={() => setHm({ failsBeforeBlock: Math.min(5, hm.failsBeforeBlock + 1) })} />
              <T v="bodySm" color={c.fgMuted}>
                misses
              </T>
            </View>
          }
        />
      </Card>
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.md }}>
        Hard mode means no skip.
      </T>
    </ScrollView>
  );
}

/** Accent track, pale thumb, on every platform. react-native-web needs activeThumbColor or it paints its own teal. */
function Toggle({ value, onChange }: { value: boolean; onChange(v: boolean): void }) {
  const { c } = useTheme();
  const webOnly = { activeThumbColor: '#ececf1' } as object;
  return <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.surface2 }} thumbColor="#ececf1" ios_backgroundColor={c.surface2} {...webOnly} />;
}

function Row({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
      <T v="body">{label}</T>
      {right}
    </View>
  );
}
function Text_({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <T v="bodySm" color={color}>
      {children}
    </T>
  );
}
function Step({ label, onPress }: { label: string; onPress(): void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ width: 36, height: 36, borderRadius: RADIUS.chip, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border }}>
      <T v="body">{label}</T>
    </Pressable>
  );
}
