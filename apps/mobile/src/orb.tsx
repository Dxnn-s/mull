import React, { useEffect, useRef } from 'react';
import { Animated, Easing, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { SPACE, useTheme } from './theme';
import { T } from './ui';

export type OrbState = 'resting' | 'active' | 'shielded' | 'unlocked' | 'hard' | 'milestone';

export interface OrbProps {
  state: OrbState;
  /** 0..1 ring progress. */
  progress: number;
  label: string;
  value: string;
  /** Spoken description for VoiceOver. */
  a11y: string;
}

/**
 * The hero. Three layers per the spec: halo (ambient alpha), core (identity gradient),
 * ring (quantity, clock driven). State reads through layer changes, not hue changes,
 * so palette and mode switching stay free. Reduced motion: no breathe, no pulse.
 */
export function Orb({ state, progress, label, value, a11y }: OrbProps) {
  const { c, mode, reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.round(width * 0.62);
  const r = size / 2;
  const ringR = r + 14;
  const ringW = state === 'hard' ? 3 : 6;
  const box = (ringR + ringW) * 2 + 8;
  const circ = 2 * Math.PI * ringR;
  const dash = Math.max(0, Math.min(1, progress)) * circ;

  const breathe = useRef(new Animated.Value(1)).current;
  const halo = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    breathe.stopAnimation();
    breathe.setValue(1);
    if (reduceMotion || state === 'hard' || state === 'shielded' || state === 'milestone') return;
    const period = state === 'unlocked' ? 3000 : 4000;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.02, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, reduceMotion, breathe]);

  useEffect(() => {
    if (state !== 'shielded' || reduceMotion) return;
    halo.setValue(1);
    Animated.sequence([
      Animated.timing(halo, { toValue: 2.2 / 1.9, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(halo, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [state, reduceMotion, halo]);

  const haloAlpha = state === 'hard' ? 0 : state === 'resting' ? 0.1 : mode === 'light' ? 0.1 : 0.18;
  const coreOpacity = state === 'resting' ? 0.7 : 1;
  const highlight = state === 'unlocked' ? mix(c.accentCore, c.live) : state === 'shielded' ? c.accentBright : mode === 'dark' ? c.accentCore : c.accentBright;
  const terminator = mode === 'dark' ? c.bg : 'rgba(20,16,8,0.18)';
  const arc = state === 'unlocked' ? c.live : state === 'hard' || mode === 'light' ? c.accent : c.accentBright;

  return (
    <View accessible accessibilityLabel={a11y} style={{ alignItems: 'center', justifyContent: 'center', width: box, height: box, alignSelf: 'center' }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size * 1.9, height: size * 1.9, transform: [{ scale: halo }] }}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c.accent} stopOpacity={haloAlpha} />
              <Stop offset="1" stopColor={c.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill="url(#halo)" />
        </Svg>
      </Animated.View>

      <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} style={{ position: 'absolute' }}>
        <Circle cx={box / 2} cy={box / 2} r={ringR} stroke={c.border} strokeWidth={ringW} fill="none" />
        {dash > 0 && (
          <Circle
            cx={box / 2}
            cy={box / 2}
            r={ringR}
            stroke={arc}
            strokeWidth={ringW}
            fill="none"
            strokeLinecap={state === 'hard' ? 'butt' : 'round'}
            strokeDasharray={`${dash} ${circ}`}
            transform={`rotate(-90 ${box / 2} ${box / 2})`}
          />
        )}
        {state === 'milestone' && <Circle cx={box / 2} cy={box / 2} r={ringR + 8} stroke={c.accentBright} strokeWidth={2} fill="none" />}
      </Svg>

      <Animated.View style={{ width: size, height: size, transform: [{ scale: breathe }], opacity: coreOpacity }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="core" cx="35%" cy="32%" r="70%">
              <Stop offset="0" stopColor={highlight} />
              <Stop offset="0.45" stopColor={c.accent} />
              <Stop offset="1" stopColor={terminator} stopOpacity={state === 'hard' ? 1 : 0.6} />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill="url(#core)" />
        </Svg>
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: SPACE.xs }}>
          <T v="label" color="rgba(10,10,14,0.75)">
            {label}
          </T>
          <T v="numeralSm" color="#0a0a0e">
            {value}
          </T>
        </View>
      </Animated.View>
    </View>
  );
}

/** Cheap hex mix toward a second color at 50%. */
function mix(a: string, b: string): string {
  const pa = hex(a);
  const pb = hex(b);
  if (!pa || !pb) return a;
  const m = pa.map((x, i) => Math.round((x + pb[i]!) / 2));
  return `#${m.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
function hex(s: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(s);
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
