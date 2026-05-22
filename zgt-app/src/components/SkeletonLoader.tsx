import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Colors, Radius } from '../theme';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({ width = '100%', height = 16, borderRadius = 8, style }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius, backgroundColor: Colors.bgMuted, opacity }, style]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={skStyles.card}>
      <View style={skStyles.row}>
        <SkeletonLoader width={60} height={60} borderRadius={16} />
        <View style={{ flex: 1, gap: 8, marginLeft: 12 }}>
          <SkeletonLoader width="70%" height={14} />
          <SkeletonLoader width="40%" height={12} />
        </View>
      </View>
      <SkeletonLoader width="100%" height={8} borderRadius={4} style={{ marginTop: 16 }} />
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 18, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
