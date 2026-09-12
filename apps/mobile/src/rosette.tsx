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
  /**
   * Draw a second engraving turning the other way. Where the two cross, the
   * interference walks slowly around the figure, which is what a real engine
   * turned dial does under moving light. Costs one more path.
   */
  moire?: boolean;
}

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

/**
 * The seal. One engraved spiral whose figure is derived from the record, so it
 * gains lobes as concepts are learned and deepens with a streak. Static by
 * default; during a session it turns about six degrees a minute, which is the
 * rate of a real rose engine and slow enough that you only notice it if you look.
 */
export function Rosette({ size, innerRatio, outerRatio, seal, stroke, strokeWidth = 0.6, opacity = 1, driftPerMinute = 0, reduceMotion = false, austere = false, moire = false }: RosetteProps) {
  const r = size / 2;
  const d = useMemo(() => {
    const p = paramsForSeal(seal, r * innerRatio, r * outerRatio);
    // 90 points per turn is smooth at phone sizes and keeps the path under ~3k commands.
    return rosettePath(r, r, austere ? { ...p, turns: p.turns + 8, amplitude: Math.max(0.9, p.amplitude - 0.7), resolution: 90 } : { ...p, resolution: 90 });
  }, [r, innerRatio, outerRatio, seal.concepts, seal.streak, austere]);

  // Second figure: a few more lobes and a shifted phase, so the two never sit
  // in register and the crossings travel instead of sitting still.
  const dCounter = useMemo(() => {
    if (!moire) return null;
    const p = paramsForSeal(seal, r * innerRatio, r * outerRatio);
    return rosettePath(r, r, { ...p, petals: p.petals + 3, phase: Math.PI / 3, resolution: 90 });
  }, [moire, r, innerRatio, outerRatio, seal.concepts, seal.streak]);

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
  const counterRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-216deg'] });

  return (
    <>
      {dCounter ? (
        <AnimatedSvg width={size} height={size} style={{ position: 'absolute', opacity: opacity * 0.55, transform: [{ rotate: counterRotate }] }} pointerEvents="none">
          <Path d={dCounter} fill="none" stroke={stroke} strokeWidth={strokeWidth * 0.8} strokeLinejoin="round" />
        </AnimatedSvg>
      ) : null}
      <AnimatedSvg width={size} height={size} style={{ position: 'absolute', opacity, transform: [{ rotate }] }} pointerEvents="none">
        <Path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
      </AnimatedSvg>
    </>
  );
}
