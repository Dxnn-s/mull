import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { PROVIDER_INFO, authorizeUrl, challengeFor, codeFromCallback, createVerifier, exchangeCode } from '@mull/core';
import type { ProviderId } from '@mull/core';
import { mullUrl } from '@/config';
import { useStore } from '@/store';
import { GUTTER, RADIUS, SPACE, useTheme } from '@/theme';
import { Chip, PrimaryButton, Rule, SecondaryButton, T, TextButton } from '@/ui';

/** Where the verifier waits while the user is away on openrouter.ai. */
const VERIFIER_KEY = 'mull.pkceVerifier';

/** Providers you connect by hand. OpenRouter is separate because it has a flow. */
const PASTE_PROVIDERS: ProviderId[] = ['openai', 'anthropic', 'gemini'];

/**
 * Linking an AI account. The whole product runs on the user's own provider, so
 * this screen is the difference between a demo and a thing that works, and it
 * is the first place a phone can make people give up.
 *
 * OpenRouter gets the top of the screen because it is the only one of the four
 * with an OAuth flow, so it is the only one where connecting is a tap instead
 * of typing a forty character secret with a thumb. The rest keep a paste box
 * with a real Paste button, because nobody should be typing a key either.
 */
export default function ProviderScreen() {
  const { state, update } = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<ProviderId>(state.settings.provider === 'mock' ? 'openai' : state.settings.provider);
  const [typed, setTyped] = useState('');

  const current = state.settings;
  const connected = current.provider !== 'mock' && current.apiKey.length > 0;

  function save(provider: ProviderId, apiKey: string) {
    update({ settings: { ...current, provider, apiKey, model: '' } });
  }

  // Coming back from openrouter.ai, the code is on our own URL. Exchange it and
  // clear it off, or a reload would retry a code that is already spent.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const code = codeFromCallback(window.location.href);
    if (!code) return;
    const verifier = window.localStorage.getItem(VERIFIER_KEY);
    window.history.replaceState({}, '', window.location.pathname);
    if (!verifier) {
      setError('That sign in started somewhere else. Try again from this screen.');
      return;
    }
    setBusy(true);
    exchangeCode(code, verifier)
      .then((key) => {
        window.localStorage.removeItem(VERIFIER_KEY);
        save('openrouter', key);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
    // Runs once on mount; the code is consumed immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connectOpenRouter() {
    setError(null);
    try {
      const verifier = createVerifier();
      const challenge = await challengeFor(verifier);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem(VERIFIER_KEY, verifier);
      }
      await Linking.openURL(authorizeUrl(`${mullUrl()}/provider`, challenge));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function pasteKey() {
    const text = (await Clipboard.getStringAsync()).trim();
    if (!text) {
      setError('Nothing on the clipboard. Copy your key first.');
      return;
    }
    setTyped(text);
    setError(null);
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + SPACE.md, paddingHorizontal: GUTTER, paddingBottom: SPACE.s40 }}>
      <TextButton label="Back" onPress={() => router.back()} align="left" />

      <T v="display" style={{ marginTop: SPACE.sm }}>
        Link your AI.
      </T>
      <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
        Mull writes your cards with your own AI account, so the cost is yours and it is tiny. There is no Mull account to make.
      </T>

      <View style={{ marginTop: SPACE.xl, borderWidth: 1, borderColor: connected ? c.accentBorder : c.border, backgroundColor: connected ? c.accentSoft : 'transparent', borderRadius: RADIUS.card, padding: SPACE.lg }}>
        <T v="label" color={connected ? c.accent : c.fgMuted}>
          {connected ? 'connected' : 'not connected'}
        </T>
        <T v="body" style={{ marginTop: SPACE.xs }}>
          {connected ? `${PROVIDER_INFO[current.provider].label}, key ending ${current.apiKey.slice(-4)}` : 'Running on demo cards.'}
        </T>
      </View>

      {error && (
        <T v="bodySm" color={c.danger} style={{ marginTop: SPACE.lg }}>
          {error}
        </T>
      )}

      <Rule label="one tap" style={{ marginTop: SPACE.s32 }} />
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.md }}>
        OpenRouter is the only one you can sign into. It reaches OpenAI, Anthropic and Google models with one login, and you top it up like a gift card.
      </T>
      {busy ? (
        <View style={{ marginTop: SPACE.lg, flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
          <ActivityIndicator color={c.accent} />
          <T v="bodySm" color={c.fgMuted}>
            Finishing sign in.
          </T>
        </View>
      ) : (
        <PrimaryButton label="Sign in with OpenRouter" onPress={connectOpenRouter} style={{ marginTop: SPACE.lg }} />
      )}

      <Rule label="or paste a key" style={{ marginTop: SPACE.s32 }} />
      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg, flexWrap: 'wrap' }}>
        {PASTE_PROVIDERS.map((p) => (
          <Chip key={p} label={PROVIDER_INFO[p].label} selected={picked === p} onPress={() => setPicked(p)} />
        ))}
      </View>
      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.md }}>
        {PROVIDER_INFO[picked].note}
      </T>

      <TextInput
        value={typed}
        onChangeText={setTyped}
        placeholder={PROVIDER_INFO[picked].keyHint}
        placeholderTextColor={c.fgFaint}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={{
          marginTop: SPACE.lg,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: RADIUS.card,
          paddingHorizontal: SPACE.lg,
          paddingVertical: SPACE.md,
          color: c.fg,
          fontFamily: 'GeistMono_400Regular',
          fontSize: 14,
        }}
      />
      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm }}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Paste" onPress={pasteKey} />
        </View>
        <View style={{ flex: 1 }}>
          <SecondaryButton
            label="Save key"
            onPress={() => {
              if (!typed.trim()) {
                setError('Paste a key first.');
                return;
              }
              save(picked, typed.trim());
              setTyped('');
              setError(null);
            }}
          />
        </View>
      </View>

      {connected && (
        <>
          <Rule label="disconnect" style={{ marginTop: SPACE.s32 }} />
          <SecondaryButton
            label="Go back to demo cards"
            onPress={() => {
              save('mock', '');
              setTyped('');
            }}
            style={{ marginTop: SPACE.lg }}
          />
        </>
      )}

      <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.s32 }}>
        The key stays on this phone. It is sent to your provider and nowhere else, and Mull has no server to send it to.
      </T>
    </ScrollView>
  );
}
