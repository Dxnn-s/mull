import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { paramsForSeal, rosettePath, type Seal } from './guilloche';

export interface RosetteProps {
  size: number;
  /** Fraction of the radius left clear in the middle. */
  innerRatio: number;
  /** Fraction of the radius the engraving reaches. */
  outerRatio: number;
  seal: Seal;
  stroke: string;
  strokeWidth?: number;
  opacity?: number;
  /** Degrees per minute. 0 is still. Ignored under reduced motion. */
  driftPerMinute?: number;
  reduceMotion?: boolean;
  /** Tighter, shallower cut. Used by hard mode. */
  austere?: boolean;
}

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

/**
 * The seal. One engraved spiral whose figure is derived from the record, so it
 * gains lobes as concepts are learned and deepens with a streak. Static by
 * default; during a session it turns about six degrees a minute, which is the
 * rate of a real rose engine and slow enough that you only notice it if you look.
 */
export function Rosette({ size, innerRatio, outerRatio, seal, stroke, strokeWidth = 0.6, opacity = 1, driftPerMinute = 0, reduceMotion = false, austere = false }: RosetteProps) {
  const r = size / 2;
  const d = useMemo(() => {
    const p = paramsForSeal(seal, r * innerRatio, r * outerRatio);
    // 90 points per turn is smooth at phone sizes and keeps the path under ~3k commands.
    return rosettePath(r, r, austere ? { ...p, turns: p.turns + 8, amplitude: Math.max(0.9, p.amplitude - 0.7), resolution: 90 } : { ...p, resolution: 90 });
  }, [r, innerRatio, outerRatio, seal.concepts, seal.streak, austere]);

  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    spin.stopAnimation();
    spin.setValue(0);
    if (reduceMotion || driftPerMinute <= 0) return;
    const msPerTurn = (360 / driftPerMinute) * 60_000;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: msPerTurn, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [driftPerMinute, reduceMotion, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <AnimatedSvg width={size} height={size} style={{ position: 'absolute', opacity, transform: [{ rotate }] }} pointerEvents="none">
      <Path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </AnimatedSvg>
  );
}
