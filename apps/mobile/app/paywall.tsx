import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Orb } from '@/orb';
import { RADIUS, SPACE, useTheme } from '@/theme';
import { PrimaryButton, T, TextButton } from '@/ui';

const PLANS = [
  { id: 'yearly', name: 'Yearly', price: '$29.99', sub: '$2.50 a month' },
  { id: 'monthly', name: 'Monthly', price: '$4.99', sub: '' },
  { id: 'once', name: 'One time', price: '$59.99', sub: '' },
];

/** Session A: layout only. StoreKit via RevenueCat lands in Session C (app-plan.md). */
export default function Paywall() {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState('yearly');
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + SPACE.md, paddingHorizontal: SPACE.xl, paddingBottom: insets.bottom + SPACE.s32 }}>
      <TextButton label="✕" onPress={() => router.back()} style={{ alignItems: 'flex-end', paddingVertical: SPACE.sm }} />
      <View style={{ transform: [{ scale: 0.65 }], marginVertical: -SPACE.s40 }}>
        <Orb state="resting" progress={0} label="" value="" a11y="Mull" />
      </View>
      <T v="display" style={{ marginTop: SPACE.lg }}>
        Keep the block on.
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        Free gives you one session a day and one subject.
      </T>
      <View style={{ marginTop: SPACE.xxl, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
        {PLANS.map((p, i) => {
          const selected = plan === p.id;
          return (
            <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setPlan(p.id)} style={{ padding: SPACE.lg, backgroundColor: selected ? c.accentSoft : c.surface, borderTopWidth: i ? 1 : 0, borderTopColor: c.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <T v="body">{p.name}</T>
                {p.sub ? (
                  <T v="bodySm" color={c.fgMuted}>
                    {p.sub}
                  </T>
                ) : null}
              </View>
              <T v="numeralSm" color={selected ? c.accent : c.fg}>
                {p.price}
              </T>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton label="Continue" onPress={() => router.back()} style={{ marginTop: SPACE.xxl }} />
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.md, textAlign: 'center' }}>
        Restore · Terms · Privacy
      </T>
    </ScrollView>
  );
}
