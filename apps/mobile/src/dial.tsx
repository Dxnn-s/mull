import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';
import type { Seal } from './guilloche';
import { Rosette } from './rosette';
import { SPACE, useTheme } from './theme';
import { T } from './ui';

export type DialState = 'resting' | 'active' | 'shielded' | 'unlocked' | 'hard' | 'milestone';

export interface DialProps {
  state: DialState;
  /** 0..1 of the bezel that is filled. */
  progress: number;
  label: string;
  value: string;
  a11y: string;
  /** Drives the engraving. Same record always draws the same figure. */
  seal: Seal;
}

const TICKS = 60;
const AnimatedLine = Animated.createAnimatedComponent(Line);

/**
 * A bezel around a seal, not an orb. The outer ring is sixty tick marks, elapsed
 * in ink and the rest faint, every fifth longer, which is what makes it read as
 * an instrument. Inside sits the guilloché, which carries the record. The middle
 * stays clear paper so the numerals have somewhere quiet to sit.
 */
export function Dial({ state, progress, label, value, a11y, seal }: DialProps) {
  const { c, reduceMotion } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  // useWindowDimensions reports 0 on the first paint of a statically rendered
  // page, which collapsed the whole dial to 0x0 on a cold load. onLayout gives
  // the real width once the row is measured; the window is only a fallback.
  const [rowWidth, setRowWidth] = useState(0);
  const available = rowWidth || windowWidth || 360;

  const size = Math.min(Math.round(available * 0.74), 320);
  const box = size;
  const cx = box / 2;
  const cy = box / 2;
  const outer = box / 2 - 2;

  const uniform = state === 'hard';
  const filled = Math.round(Math.max(0, Math.min(1, progress)) * TICKS);
  const inkTick = state === 'unlocked' ? c.accent : state === 'resting' ? c.fgMuted : c.fg;

  const engraving = state === 'unlocked' || state === 'milestone' ? c.accent : c.fg;
  const engravingOpacity = state === 'resting' ? 0.28 : state === 'hard' ? 0.32 : 0.45;

  // One earned motion: the marks sweep on when the dial changes state.
  const sweep = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion) {
      sweep.setValue(1);
      return;
    }
    sweep.setValue(0);
    const a = Animated.timing(sweep, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [state, reduceMotion, sweep]);

  const marks = Array.from({ length: TICKS }, (_, i) => {
    const major = !uniform && i % 5 === 0;
    const len = uniform ? 9 : major ? 15 : 9;
    const on = i < filled;
    const angle = (i / TICKS) * 2 * Math.PI - Math.PI / 2;
    return {
      i,
      x1: cx + Math.cos(angle) * (outer - len),
      y1: cy + Math.sin(angle) * (outer - len),
      x2: cx + Math.cos(angle) * outer,
      y2: cy + Math.sin(angle) * outer,
      on,
      w: major ? 2 : 1.25,
    };
  });

  return (
    <View onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)} style={{ width: '100%', alignItems: 'center' }}>
      <View accessible accessibilityLabel={a11y} style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <Rosette
        size={box}
        innerRatio={0.4}
        outerRatio={0.86}
        seal={seal}
        stroke={engraving}
        strokeWidth={0.6}
        opacity={engravingOpacity}
        driftPerMinute={state === 'active' || state === 'unlocked' ? 6 : 0}
        reduceMotion={reduceMotion}
        austere={state === 'hard'}
      />

      <Svg width={box} height={box} style={{ position: 'absolute' }}>
        <G>
          {marks.map((m) => (
            <AnimatedLine
              key={m.i}
              x1={m.x1}
              y1={m.y1}
              x2={m.x2}
              y2={m.y2}
              stroke={m.on ? inkTick : c.fgFaint}
              strokeWidth={m.w}
              strokeLinecap="butt"
              opacity={sweep.interpolate({ inputRange: [Math.max(0, m.i / TICKS - 0.15), Math.min(1, m.i / TICKS + 0.01)], outputRange: [0, 1], extrapolate: 'clamp' })}
            />
          ))}
        </G>
        {(state === 'hard' || state === 'unlocked') && <Circle cx={cx} cy={cy} r={outer - 20} stroke={c.border} strokeWidth={1} fill="none" />}
        {state === 'milestone' && <Circle cx={cx} cy={cy} r={outer - 1} stroke={c.accentBorder} strokeWidth={1} fill="none" />}
      </Svg>

      <View style={{ alignItems: 'center', gap: SPACE.xs, backgroundColor: c.bg, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderRadius: 999 }}>
        {label ? (
          <T v="label" color={c.fgMuted}>
            {label}
          </T>
        ) : null}
          {value ? (
            <T v="numeralMd" color={state === 'resting' ? c.fgMuted : c.fg}>
              {value}
            </T>
          ) : null}
        </View>
      </View>
    </View>
  );
}
