import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Group } from '../types';

export type OwnerStage = 'ongoing' | 'closed' | 'shipped' | 'failed';

interface ActionDef {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  primary?: boolean;
  onPress?: () => void;
}

interface Props {
  group: Group;
  productImage?: ImageSourcePropType;
  ownerStage: OwnerStage;
  actions: ActionDef[];
  onPress?: () => void;
  cutoffText?: string;
}

const STAGE_CONFIG: Record<OwnerStage, { label: string; bg: string; icon: string }> = {
  ongoing: { label: '进行中', bg: '#F43F5E', icon: '🔥' },
  closed:  { label: '已截团', bg: '#F59E0B', icon: '⏰' },
  shipped: { label: '已发货', bg: '#3B82F6', icon: '📦' },
  failed:  { label: '已流团', bg: '#6B7280', icon: '🚫' },
};

export function OwnerGroupCard({ group, productImage, ownerStage, actions, onPress, cutoffText }: Props) {
  const badge = STAGE_CONFIG[ownerStage];
  const priceMin = group.products.length > 0 ? Math.min(...group.products.map((p) => p.price)) : 0;
  const totalSold = group.products.reduce((s, p) => s + p.sold, 0);
  const totalStock = group.products.reduce((s, p) => s + p.stock, 0);
  const progress = totalStock > 0 ? Math.min((totalSold / totalStock) * 100, 100) : 0;
  const typePrefix = group.type === 'custom' ? '【自制】' : '【代购】';

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.75} onPress={onPress}>
      <View style={s.topSection}>
        <View style={s.imgArea}>
          {productImage ? (
            <Image source={productImage} style={s.img} resizeMode="cover" />
          ) : (
            <View style={[s.img, s.imgFallback]}>
              <Text style={{ fontSize: 32 }}>📦</Text>
            </View>
          )}
          <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={s.statusIcon}>{badge.icon}</Text>
            <Text style={s.statusLabel}>{badge.label}</Text>
          </View>
        </View>

        <View style={s.info}>
          {/* 团长身份徽章 + 截团信息 */}
          <View style={s.topRow}>
            <View style={s.ownerBadge}>
              <Ionicons name="ribbon" size={10} color="#7C3AED" />
              <Text style={s.ownerBadgeText}>我开的团</Text>
            </View>
            {cutoffText && (
              <View style={s.cutoffBadge}>
                <Ionicons name="time-outline" size={10} color="#F43F5E" />
                <Text style={s.cutoffText}>{cutoffText}</Text>
              </View>
            )}
          </View>

          <Text style={s.name} numberOfLines={2}>
            <Text style={s.typeTag}>{typePrefix}</Text>
            {group.name}
          </Text>

          {/* 关键数据：人数 / 收入 / 进度 */}
          <View style={s.dataRow}>
            <View style={s.dataItem}>
              <Text style={s.dataNum}>{group.memberCount}</Text>
              <Text style={s.dataLabel}>人</Text>
            </View>
            <View style={s.dataDivider} />
            <View style={s.dataItem}>
              <Text style={s.dataNum}>¥{group.collectedAmount}</Text>
              <Text style={s.dataLabel}>已收</Text>
            </View>
            <View style={s.dataDivider} />
            <View style={s.dataItem}>
              <Text style={[s.dataNum, { color: '#F43F5E' }]}>{Math.round(progress)}%</Text>
              <Text style={s.dataLabel}>成团率</Text>
            </View>
          </View>

          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>

          {/* 团长操作按钮区 */}
          <View style={s.actionRow}>
            {actions.map((a, idx) => (
              <TouchableOpacity
                key={idx}
                style={[s.actionBtn, a.primary && s.actionBtnPrimary]}
                activeOpacity={0.85}
                onPress={a.onPress}
              >
                {a.icon && (
                  <Ionicons
                    name={a.icon}
                    size={12}
                    color={a.primary ? '#FFF' : '#7C3AED'}
                    style={{ marginRight: 3 }}
                  />
                )}
                <Text style={[s.actionText, a.primary && s.actionTextPrimary]} numberOfLines={1}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  topSection: { flexDirection: 'row' },

  imgArea: { width: 122, position: 'relative' },
  img: { width: 122, height: '100%', minHeight: 168 },
  imgFallback: { backgroundColor: '#FFF0F5', alignItems: 'center', justifyContent: 'center' },

  statusBadge: {
    position: 'absolute', top: 0, left: 0,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4,
    borderTopLeftRadius: 16, borderBottomRightRadius: 10,
  },
  statusIcon: { fontSize: 10 },
  statusLabel: { fontSize: 10, fontWeight: '700', color: '#FFF' },

  info: { flex: 1, padding: 12, justifyContent: 'space-between', gap: 6 },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ownerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8,
  },
  ownerBadgeText: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  cutoffBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8,
  },
  cutoffText: { fontSize: 10, fontWeight: '700', color: '#F43F5E' },

  name: { fontSize: 14, fontWeight: '700', color: '#1E1B4B', lineHeight: 19 },
  typeTag: { fontSize: 13, fontWeight: '700', color: '#8B5CF6' },

  dataRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAFAFE', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 4,
  },
  dataItem: { flex: 1, alignItems: 'center' },
  dataNum: { fontSize: 13, fontWeight: '800', color: '#1E1B4B' },
  dataLabel: { fontSize: 9, color: '#9CA3AF', marginTop: 1 },
  dataDivider: { width: 1, height: 18, backgroundColor: '#E5E7EB' },

  progressTrack: { height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: '#7C3AED' },

  actionRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 7, paddingHorizontal: 8,
    borderRadius: 14, borderWidth: 1, borderColor: '#7C3AED',
  },
  actionBtnPrimary: { backgroundColor: '#7C3AED' },
  actionText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  actionTextPrimary: { color: '#FFF' },
});
