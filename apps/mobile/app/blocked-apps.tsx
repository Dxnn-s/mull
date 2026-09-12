import React, { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { SHORTCUT_URL, mullUrl } from '@/config';
import { useStore } from '@/store';
import { GUTTER, RADIUS, SPACE, useTheme } from '@/theme';
import { Chip, PrimaryButton, Rule, SecondaryButton, T, TextButton } from '@/ui';

export default function BlockedApps() {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + SPACE.md, paddingHorizontal: GUTTER, paddingBottom: SPACE.s40 }}>
      <TextButton label="Back" onPress={() => router.back()} align="left" />
      {Platform.OS === 'web' ? <ShortcutsRecipe /> : <NativePicker />}
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.xl }}>
        Mull is never told which apps you picked. iOS keeps that list. All Mull hears is that something opened.
      </T>
    </ScrollView>
  );
}

/**
 * The web build cannot shield anything itself, so it hands the user the one
 * mechanism iOS gives away for free: a Shortcuts automation that fires when a
 * named app opens and sends them here instead. Soft, and skippable, but so is
 * every blocker; the friction is the product.
 *
 * Setup is the weak point, so it is built around a published iCloud Shortcut:
 * one tap adds it, and nothing has to be typed. Apple will not let anyone share
 * an Automation, only a Shortcut, so the trigger is still made by hand. Until a
 * link is published this falls back to the address people have to paste.
 */
function ShortcutsRecipe() {
  const { c } = useTheme();
  const [copied, setCopied] = useState(false);
  const url = mullUrl();
  const linked = SHORTCUT_URL.length > 0;

  const steps: Array<[string, string]> = linked
    ? [
        ['Add the shortcut', 'The button above. It saves one called Mull to your phone.'],
        ['Open Shortcuts, Automation tab', 'Tap the plus at the top right.'],
        ['Choose App, then your AI apps', 'ChatGPT, Claude and Gemini in the same automation.'],
        ['Run Immediately', 'Leave Is Opened selected and turn Notify When Run off.'],
        ['Choose Run Shortcut, pick Mull', 'Tap Done. That is the whole thing.'],
      ]
    : [
        ['Open Shortcuts, Automation tab', 'It is on every iPhone. Tap the plus at the top right.'],
        ['Choose App, then your AI apps', 'ChatGPT, Claude and Gemini in the same automation.'],
        ['Run Immediately', 'Leave Is Opened selected and turn Notify When Run off.'],
        ['Add Open URLs', 'Paste the address below into it, then tap Done.'],
      ];

  return (
    <>
      <T v="display" style={{ marginTop: SPACE.sm }}>
        Set the block.
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        Set this up once. After that, tapping ChatGPT opens Mull first, and you answer a question to go on.
      </T>

      {linked && (
        <PrimaryButton label="Add the Mull shortcut" onPress={() => Linking.openURL(SHORTCUT_URL)} style={{ marginTop: SPACE.xl }} />
      )}

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

      {!linked && (
        <>
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
        </>
      )}

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
        {n ? `${n} app${n === 1 ? '' : 's'}, blocked whenever a session is running.` : 'Pick the apps to block while a session is running.'}
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
