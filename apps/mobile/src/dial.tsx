import React, { useEffect, useRef } from 'react';
import { Animated, Easing, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';
import { SPACE, useTheme } from './theme';
import { T } from './ui';

export type DialState = 'resting' | 'active' | 'shielded' | 'unlocked' | 'hard' | 'milestone';

export interface DialProps {
  state: DialState;
  /** 0..1 of the ring that is filled. */
  progress: number;
  label: string;
  value: string;
  a11y: string;
}

const TICKS = 60;
const AnimatedLine = Animated.createAnimatedComponent(Line);

/**
 * A bezel, not an orb. Sixty tick marks around a circle; elapsed ones are ink,
 * the rest are faint. Every fifth tick is longer, which is what makes it read as
 * an instrument instead of a progress ring. No fill, no gradient, no glow.
 *
 * State reads through the marks: hard mode drops the long-tick rhythm and adds
 * an inner rule (tighter, more clinical), unlocked draws the filled arc in accent
 * with an inner rule, milestone adds an outer hairline.
 */
export function Dial({ state, progress, label, value, a11y }: DialProps) {
  const { c, reduceMotion } = useTheme();
  const { width } = useWindowDimensions();

  const size = Math.min(Math.round(width * 0.70), 300);
  const box = size;
  const cx = box / 2;
  const cy = box / 2;
  const outer = box / 2 - 2;

  const uniform = state === 'hard';
  const filled = Math.round(Math.max(0, Math.min(1, progress)) * TICKS);
  const inkTick = state === 'unlocked' ? c.accent : state === 'resting' ? c.fgMuted : c.fg;

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
    const x1 = cx + Math.cos(angle) * (outer - len);
    const y1 = cy + Math.sin(angle) * (outer - len);
    const x2 = cx + Math.cos(angle) * outer;
    const y2 = cy + Math.sin(angle) * outer;
    return { i, x1, y1, x2, y2, on, major, w: major ? 2 : 1.25 };
  });

  return (
    <View accessible accessibilityLabel={a11y} style={{ width: box, height: box, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
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
        {(state === 'hard' || state === 'unlocked') && <Circle cx={cx} cy={cy} r={outer - 24} stroke={c.border} strokeWidth={1} fill="none" />}
        {state === 'milestone' && <Circle cx={cx} cy={cy} r={outer - 1} stroke={c.accentBorder} strokeWidth={1} fill="none" />}
      </Svg>

      <View style={{ alignItems: 'center', gap: SPACE.xs }}>
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
  );
}
