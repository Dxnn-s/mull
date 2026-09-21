import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { RADIUS, SPACE, useTheme } from './theme';
import { T } from './ui';

/**
 * A guided run through the real app.
 *
 * The tutorial used to be four pages of prose with a button under each. People
 * do not read that, and it never showed them the thing it was describing. This
 * runs the actual app instead: it points at the real Start button, the user
 * taps it and a real session begins, it points at the real gate, they pass a
 * real card. Nothing here is a mock of a screen.
 *
 * Two rules came out of building it. The pointer never covers the thing it is
 * pointing at, and it never dims the rest of the app: a dim layer would make
 * the screen underneath look disabled, when the whole point is that it is live
 * and you are meant to touch it. And the unlock screen is a full screen modal,
 * which on iOS renders above anything mounted at the root, so that step uses an
 * inline banner instead of the pointer. Overlay for tabs, inline for modals.
 */
export interface TourStep {
  id: string;
  /** Route this step lives on. The tour navigates there itself. */
  route: string;
  /** Anchor to point at, or undefined to sit in the middle of the screen. */
  anchor?: string;
  title: string;
  body: string;
  /** 'tap' waits for the anchor to be pressed, 'next' shows a button, 'pass' waits for a passed card. */
  advance: 'tap' | 'next' | 'pass';
  cta?: string;
}

export const TOUR: TourStep[] = [
  {
    id: 'start',
    route: '/',
    anchor: 'start-session',
    title: 'Start a session.',
    body: 'A session is the stretch of time Mull guards. Tap it and one really starts, this is not a picture.',
    advance: 'tap',
  },
  {
    id: 'dial',
    route: '/',
    anchor: 'dial',
    title: 'That is it running.',
    body: 'The ring counts the session down. It is the same dial you will glance at every day.',
    advance: 'next',
    cta: 'Next',
  },
  {
    id: 'gate',
    route: '/',
    anchor: 'pass-card',
    title: 'Now the gate.',
    body: 'Reaching for ChatGPT lands you here. Tap it and go through a real one.',
    advance: 'tap',
  },
  {
    id: 'passed',
    route: '/',
    anchor: 'dial',
    title: 'Unlocked.',
    body: 'ChatGPT would open now, for fifteen minutes. When that runs out, the gate comes back.',
    advance: 'next',
    cta: 'Last thing',
  },
  {
    id: 'block',
    route: '/you',
    anchor: 'blocked-apps',
    title: 'Set the block.',
    body: 'This is the part that makes tapping ChatGPT open Mull instead. About a minute, once.',
    advance: 'next',
    cta: 'Done',
  },
];

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourValue {
  step: TourStep | null;
  index: number;
  active: boolean;
  start(): void;
  stop(): void;
  next(): void;
  /** Called by an anchor that was pressed, and by the gate when a card passes. */
  signal(kind: 'tap' | 'pass', anchor?: string): void;
  register(id: string, rect: Rect | null): void;
  rects: Record<string, Rect>;
}

const Ctx = createContext<TourValue | null>(null);

export function useTour(): TourValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTour outside TourProvider');
  return v;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState(-1);
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const active = index >= 0 && index < TOUR.length;
  const step = active ? TOUR[index]! : null;

  const register = useCallback((id: string, rect: Rect | null) => {
    setRects((prev) => {
      if (!rect) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      const old = prev[id];
      if (old && old.x === rect.x && old.y === rect.y && old.width === rect.width && old.height === rect.height) return prev;
      return { ...prev, [id]: rect };
    });
  }, []);

  const next = useCallback(() => setIndex((i) => (i + 1 >= TOUR.length ? -1 : i + 1)), []);

  const signal = useCallback(
    (kind: 'tap' | 'pass', anchor?: string) => {
      setIndex((i) => {
        const s = TOUR[i];
        if (!s) return i;
        if (s.advance === 'tap' && kind === 'tap' && s.anchor === anchor) return i + 1 >= TOUR.length ? -1 : i + 1;
        if (s.advance === 'pass' && kind === 'pass') return i + 1 >= TOUR.length ? -1 : i + 1;
        // Tapping the gate button hands off to the unlock modal; the tour waits
        // there and picks up again once the card is passed.
        if (s.id === 'gate' && kind === 'pass') return i + 1 >= TOUR.length ? -1 : i + 1;
        return i;
      });
    },
    [],
  );

  const value = useMemo<TourValue>(
    () => ({ step, index, active, start: () => setIndex(0), stop: () => setIndex(-1), next, signal, register, rects }),
    [step, index, active, next, signal, register, rects],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Attach to whatever the tour should point at. Returns props to spread, so a
 * component does not have to know anything about the tour to be pointed at.
 */
export function useTourAnchor(id: string) {
  const { register, active } = useTour();
  const ref = useRef<View | null>(null);

  const measure = useCallback(() => {
    if (!active) return;
    const node = ref.current;
    if (!node?.measureInWindow) return;
    node.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) register(id, { x, y, width, height });
    });
  }, [active, id, register]);

  useEffect(() => {
    if (!active) return;
    // Measure after layout settles, and again shortly after in case a font or
    // an image shifted the row.
    const a = setTimeout(measure, 60);
    const b = setTimeout(measure, 400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [active, measure]);

  return { ref, onLayout: measure, collapsable: false } as const;
}

/** Wrap an anchor so pressing it can advance a 'tap' step. */
export function tourPress(id: string, signal: TourValue['signal'], onPress?: () => void) {
  return () => {
    signal('tap', id);
    onPress?.();
  };
}

/**
 * The pointer. Mounted once at the root, above the Stack. Paper and ink, a
 * hairline outline on the target and a card beside it, no dim layer.
 */
export function Coachmark() {
  const { c } = useTheme();
  const { step, index, active, next, stop, rects } = useTour();
  const router = useRouter();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;

  // The step owns the route, so the tour walks the app rather than asking the
  // user to find each screen.
  useEffect(() => {
    if (!step) return;
    if (pathname !== step.route) router.replace(step.route as never);
  }, [step, pathname, router]);

  const rect = step?.anchor ? rects[step.anchor] : undefined;
  const ready = !step?.anchor || !!rect;

  useEffect(() => {
    fade.setValue(0);
    if (!active || !ready) return;
    const a = Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [active, ready, index, fade]);

  if (!active || !step || !ready) return null;
  // The gate step hands off to a full screen modal, which renders above this on
  // iOS. The banner inside unlock.tsx takes over there.
  if (pathname !== step.route) return null;

  const pad = 6;
  const below = !rect || rect.y + rect.height + 180 < height;
  const cardTop = rect ? (below ? rect.y + rect.height + pad + 10 : Math.max(24, rect.y - 190)) : height / 2 - 90;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      {rect && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: rect.x - pad,
            top: rect.y - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            borderWidth: 1.5,
            borderColor: c.accent,
            borderRadius: RADIUS.card + 2,
            opacity: fade,
          }}
        />
      )}

      <Animated.View
        style={{
          position: 'absolute',
          left: SPACE.lg,
          right: SPACE.lg,
          top: cardTop,
          backgroundColor: c.bg,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: RADIUS.card,
          padding: SPACE.lg,
          opacity: fade,
          transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
          // A plain hairline card would vanish against paper, so it gets the one
          // shadow in the app. It is floating above a live screen; it should say so.
          ...Platform.select({
            web: { boxShadow: '0 6px 24px rgba(0,0,0,0.10)' },
            default: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
          }),
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T v="label" color={c.accent}>
            {`step ${index + 1} of ${TOUR.length}`}
          </T>
          <Pressable onPress={stop} hitSlop={10}>
            <T v="label" color={c.fgMuted}>
              skip
            </T>
          </Pressable>
        </View>

        <T v="body" style={{ marginTop: SPACE.sm, fontWeight: '600' }}>
          {step.title}
        </T>
        <T v="bodySm" color={c.fgMuted} style={{ marginTop: SPACE.xs }}>
          {step.body}
        </T>

        {step.advance === 'next' ? (
          <Pressable
            onPress={next}
            style={({ pressed }) => [
              { marginTop: SPACE.lg, backgroundColor: c.fg, paddingVertical: SPACE.md, alignItems: 'center', borderRadius: RADIUS.button, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <T v="body" color={c.bg} style={{ fontWeight: '600' }}>
              {step.cta ?? 'Next'}
            </T>
          </Pressable>
        ) : (
          <T v="label" color={c.fgFaint} style={{ marginTop: SPACE.md }}>
            {step.advance === 'pass' ? 'pass the card to go on' : 'tap the highlighted button'}
          </T>
        )}
      </Animated.View>
    </View>
  );
}
