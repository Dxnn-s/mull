import React from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type TextStyle, type ViewStyle } from 'react-native';
import { RADIUS, SPACE, useTheme } from './theme';

export function T({ v, color, style, children, ...rest }: { v: keyof ReturnType<typeof useTheme>['t']; color?: string; style?: TextStyle; children: React.ReactNode } & Omit<React.ComponentProps<typeof Text>, 'style'>) {
  const { t, c } = useTheme();
  return (
    <Text {...rest} style={[t[v], { color: color ?? c.fg }, style]}>
      {children}
    </Text>
  );
}

export function Eyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color ?? c.accent }} />
      <T v="label" color={color ?? c.accent}>
        {children}
      </T>
    </View>
  );
}

export function Card({ children, style, accent }: { children: React.ReactNode; style?: ViewStyle; accent?: boolean }) {
  const { c, mode } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: c.surface, borderWidth: 1, borderColor: accent ? c.accentBorder : c.border, borderRadius: RADIUS.card, padding: SPACE.lg },
        mode === 'light' ? { shadowColor: 'rgba(40,30,10,1)', shadowOpacity: 0.1, shadowRadius: 32, shadowOffset: { width: 0, height: 12 } } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled, style }: { label: string; onPress(): void; disabled?: boolean; style?: ViewStyle } & Pick<PressableProps, 'onPress'>) {
  const { c, t, mode, reduceMotion } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: c.accent, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed && !reduceMotion ? 0.98 : 1 }] },
        mode === 'dark' ? { shadowColor: c.accent, shadowOpacity: 0.35, shadowRadius: 40, shadowOffset: { width: 0, height: 0 } } : null,
        style,
      ]}
    >
      <Text style={[t.button, { color: '#0a0a0e' }]}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, style }: { label: string; onPress(): void; style?: ViewStyle }) {
  const { c, t, reduceMotion } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, transform: [{ scale: pressed && !reduceMotion ? 0.98 : 1 }] }, style]}>
      <Text style={[t.button, { color: c.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function TextButton({ label, onPress, color, style }: { label: string; onPress(): void; color?: string; style?: ViewStyle }) {
  const { c, t } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={[{ paddingVertical: SPACE.md, alignItems: 'center' }, style]}>
      <Text style={[t.body, { color: color ?? c.fgMuted }]}>{label}</Text>
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
      style={{ paddingHorizontal: SPACE.md, paddingVertical: SPACE.md, minHeight: 44, justifyContent: 'center', borderRadius: RADIUS.chip, backgroundColor: selected ? c.accentSoft : c.surface, borderWidth: 1, borderColor: selected ? c.accentBorder : c.border }}
    >
      <Text style={[t.label, { color: selected ? c.accent : c.fgMuted }]}>{label}</Text>
    </Pressable>
  );
}

export function StatTile({ value, caption, data, flex = 1 }: { value: string | number; caption: string; data?: boolean; flex?: number }) {
  const { c } = useTheme();
  return (
    <Card style={{ flex, paddingVertical: SPACE.md }}>
      <T v="numeralSm" color={data ? c.data : c.fg}>
        {String(value)}
      </T>
      <T v="label" color={c.fgMuted} style={{ marginTop: SPACE.xs }}>
        {caption}
      </T>
    </Card>
  );
}

export function Screen({ children, title, sub }: { children: React.ReactNode; title?: string; sub?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingHorizontal: SPACE.xl }}>
      {title ? (
        <View style={{ paddingTop: SPACE.lg, paddingBottom: SPACE.xxl }}>
          <T v="display">{title}</T>
          {sub ? (
            <T v="body" color={c.fgMuted} style={{ marginTop: SPACE.sm }}>
              {sub}
            </T>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { height: 56, borderRadius: RADIUS.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xxl },
});
