import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PROVIDER_INFO, isFreeModel } from '@mull/core';
import { useStore } from '@/store';
import { GUTTER, SPACE, useTheme } from '@/theme';
import { Rule, T, TextButton } from '@/ui';

/**
 * The data flow, in the order someone would worry about it.
 *
 * Written because the audience is mostly minors, the app holds an API key, and
 * the App Store will ask for a policy URL anyway. Every claim here is checked
 * against the code: there is no analytics package, no telemetry, and no fetch
 * outside the provider adapters. If any of that changes this page changes with
 * it, or it becomes the most dishonest screen in the app.
 */
export default function Privacy() {
  const { state } = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const linked = state.settings.provider !== 'mock' && state.settings.apiKey.trim().length > 0;
  // An empty model means the provider default, and for OpenRouter that default
  // is a free one. Checking the raw string meant this never fired for exactly
  // the people it was written for.
  const effectiveModel = state.settings.model || (linked ? PROVIDER_INFO[state.settings.provider].defaultModel : '');
  const free = linked && isFreeModel(effectiveModel);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + SPACE.md, paddingHorizontal: GUTTER, paddingBottom: SPACE.s40 }}>
      <TextButton label="Back" onPress={() => router.back()} align="left" />

      <T v="display" style={{ marginTop: SPACE.sm }}>
        What leaves this phone.
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        Short version: nothing, unless you link an AI account. There is no Mull account and no Mull server, so there is nowhere for it to go.
      </T>

      <Rule label="with nothing linked" style={{ marginTop: SPACE.s32 }} />
      <T v="body" style={{ marginTop: SPACE.lg }}>
        Every card is already in the app. Once it has loaded, Mull asks no provider anything, and it works in aeroplane mode. The site itself is hosted on Vercel, which keeps the usual web server logs of a page being loaded. Nothing else is sent.
      </T>

      <Rule label="with an account linked" style={{ marginTop: SPACE.s32 }} />
      <T v="body" style={{ marginTop: SPACE.lg }}>
        Your question and the name of the topic go to the provider you chose, using your key. That request goes straight from this phone to them. It does not pass through us, because there is no us to pass through.
      </T>
      {free && (
        <T v="bodySm" color={c.accent} style={{ marginTop: SPACE.md }}>
          You are on an OpenRouter free model. OpenRouter requires that free endpoints be allowed to log what they receive. If that bothers you, switch to a paid model or unlink.
        </T>
      )}

      <Rule label="kept on this phone" style={{ marginTop: SPACE.s32 }} />
      <View style={{ marginTop: SPACE.lg, gap: SPACE.md }}>
        {[
          'Your subjects, your settings, and your streak.',
          'Which concepts you have passed and when, so the ladder works.',
          'Your API key, if you linked one.',
        ].map((line) => (
          <View key={line} style={{ flexDirection: 'row', gap: SPACE.md }}>
            <View style={{ width: 16, paddingTop: 8 }}>
              <View style={{ width: 5, height: 5, backgroundColor: c.accent }} />
            </View>
            <T v="body" style={{ flex: 1 }}>
              {line}
            </T>
          </View>
        ))}
      </View>

      <Rule label="not kept" style={{ marginTop: SPACE.s32 }} />
      <T v="body" style={{ marginTop: SPACE.lg }}>
        What you type is never stored. What is stored is the name of the topic, like "osmosis", which comes from the model rather than from your words. When Mull says you asked something already today, it is comparing a short checksum of what you typed, not the text. A checksum is not meant to be reversed, though a short one like this is a speed bump rather than a lock.
      </T>
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.md }}>
        There is no analytics, no tracking, no crash reporting, and nothing is sold or shared. Nobody is counting how you use this.
      </T>

      <Rule label="getting rid of it" style={{ marginTop: SPACE.s32 }} />
      <T v="body" style={{ marginTop: SPACE.lg }}>
        Everything lives in this app on this device. Delete it, or clear the site data, and all of it is gone. There is no copy anywhere else to ask us to delete.
      </T>

      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.s40 }}>
        {linked
          ? `Linked to ${state.settings.provider}. Unlink any time from You, AI provider.`
          : 'Nothing is linked right now, so nothing is being sent anywhere.'}
      </T>
    </ScrollView>
  );
}
