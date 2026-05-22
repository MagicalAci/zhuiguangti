import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ImageSourcePropType, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Group } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  group: Group;
  productImage?: ImageSourcePropType;
  onPress?: () => void;
  /** 卡片左上角：业主关系标记，如 "我开的"、"我浏览" */
  selfTag?: { label: string; color: string; bg: string };
  /** 用户偏好命中标签 */
  tag?: string;
  /** 1-based 行号；偶数项的图片高度略不同，营造瀑布流感 */
  index?: number;
}

const ENDING_BG = '#FFF1F2';
const ENDING_COLOR = '#F43F5E';

export function CircleCard({ group, productImage, onPress, selfTag, tag, index = 0 }: Props) {
  const priceMin = group.products.length > 0 ? Math.min(...group.products.map((p) => p.price)) : 0;
  const totalSold = group.products.reduce((sum, p) => sum + p.sold, 0);
  const isCustom = group.type === 'custom';

  // 模拟瀑布流：偶数 ratio 1:1, 奇数 4:5
  const ratio = index % 2 === 0 ? 1 : 1.18;
  const imgH = (SCREEN_W / 2 - 14 * 1.5) * ratio;

  // 截团倒计时 mock
  const diff = (group.endDate ?? 0) - Date.now();
  const days = Math.max(0, Math.floor(diff / 86400000));
  const hh = Math.max(0, Math.floor((diff % 86400000) / 3600000)).toString().padStart(2, '0');
  const mm = Math.max(0, Math.floor((diff % 3600000) / 60000)).toString().padStart(2, '0');

  return (
    <Pressable style={s.card} onPress={onPress}>
      {/* —— 图片区域 —— */}
      <View style={[s.imgWrap, { height: imgH }]}>
        {productImage ? (
          <Image source={productImage} style={s.img} resizeMode="cover" />
        ) : (
          <View style={[s.img, s.imgFallback]}>
            <Text style={{ fontSize: 36 }}>{isCustom ? '🎨' : '📦'}</Text>
          </View>
        )}
        {/* 类型标 */}
        <View style={[s.typeBadge, { backgroundColor: isCustom ? '#FCD34D' : '#FCA5A5' }]}>
          <Text style={s.typeBadgeText}>{isCustom ? '自制' : '闲置'}</Text>
        </View>
        {/* 个人关系标 */}
        {selfTag && (
          <View style={[s.selfTag, { backgroundColor: selfTag.bg }]}>
            <Text style={[s.selfTagText, { color: selfTag.color }]}>{selfTag.label}</Text>
          </View>
        )}
      </View>

      {/* —— 信息区域 —— */}
      <View style={s.body}>
        <Text style={s.name} numberOfLines={2}>
          {tag && <Text style={s.namePrefix}>#{tag}# </Text>}
          {group.name}
        </Text>

        {/* 截团倒计时 */}
        {group.endDate && diff > 0 && (
          <View style={s.timeRow}>
            <Ionicons name="time" size={10} color={ENDING_COLOR} />
            <Text style={s.timeText}>
              还剩{days}天 <Text style={{ fontFamily: 'Menlo' }}>{hh}:{mm}:00</Text>
            </Text>
          </View>
        )}

        {/* 价格 + 团长信息 */}
        <View style={s.priceRow}>
          <Text style={s.price}>
            <Text style={s.priceUnit}>¥</Text>
            {priceMin.toFixed(priceMin < 100 ? 2 : 0)}
          </Text>
          <Text style={s.soldText}>已购{totalSold}</Text>
        </View>

        {/* 团长信用条 */}
        <View style={s.leaderRow}>
          <View style={s.leaderAva}>
            <Text style={{ fontSize: 9 }}>🐷</Text>
          </View>
          <Text style={s.leaderName} numberOfLines={1}>追光体{(Number(group.id?.slice(-2)) || 27) * 10}</Text>
          <View style={s.credBadge}>
            <Text style={s.credBadgeText}>信用良好</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    width: (SCREEN_W - 14 * 3) / 2,
    backgroundColor: '#FFF', borderRadius: 14,
    overflow: 'hidden', marginBottom: 12,
    shadowColor: '#1E1B4B', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  imgWrap: { width: '100%', position: 'relative', backgroundColor: '#F3F4F6' },
  img: { width: '100%', height: '100%' },
  imgFallback: { alignItems: 'center', justifyContent: 'center' },

  typeBadge: {
    position: 'absolute', top: 8, left: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '800', color: '#7C2D12' },

  selfTag: {
    position: 'absolute', top: 8, right: 8,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6,
  },
  selfTagText: { fontSize: 10, fontWeight: '800' },

  body: { padding: 10, gap: 5 },
  name: { fontSize: 13, fontWeight: '700', color: '#1E1B4B', lineHeight: 18 },
  namePrefix: { color: '#7C3AED' },

  timeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: ENDING_BG, alignSelf: 'flex-start',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    marginTop: 1,
  },
  timeText: { fontSize: 10, fontWeight: '700', color: ENDING_COLOR },

  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 1 },
  price: { fontSize: 19, fontWeight: '800', color: '#F43F5E' },
  priceUnit: { fontSize: 12, fontWeight: '700' },
  soldText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leaderAva: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center',
  },
  leaderName: { flex: 1, fontSize: 10, color: '#6B7280', fontWeight: '500' },
  credBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5,
  },
  credBadgeText: { fontSize: 9, fontWeight: '700', color: '#F59E0B' },
});
