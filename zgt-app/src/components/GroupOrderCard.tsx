import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Group } from '../types';

export type CardStage = 'open' | 'presale' | 'closing_soon' | 'full' | 'closed';

interface Props {
  group: Group;
  productImage?: any;
  cardStage?: CardStage;
  onPress?: () => void;
}

const BADGE_CONFIG: Record<CardStage, { label: string; bg: string; icon: string }> = {
  open: { label: '拼团中', bg: '#F43F5E', icon: '🔥' },
  presale: { label: '预定中', bg: '#8B5CF6', icon: '📋' },
  closing_soon: { label: '即将截团', bg: '#F59E0B', icon: '⏰' },
  full: { label: '已满团', bg: '#6B7280', icon: '✅' },
  closed: { label: '已截团', bg: '#4B5563', icon: '🔒' },
};

const ACTION_CONFIG: Record<CardStage, {
  label: string;
  bg: string;
  color: string;
  disabled?: boolean;
}> = {
  open: { label: '去参团', bg: '#F43F5E', color: '#FFF' },
  presale: { label: '去参团', bg: '#F43F5E', color: '#FFF' },
  closing_soon: { label: '去参团', bg: '#F43F5E', color: '#FFF' },
  full: { label: '候补排队', bg: '#6B7280', color: '#FFF' },
  closed: { label: '已截团', bg: '#E5E7EB', color: '#9CA3AF', disabled: true },
};

export function GroupOrderCard({ group, productImage, cardStage = 'open', onPress }: Props) {
  const badge = BADGE_CONFIG[cardStage];
  const action = ACTION_CONFIG[cardStage];
  const priceMin = group.products.length > 0 ? Math.min(...group.products.map((p) => p.price)) : 0;
  const totalSold = group.products.reduce((s, p) => s + p.sold, 0);
  const totalStock = group.products.reduce((s, p) => s + p.stock, 0);
  const progress = totalStock > 0 ? Math.min((totalSold / totalStock) * 100, 100) : 0;
  const deposit = Math.round(priceMin * group.depositRate);

  const typePrefix = group.type === 'custom' ? '【自制】' : '【代购】';
  const leaderGroupCount = Math.max(3, Math.floor(group.memberCount / 10));

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.75} onPress={onPress}>
      <View style={s.topSection}>
        {/* Left: Image */}
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

        {/* Right: Info */}
        <View style={s.info}>
          {/* 截团倒计时 - 右上角 */}
          <View style={s.countdownBadge}>
            <Text style={s.countdownIcon}>⏱</Text>
            <Text style={s.countdownText}>剩余 23:45:12</Text>
          </View>

          <Text style={s.name} numberOfLines={2}>
            <Text style={s.typeTag}>{typePrefix}</Text>
            {group.name}
          </Text>

          <View style={s.leaderRow}>
            <Text style={s.leaderText}>团长：团长大人</Text>
            <View style={s.leaderBadge}>
              <Text style={{ fontSize: 9 }}>🛡️</Text>
              <Text style={s.leaderBadgeText}>信誉团长</Text>
            </View>
            <View style={s.groupCountBadge}>
              <Text style={s.groupCountText}>已开{leaderGroupCount}团</Text>
            </View>
          </View>

          <View style={s.progressRow}>
            <View style={s.progressLabelRow}>
              <Text style={s.progressLabel}>
                已拼 <Text style={s.progressBold}>{totalSold}</Text>/{totalStock}
              </Text>
              <View style={s.progressPctBubble}>
                <Text style={s.progressPctText}>{Math.round(progress)}%</Text>
              </View>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>

          <View style={s.tagsRow}>
            <View style={s.tag}>
              <Text style={s.tagText}>🚚 包邮</Text>
            </View>
            {group.type === 'proxy' && group.currency && (
              <View style={s.tag}>
                <Text style={s.tagText}>🌐 {group.currency}代购</Text>
              </View>
            )}
          </View>

          {/* 底部行: 价格 + 定金 + CTA */}
          <View style={s.bottomRow}>
            <View style={s.priceArea}>
              <Text style={s.price}>
                <Text style={s.priceCurrency}>¥</Text>
                {priceMin.toFixed(0)}
                <Text style={s.priceUnit}>起</Text>
              </Text>
              {deposit > 0 && (
                <View style={s.depositTag}>
                  <Text style={s.depositText}>定金¥{deposit}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[s.ctaBtn, { backgroundColor: action.bg }]}
              activeOpacity={action.disabled ? 1 : 0.85}
              onPress={action.disabled ? undefined : onPress}
              disabled={action.disabled}
            >
              <Text style={[s.ctaText, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
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

  topSection: {
    flexDirection: 'row',
  },

  imgArea: { width: 130, position: 'relative' },
  img: { width: 130, height: '100%', minHeight: 170 },
  imgFallback: { backgroundColor: '#FFF0F5', alignItems: 'center', justifyContent: 'center' },

  statusBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 10,
  },
  statusIcon: { fontSize: 10 },
  statusLabel: { fontSize: 10, fontWeight: '700', color: '#FFF' },

  info: { flex: 1, padding: 12, justifyContent: 'space-between', gap: 5 },

  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 3,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countdownIcon: { fontSize: 10 },
  countdownText: { fontSize: 10, fontWeight: '700', color: '#F43F5E' },

  name: { fontSize: 14, fontWeight: '700', color: '#1E1B4B', lineHeight: 19 },
  typeTag: { fontSize: 13, fontWeight: '700', color: '#8B5CF6' },

  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  leaderText: { fontSize: 11, color: '#6B7280' },
  leaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leaderBadgeText: { fontSize: 9, fontWeight: '600', color: '#10B981' },
  groupCountBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  groupCountText: { fontSize: 9, fontWeight: '600', color: '#3B82F6' },

  progressRow: { gap: 3 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  progressBold: { fontWeight: '800', color: '#1E1B4B' },
  progressPctBubble: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  progressPctText: { fontSize: 10, fontWeight: '700', color: '#F43F5E' },
  progressTrack: { height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: '#F43F5E' },

  tagsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  tag: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: { fontSize: 10, color: '#6B7280', fontWeight: '500' },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceArea: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  price: { fontSize: 18, fontWeight: '800', color: '#F43F5E' },
  priceCurrency: { fontSize: 12, fontWeight: '700' },
  priceUnit: { fontSize: 11, fontWeight: '500', color: '#F87171' },
  depositTag: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  depositText: { fontSize: 10, fontWeight: '600', color: '#F59E0B' },

  ctaBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  ctaText: { fontSize: 12, fontWeight: '700' },
});
