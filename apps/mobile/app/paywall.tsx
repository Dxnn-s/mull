import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUTTER, SPACE, useTheme } from '@/theme';
import { PrimaryButton, T, TextButton } from '@/ui';

const PLANS = [
  { id: 'yearly', name: 'Yearly', price: '$29.99', sub: '$2.50 a month' },
  { id: 'monthly', name: 'Monthly', price: '$4.99', sub: 'cancel whenever' },
  { id: 'once', name: 'One time', price: '$59.99', sub: 'yours for good' },
];

/** Session A: layout only. StoreKit via RevenueCat lands in Session C (app-plan.md). */
export default function Paywall() {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState('yearly');
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + SPACE.md, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + SPACE.s32 }}>
      <TextButton label="Close" onPress={() => router.back()} align="right" />

      <T v="display" style={{ marginTop: SPACE.s56 }}>
        Keep the block on.
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.md, maxWidth: 300 }}>
        Free gives you one session a day and one subject. Everything else is unlimited.
      </T>

      <View style={{ marginTop: SPACE.s40, borderTopWidth: 1, borderColor: c.border }}>
        {PLANS.map((p) => {
          const selected = plan === p.id;
          return (
            <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setPlan(p.id)} style={{ paddingVertical: SPACE.lg, borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md, flex: 1 }}>
                <View style={{ width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: selected ? c.accent : c.fgFaint, backgroundColor: selected ? c.accent : 'transparent' }} />
                <View>
                  <T v="body">{p.name}</T>
                  <T v="bodySm" color={c.fgMuted}>
                    {p.sub}
                  </T>
                </View>
              </View>
              <T v="numeralSm" color={selected ? c.accent : c.fgMuted}>
                {p.price}
              </T>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton label="Continue" onPress={() => router.back()} style={{ marginTop: SPACE.s32 }} />
      <T v="label" color={c.fgFaint} style={{ marginTop: SPACE.xl, textAlign: 'center' }}>
        restore · terms · privacy
      </T>
    </ScrollView>
  );
}
