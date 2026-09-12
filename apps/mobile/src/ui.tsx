import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { RADIUS, SPACE, useTheme } from './theme';

export function T({ v, color, style, children, ...rest }: { v: keyof ReturnType<typeof useTheme>['t']; color?: string; style?: TextStyle | TextStyle[]; children: React.ReactNode } & Omit<React.ComponentProps<typeof Text>, 'style'>) {
  const { t, c } = useTheme();
  return (
    <Text {...rest} style={[t[v], { color: color ?? c.fg }, style]}>
      {children}
    </Text>
  );
}

/**
 * Paper grain: one 512px noise plate stretched over the screen. Stretched rather
 * than tiled because react-native-web renders resizeMode="repeat" as a single
 * tile, which left a visible square in the corner. Noise does not care about
 * scaling, and at 2% nothing else does either.
 */
export function Grain() {
  const { c } = useTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* The plate is 128px. react-native-web drops the resizeMode prop on the
          static export and paints one untouched tile in the corner, so the size
          goes in the style where both platforms read it. */}
      <Image
        source={require('../assets/grain.png')}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', resizeMode: 'cover', opacity: c.grain }]}
      />
    </View>
  );
}

/** A section marker: mono label with a hairline running to the edge. */
export function Rule({ label, style }: { label?: string; style?: ViewStyle }) {
  const { c } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }, style]}>
      {label ? (
        <T v="label" color={c.fgMuted}>
          {label}
        </T>
      ) : null}
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
    </View>
  );
}

/** A panel. Hairline and a whisper of fill, never a floating glass card. */
export function Panel({ children, style, accent }: { children: React.ReactNode; style?: ViewStyle; accent?: boolean }) {
  const { c } = useTheme();
  return <View style={[{ backgroundColor: accent ? c.accentSoft : c.surface, borderWidth: 1, borderColor: accent ? c.accentBorder : c.border, borderRadius: RADIUS.card, padding: SPACE.lg }, style]}>{children}</View>;
}

/** Ink block, paper text. The one loud element on a page, and it is not a color. */
export function PrimaryButton({ label, onPress, disabled, style }: { label: string; onPress(): void; disabled?: boolean; style?: ViewStyle }) {
  const { c, t, reduceMotion } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled
          ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border }
          : { backgroundColor: c.fg, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed && !reduceMotion ? 0.995 : 1 }] },
        style,
      ]}
    >
      <Text style={[t.button, { color: disabled ? c.fgFaint : c.bg }]}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, style }: { label: string; onPress(): void; style?: ViewStyle }) {
  const { c, t, reduceMotion } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, { borderWidth: 1, borderColor: c.border, backgroundColor: pressed ? c.surface2 : 'transparent', transform: [{ scale: pressed && !reduceMotion ? 0.995 : 1 }] }, style]}>
      <Text style={[t.button, { color: c.fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Underlined text action. Reads like a footnote, which is the point. */
export function TextButton({ label, onPress, color, align = 'center', style }: { label: string; onPress(): void; color?: string; align?: 'left' | 'center' | 'right'; style?: ViewStyle }) {
  const { c, t } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10} style={[{ paddingVertical: SPACE.md, alignItems: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end' }, style]}>
      <Text style={[t.bodySm, { color: color ?? c.fgMuted, textDecorationLine: 'underline', textDecorationColor: c.border }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress(): void }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={{ paddingHorizontal: SPACE.md, minHeight: 44, justifyContent: 'center', borderRadius: RADIUS.chip, backgroundColor: selected ? c.accentSoft : 'transparent', borderWidth: 1, borderColor: selected ? c.accentBorder : c.border }}
    >
      <Text style={[t.label, { color: selected ? c.accent : c.fgMuted }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * A figure and its caption, set in the serif. Stat rows sit between hairlines
 * rather than inside boxes, so a screen reads as a page and not a dashboard.
 */
export function Figure({ value, caption, accent, align = 'left' }: { value: string | number; caption: string; accent?: boolean; align?: 'left' | 'center' }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <T v="numeralSm" color={accent ? c.accent : c.fg}>
        {String(value)}
      </T>
      <T v="label" color={c.fgMuted} style={{ marginTop: 2 }}>
        {caption}
      </T>
    </View>
  );
}

export function FigureRow({ items, style }: { items: Array<{ value: string | number; caption: string; accent?: boolean }>; style?: ViewStyle }) {
  const { c } = useTheme();
  return (
    <View style={[{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border, paddingVertical: SPACE.lg, flexDirection: 'row' }, style]}>
      {items.map((it, i) => (
        <View key={it.caption} style={{ flex: 1, borderLeftWidth: i ? 1 : 0, borderLeftColor: c.border, paddingLeft: i ? SPACE.lg : 0 }}>
          <Figure {...it} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { height: 54, borderRadius: RADIUS.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xxl },
});
