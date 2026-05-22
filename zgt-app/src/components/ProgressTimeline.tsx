import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GroupStage } from '../types';
import { GROUP_STAGES, getStageIndex } from '../utils/helpers';

interface Props {
  currentStage: GroupStage;
  groupType: 'proxy' | 'custom';
}

export function ProgressTimeline({ currentStage, groupType }: Props) {
  const currentIdx = getStageIndex(currentStage);
  const stages = GROUP_STAGES.filter((s) => {
    if (groupType === 'proxy') {
      return !['sampling', 'manufacturing', 'producing'].includes(s.stage);
    }
    return !['purchasing'].includes(s.stage);
  });

  return (
    <View style={styles.container}>
      {stages.map((s, i) => {
        const realIdx = getStageIndex(s.stage);
        const isActive = realIdx <= currentIdx;
        const isCurrent = s.stage === currentStage;
        return (
          <View key={s.stage} style={styles.step}>
            <View style={styles.dotRow}>
              {i > 0 && <View style={[styles.line, isActive && { backgroundColor: s.color }]} />}
              <View style={[styles.dot, isActive ? { backgroundColor: s.color } : styles.dotInactive, isCurrent && styles.dotCurrent]}>
                <Ionicons name={isCurrent ? 'checkmark' : 'ellipse'} size={isCurrent ? 14 : 6} color="#FFF" />
              </View>
            </View>
            <Text style={[styles.label, isActive && { color: s.color, fontWeight: '600' }]} numberOfLines={1}>
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 4 },
  step: { flex: 1, alignItems: 'center' },
  dotRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  line: { flex: 1, height: 2, backgroundColor: '#DFE6E9' },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dotInactive: { backgroundColor: '#DFE6E9' },
  dotCurrent: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#FFF', elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  label: { fontSize: 10, color: '#B2BEC3', marginTop: 4, textAlign: 'center' },
});
