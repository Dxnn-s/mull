import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '@/store';
import { GUTTER, RADIUS, SPACE, useTheme } from '@/theme';
import { Chip, Rule, SecondaryButton, T, TextButton } from '@/ui';

export default function BlockedApps() {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + SPACE.md, paddingHorizontal: GUTTER, paddingBottom: SPACE.s40 }}>
      <TextButton label="Back" onPress={() => router.back()} align="left" />
      {Platform.OS === 'web' ? <ShortcutsRecipe /> : <NativePicker />}
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.xl }}>
        Mull is never told which apps you picked. iOS hands back a sealed token, and a Shortcut only says that something opened.
      </T>
    </ScrollView>
  );
}

/**
 * The web build cannot shield anything itself, so it hands the user the one
 * mechanism iOS gives away for free: a Shortcuts automation that fires when a
 * named app opens and sends them here instead. Soft, and skippable, but so is
 * every blocker; the friction is the product.
 */
function ShortcutsRecipe() {
  const { c } = useTheme();
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.origin : 'https://mull.school';

  const steps: Array<[string, string]> = [
    ['Open Shortcuts', 'It is on every iPhone. Go to the Automation tab at the bottom.'],
    ['New automation', 'Tap the plus, then scroll down to App and choose it.'],
    ['Pick the apps', 'Choose ChatGPT, and add Claude and Gemini to the same automation.'],
    ['Is Opened', 'Leave that selected. Choose Run Immediately and turn Notify When Run off.'],
    ['New Blank Automation', 'Then add the action called Open URLs.'],
    ['Paste the address', 'Use the one below, then tap Done.'],
  ];

  return (
    <>
      <T v="display" style={{ marginTop: SPACE.sm }}>
        Set the block.
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        Set this up once. After that, opening ChatGPT sends you here first, and you pass a card to go on.
      </T>

      <Rule label="in shortcuts" style={{ marginTop: SPACE.s32 }} />
      <View style={{ marginTop: SPACE.lg }}>
        {steps.map(([head, body], i) => (
          <View key={head} style={{ flexDirection: 'row', gap: SPACE.lg, paddingVertical: SPACE.md, borderBottomWidth: i === steps.length - 1 ? 0 : 1, borderBottomColor: c.border }}>
            <T v="label" color={c.accent} style={{ width: 18, marginTop: 3 }}>
              {String(i + 1)}
            </T>
            <View style={{ flex: 1 }}>
              <T v="body">{head}</T>
              <T v="bodySm" color={c.fgMuted}>
                {body}
              </T>
            </View>
          </View>
        ))}
      </View>

      <Rule label="the address" style={{ marginTop: SPACE.s32 }} />
      <Pressable
        onPress={async () => {
          await Clipboard.setStringAsync(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        style={({ pressed }) => [{ marginTop: SPACE.lg, borderWidth: 1, borderColor: c.border, borderRadius: RADIUS.card, padding: SPACE.lg, backgroundColor: pressed ? c.surface2 : 'transparent' }]}
      >
        <T v="bodySm" style={{ fontFamily: 'GeistMono_400Regular' }} numberOfLines={2}>
          {url}
        </T>
        <T v="label" color={c.accent} style={{ marginTop: SPACE.sm }}>
          {copied ? 'copied' : 'tap to copy'}
        </T>
      </Pressable>

      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.lg }}>
        A Shortcut can be closed and the app reopened, so this is a speed bump rather than a wall. The real shield, the one iOS will not let a web app touch, arrives with the native build.
      </T>
    </>
  );
}

/**
 * Native placeholder. The real screen calls Apple's FamilyActivityPicker from the
 * Screen Time module (Session B) and renders the tokens with Apple's Label view.
 */
function NativePicker() {
  const { state, update } = useStore();
  const { c } = useTheme();
  const n = state.blockedAppCount;
  return (
    <>
      <T v="display" style={{ marginTop: SPACE.sm }}>
        Blocked apps.
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        {n ? `${n} app${n === 1 ? '' : 's'}, shielded whenever a session is running.` : 'Pick the apps to shield while a session is running.'}
      </T>

      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xxl }}>
        <Chip label="AI apps" selected={n === 3} onPress={() => update({ blockedAppCount: 3 })} />
        <Chip label="Exam week" selected={n === 6} onPress={() => update({ blockedAppCount: 6 })} />
      </View>

      <Rule label="picked" style={{ marginTop: SPACE.s32 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE.lg }}>
        {Array.from({ length: n }, (_, i) => (
          <View key={i} style={{ width: 66, height: 66, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accentBorder }} />
          </View>
        ))}
        <Pressable accessibilityRole="button" onPress={() => update({ blockedAppCount: n + 1 })} style={({ pressed }) => [{ width: 66, height: 66, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.fgFaint, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 }]}>
          <T v="label" color={c.fgMuted}>
            add
          </T>
        </Pressable>
      </View>

      {n > 0 && <SecondaryButton label="Clear the list" onPress={() => update({ blockedAppCount: 0 })} style={{ marginTop: SPACE.s32 }} />}
    </>
  );
}
