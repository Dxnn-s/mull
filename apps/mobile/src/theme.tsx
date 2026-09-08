import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, PixelRatio, type TextStyle } from 'react-native';

/**
 * Tokens from projects/mull/design/mobile-spec.md section 1. Same key names as
 * packages/core/src/theme.ts so the web and the app read side by side.
 */
export type Palette = 'amber' | 'sage';
export type Mode = 'dark' | 'light';

export interface Colors {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  fg: string;
  fgMuted: string;
  accent: string;
  accentBright: string;
  accentSoft: string;
  accentBorder: string;
  /** Orb core highlight, dark only. Never text. */
  accentCore: string;
  live: string;
  /** Numbers the user did not earn: counts, medians. Light mode uses dataStrong (spec footnote 1). */
  data: string;
  danger: string;
}

const DARK_BASE = {
  surface: 'rgba(255,255,255,0.04)',
  surface2: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.10)',
  fg: '#ececf1',
  fgMuted: 'rgba(236,236,241,0.62)',
  live: '#22c55e',
  data: '#22d3ee',
  danger: '#ef4444',
};
const LIGHT_BASE = {
  surface: 'rgba(20,16,8,0.04)',
  surface2: 'rgba(20,16,8,0.07)',
  border: 'rgba(20,16,8,0.12)',
  fg: '#1a1710',
  fgMuted: 'rgba(26,23,16,0.62)',
  live: '#15803d',
  data: '#0e7490',
  danger: '#dc2626',
};

export const COLORS: Record<Palette, Record<Mode, Colors>> = {
  amber: {
    dark: { ...DARK_BASE, bg: '#0a0a0e', accent: '#f59e0b', accentBright: '#fbbf24', accentSoft: 'rgba(245,158,11,0.14)', accentBorder: 'rgba(245,158,11,0.35)', accentCore: '#fcd34d' },
    light: { ...LIGHT_BASE, bg: '#f7f3e9', accent: '#b45309', accentBright: '#d97706', accentSoft: 'rgba(180,83,9,0.12)', accentBorder: 'rgba(180,83,9,0.35)', accentCore: '#d97706' },
  },
  sage: {
    dark: { ...DARK_BASE, bg: '#0a0e0b', accent: '#65a30d', accentBright: '#84cc16', accentSoft: 'rgba(132,204,22,0.14)', accentBorder: 'rgba(132,204,22,0.35)', accentCore: '#bef264' },
    light: { ...LIGHT_BASE, bg: '#f1f0e6', accent: '#3f6212', accentBright: '#4d7c0f', accentSoft: 'rgba(63,98,18,0.12)', accentBorder: 'rgba(63,98,18,0.35)', accentCore: '#4d7c0f' },
  },
};

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, s32: 32, s40: 40, s56: 56, s72: 72 } as const;
export const RADIUS = { chip: 10, card: 14, sheet: 24, button: 28, orb: 999 } as const;
export const GUTTER = 20;

export const FONT = {
  serif: 'InstrumentSerif_400Regular',
  sans: 'SpaceGrotesk_400Regular',
  sansMedium: 'SpaceGrotesk_500Medium',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

/** Type roles from the spec. Sizes scale with Dynamic Type per the caps in section 6. */
export function typeRoles(scale: number): Record<'display' | 'title' | 'section' | 'body' | 'bodySm' | 'label' | 'numeral' | 'numeralSm' | 'button', TextStyle> {
  const sans = Math.min(scale, 1.6);
  const serif = Math.min(scale, 1.3);
  const mono = Math.min(scale, 1.2);
  return {
    display: { fontFamily: FONT.serif, fontSize: 40 * serif, lineHeight: 44 * serif },
    title: { fontFamily: FONT.serif, fontSize: 28 * serif, lineHeight: 34 * serif },
    section: { fontFamily: FONT.sansMedium, fontSize: 18 * sans, lineHeight: 24 * sans },
    body: { fontFamily: FONT.sans, fontSize: 16 * sans, lineHeight: 24 * sans },
    bodySm: { fontFamily: FONT.sans, fontSize: 14 * sans, lineHeight: 20 * sans },
    label: { fontFamily: FONT.monoMedium, fontSize: 11 * mono, lineHeight: 14 * mono, letterSpacing: 1.2, textTransform: 'uppercase' },
    numeral: { fontFamily: FONT.monoMedium, fontSize: 56, lineHeight: 56, fontVariant: ['tabular-nums'] },
    numeralSm: { fontFamily: FONT.monoMedium, fontSize: 24 * mono, lineHeight: 28 * mono, fontVariant: ['tabular-nums'] },
    button: { fontFamily: FONT.sansMedium, fontSize: 17 * sans, lineHeight: 22 * sans },
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
