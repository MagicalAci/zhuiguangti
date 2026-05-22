import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme';

interface Props {
  count: number;
  size?: number;
}

export function NotifBadge({ count, size = 18 }: Props) {
  if (count <= 0) return null;

  const display = count > 99 ? '99+' : count.toString();

  return (
    <View style={[styles.badge, { minWidth: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: size * 0.55 }]}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.danger,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  text: { color: '#FFF', fontWeight: '800' },
});
