import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '../utils/helpers';

interface Props {
  title: string;
  collected: number;
  pending: number;
  color: string;
}

export function FinanceCard({ title, collected, pending, color }: Props) {
  const total = collected + pending;
  const pct = total > 0 ? (collected / total) * 100 : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.amount, { color }]}>{formatCurrency(collected)}</Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.row}>
        <Text style={styles.sub}>待收 {formatCurrency(pending)}</Text>
        <Text style={styles.pct}>{pct.toFixed(0)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, flex: 1, marginHorizontal: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  title: { fontSize: 12, color: '#636E72', marginBottom: 4 },
  amount: { fontSize: 20, fontWeight: '700' },
  barBg: { height: 4, backgroundColor: '#F0F0F0', borderRadius: 2, marginTop: 8 },
  barFill: { height: 4, borderRadius: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sub: { fontSize: 11, color: '#B2BEC3' },
  pct: { fontSize: 11, color: '#636E72', fontWeight: '600' },
});
