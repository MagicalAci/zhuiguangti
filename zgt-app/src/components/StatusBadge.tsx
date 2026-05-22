import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  color: string;
  bg?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ label, color, bg, size = 'md' }: Props) {
  const bgColor = bg ?? `${color}18`;
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, size === 'sm' && styles.sm]}>
      <Text style={[styles.text, { color }, size === 'sm' && styles.smText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  sm: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  text: { fontSize: 12, fontWeight: '600' },
  smText: { fontSize: 10 },
});
