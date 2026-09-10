import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, PixelRatio, type TextStyle } from 'react-native';

/**
 * Paper and ink. Light is the default: warm stock, ink type, one accent used
 * sparingly, hairline rules instead of filled cards. No glow, no second accent,
 * no dashboard cyan. The register is an architect's planner, not an AI console.
 *
 * Light hexes are the brand anchor exactly (Operator Amber light #f7f3e9/#b45309,
 * Atelier Sage light #f1f0e6/#3f6212). Dark is warmed off the anchor's near-black
 * so it reads as dark card stock rather than a void.
 */
export type Palette = 'amber' | 'sage';
export type Mode = 'dark' | 'light';

export interface Colors {
  /** Paper. */
  bg: string;
  /** A panel, barely separated from the paper. */
  surface: string;
  /** Pressed or inset fill. */
  surface2: string;
  /** Hairline rule. */
  border: string;
  /** Ink. */
  fg: string;
  fgMuted: string;
  /** Tick marks, empty pips, disabled. */
  fgFaint: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  danger: string;
  /** Grain opacity for this mode. */
  grain: number;
}

const LIGHT = {
  surface: 'rgba(26,23,16,0.035)',
  surface2: 'rgba(26,23,16,0.075)',
  border: 'rgba(26,23,16,0.13)',
  fg: '#1a1710',
  fgMuted: 'rgba(26,23,16,0.58)',
  fgFaint: 'rgba(26,23,16,0.20)',
  danger: '#9f1239',
  grain: 0.02,
};
const DARK = {
  surface: 'rgba(240,235,224,0.045)',
  surface2: 'rgba(240,235,224,0.09)',
  border: 'rgba(240,235,224,0.14)',
  fg: '#f0ebe0',
  fgMuted: 'rgba(240,235,224,0.56)',
  fgFaint: 'rgba(240,235,224,0.18)',
  danger: '#e2818f',
  grain: 0.05,
};

export const COLORS: Record<Palette, Record<Mode, Colors>> = {
  amber: {
    light: { ...LIGHT, bg: '#f8f4e8', accent: '#b45309', accentSoft: 'rgba(180,83,9,0.10)', accentBorder: 'rgba(180,83,9,0.32)' },
    dark: { ...DARK, bg: '#14120d', accent: '#dd9440', accentSoft: 'rgba(221,148,64,0.13)', accentBorder: 'rgba(221,148,64,0.32)' },
  },
  sage: {
    light: { ...LIGHT, bg: '#f2f1e4', accent: '#3f6212', accentSoft: 'rgba(63,98,18,0.10)', accentBorder: 'rgba(63,98,18,0.32)' },
    dark: { ...DARK, bg: '#101310', accent: '#96b055', accentSoft: 'rgba(150,176,85,0.13)', accentBorder: 'rgba(150,176,85,0.32)' },
  },
};

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, s32: 32, s40: 40, s56: 56, s72: 72 } as const;
/** Print radii. A corner you can notice is a corner that dates the app. */
export const RADIUS = { chip: 3, card: 4, sheet: 16, button: 3, full: 999 } as const;
export const GUTTER = 22;

export const FONT = {
  serif: 'InstrumentSerif_400Regular',
  sans: 'SpaceGrotesk_400Regular',
  sansMedium: 'SpaceGrotesk_500Medium',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

/**
 * The big numbers are the serif, not neon mono. Mono is reserved for small
 * technical labels and anything that ticks (a countdown needs tabular figures).
 */
export function typeRoles(scale: number): Record<
  'display' | 'title' | 'section' | 'body' | 'bodySm' | 'label' | 'numeralLg' | 'numeralMd' | 'numeralSm' | 'button',
  TextStyle
> {
  const sans = Math.min(scale, 1.6);
  const serif = Math.min(scale, 1.3);
  const mono = Math.min(scale, 1.2);
  return {
    display: { fontFamily: FONT.serif, fontSize: 38 * serif, lineHeight: 42 * serif },
    title: { fontFamily: FONT.serif, fontSize: 27 * serif, lineHeight: 33 * serif },
    section: { fontFamily: FONT.sansMedium, fontSize: 17 * sans, lineHeight: 23 * sans },
    body: { fontFamily: FONT.sans, fontSize: 16 * sans, lineHeight: 25 * sans },
    bodySm: { fontFamily: FONT.sans, fontSize: 13.5 * sans, lineHeight: 20 * sans },
    label: { fontFamily: FONT.monoMedium, fontSize: 10.5 * mono, lineHeight: 14 * mono, letterSpacing: 1.3, textTransform: 'uppercase' },
    numeralLg: { fontFamily: FONT.serif, fontSize: 64, lineHeight: 66 },
    numeralMd: { fontFamily: FONT.monoMedium, fontSize: 30, lineHeight: 32, fontVariant: ['tabular-nums'] },
    numeralSm: { fontFamily: FONT.serif, fontSize: 26, lineHeight: 30 },
    button: { fontFamily: FONT.sansMedium, fontSize: 16.5 * sans, lineHeight: 22 * sans },
  };
}

export interface Theme {
  palette: Palette;
  mode: Mode;
  c: Colors;
  t: ReturnType<typeof typeRoles>;
  reduceMotion: boolean;
  setPalette(p: Palette): void;
  setMode(m: Mode): void;
}

const ThemeCtx = createContext<Theme | null>(null);

export function ThemeProvider({ palette, mode, onChange, children }: { palette: Palette; mode: Mode; onChange(p: Palette, m: Mode): void; children: React.ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);
  const value = useMemo<Theme>(
    () => ({
      palette,
      mode,
      c: COLORS[palette][mode],
      t: typeRoles(PixelRatio.getFontScale()),
      reduceMotion,
      setPalette: (p) => onChange(p, mode),
      setMode: (m) => onChange(palette, m),
    }),
    [palette, mode, reduceMotion, onChange],
  );
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeCtx);
  if (!t) throw new Error('useTheme outside ThemeProvider');
  return t;
}
