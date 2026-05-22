import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize } from '../theme';

interface Props {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  value?: string;
}

export function ProgressRing({ progress, size = 80, strokeWidth = 6, color = Colors.primary, label, value }: Props) {
  const pct = Math.min(Math.max(progress, 0), 100);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background circle (CSS-based for RN compatibility) */}
      <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: `${color}18` }]} />
      {/* Foreground arc approximation */}
      <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: 'transparent', borderTopColor: color, borderRightColor: pct > 25 ? color : 'transparent', borderBottomColor: pct > 50 ? color : 'transparent', borderLeftColor: pct > 75 ? color : 'transparent', transform: [{ rotate: '-90deg' }] }]} />
      <View style={styles.center}>
        {value ? (
          <Text style={[styles.value, { color }]}>{value}</Text>
        ) : (
          <Text style={[styles.value, { color }]}>{pct.toFixed(0)}%</Text>
        )}
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  center: { alignItems: 'center' },
  value: { fontSize: FontSize.lg, fontWeight: '800' },
  label: { fontSize: 9, color: Colors.textTertiary, marginTop: 1 },
});
