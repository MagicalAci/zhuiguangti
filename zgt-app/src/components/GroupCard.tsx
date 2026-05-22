import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Group } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatCurrency, GROUP_STAGES, getStageIndex } from '../utils/helpers';

interface Props {
  group: Group;
  onPress: () => void;
}

export function GroupCard({ group, onPress }: Props) {
  const stageInfo = GROUP_STAGES[getStageIndex(group.stage)];
  const progress = group.totalRevenue > 0
    ? Math.min((group.collectedAmount / group.totalRevenue) * 100, 100)
    : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: group.type === 'proxy' ? '#0984E3' : '#6C5CE7' }]}>
          <Text style={styles.typeText}>{group.type === 'proxy' ? '代购' : '自制'}</Text>
        </View>
        <StatusBadge label={stageInfo?.label ?? ''} color={stageInfo?.color ?? '#636E72'} size="sm" />
      </View>

      <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
      <Text style={styles.ip}>{group.ipName}</Text>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Ionicons name="people" size={14} color="#636E72" />
          <Text style={styles.statText}>{group.memberCount}人</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="cube" size={14} color="#636E72" />
          <Text style={styles.statText}>{group.products.length}款</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.revenue}>{formatCurrency(group.collectedAmount)}</Text>
          <Text style={styles.statSub}>/{formatCurrency(group.totalRevenue)}</Text>
        </View>
      </View>

      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${progress}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  name: { fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 2 },
  ip: { fontSize: 13, color: '#636E72', marginBottom: 12 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 13, color: '#636E72' },
  statSub: { fontSize: 11, color: '#B2BEC3' },
  revenue: { fontSize: 14, fontWeight: '700', color: '#00B894' },
  barBg: { height: 4, backgroundColor: '#F0F0F0', borderRadius: 2 },
  barFill: { height: 4, borderRadius: 2, backgroundColor: '#6C5CE7' },
});
