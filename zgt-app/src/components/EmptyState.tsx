import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../theme';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <Ionicons name={icon as any} size={32} color={Colors.primary} />
          </View>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  iconWrap: { marginBottom: Spacing.xl },
  iconOuter: { width: 96, height: 96, borderRadius: 48, backgroundColor: `${Colors.primary}08`, alignItems: 'center', justifyContent: 'center' },
  iconInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${Colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.md, color: Colors.textTertiary, textAlign: 'center', lineHeight: 22 },
  button: { marginTop: Spacing.xl, backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: Radius.full },
  buttonText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.md },
});
