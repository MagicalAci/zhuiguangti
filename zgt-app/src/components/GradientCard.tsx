import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Radius, Shadow } from '../theme';

interface Props {
  colors?: [string, string];
  style?: ViewStyle;
  children: ReactNode;
  flat?: boolean;
}

export function GradientCard({ colors, style, children, flat }: Props) {
  if (colors) {
    return (
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, !flat && Shadow.md, style]}>
        {children}
      </LinearGradient>
    );
  }
  return <View style={[styles.cardWhite, !flat && Shadow.md, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, padding: 20, overflow: 'hidden' },
  cardWhite: { backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 20 },
});
