import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PURPLE = '#7C3AED';
const PINK = '#F43F5E';

interface ToShipOrder {
  id: string;
  ownerName: string;
  ownerAvatar: string;
  groupName: string;
  sku: string;
  amount: number;
  payAt: number;          // 已付款时间
  estimateShipDays: number; // 预计发货还要几天
  stage: 'paid' | 'preparing' | 'arrived'; // 已付款 / 等到货 / 已到货待发
  address: string;
}

const MOCK: ToShipOrder[] = [
  {
    id: 'ts1', ownerName: '团长大人', ownerAvatar: '团',
    groupName: '偶像梦幻祭 6月新谷代购团',
    sku: '天城一彩 吧唧 ×1',
    amount: 35,
    payAt: Date.now() - 2 * 86400_000,
    estimateShipDays: 5,
    stage: 'preparing',
    address: '浙江省 杭州市 余杭区 梦想小镇 4 号楼 502',
  },
  {
    id: 'ts2', ownerName: '星河里', ownerAvatar: '星',
    groupName: '恋与深空 角色香薰蜡烛团',
    sku: '秦彻 香薰蜡烛 ×1',
    amount: 68,
    payAt: Date.now() - 8 * 3600_000,
    estimateShipDays: 3,
    stage: 'arrived',
    address: '浙江省 杭州市 余杭区 梦想小镇 4 号楼 502',
  },
];

const STAGE_CFG: Record<ToShipOrder['stage'], { label: string; color: string; bg: string; hint: string }> = {
  paid:      { label: '已付款',   color: '#10B981', bg: '#ECFDF5', hint: '团长已收款 · 等待商品到货' },
  preparing: { label: '等到货',   color: '#F59E0B', bg: '#FFFBEB', hint: '团长正在等供应商发货' },
  arrived:   { label: '已到货',   color: '#3B82F6', bg: '#EFF6FF', hint: '货已到团长仓，准备分拣发货' },
};

export default function MemberToShipPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={s.screen}>
      {/* —— 顶栏 —— */}
      <LinearGradient
        colors={['#3B82F6', '#60A5FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.topRow}>
          <Pressable style={s.iconBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <Text style={s.title}>待发货订单</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={s.headerSub}>
          共 <Text style={{ fontWeight: '800' }}>{MOCK.length}</Text> 单等团长发货 · 已付款 / 商品到货状态可在卡片上查看
        </Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 30 + insets.bottom, gap: 10 }}>
        {/* —— 进度提示 —— */}
        <View style={s.banner}>
          <Ionicons name="information-circle-outline" size={14} color="#3B82F6" />
          <Text style={s.bannerText}>
            团长会先「收齐货 → 分拣 → 统一发货」，预计平均 3~5 天后发货 · 可随时催发货
          </Text>
        </View>

        {MOCK.map((o) => {
          const cfg = STAGE_CFG[o.stage];
          return (
            <View key={o.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.avatar}><Text style={s.avatarText}>{o.ownerAvatar}</Text></View>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={s.owner}>{o.ownerName}</Text>
                    <View style={[s.statusPill, { backgroundColor: cfg.bg }]}>
                      <Text style={[s.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  <Text style={s.groupName} numberOfLines={1}>{o.groupName}</Text>
                </View>
              </View>

              {/* SKU + 金额 */}
              <View style={s.skuRow}>
                <Text style={s.sku} numberOfLines={1}>{o.sku}</Text>
                <Text style={s.amount}>¥{o.amount.toFixed(0)}</Text>
              </View>

              {/* 阶段提示 */}
              <View style={s.stageBox}>
                <View style={[s.stageDot, { backgroundColor: cfg.color }]} />
                <Text style={s.stageText}>{cfg.hint}</Text>
                <Text style={s.stageMeta}>预计 {o.estimateShipDays} 天内发货</Text>
              </View>

              {/* 收货地址 */}
              <View style={s.addrBox}>
                <Ionicons name="location-outline" size={11} color="#9CA3AF" />
                <Text style={s.addrText} numberOfLines={1}>{o.address}</Text>
                <Pressable hitSlop={6} onPress={() => router.push('/settings/addresses' as any)}>
                  <Text style={s.addrEdit}>修改</Text>
                </Pressable>
              </View>

              {/* 操作 */}
              <View style={s.actionRow}>
                <TouchableOpacity style={s.actionGhost} onPress={() => Alert.alert('联系团长', '已唤起微信')} activeOpacity={0.8}>
                  <Ionicons name="logo-wechat" size={12} color={PURPLE} />
                  <Text style={s.actionGhostText}>联系团长</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.actionPrimary}
                  activeOpacity={0.85}
                  onPress={() => Alert.alert('催发货', `已给「${o.ownerName}」发送催发货提醒`)}
                >
                  <Ionicons name="megaphone-outline" size={12} color="#FFF" />
                  <Text style={s.actionPrimaryText}>催发货</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {MOCK.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={36} color="#E5E7EB" />
            <Text style={s.emptyText}>暂无待发货订单</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },

  header: {
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 10 },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: '#EFF6FF', borderRadius: 12,
  },
  bannerText: { flex: 1, fontSize: 11, color: '#1E40AF', fontWeight: '600' },

  card: {
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800', color: PURPLE },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  owner: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  groupName: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  skuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  sku: { flex: 1, fontSize: 12, color: '#6B7280' },
  amount: { fontSize: 15, fontWeight: '800', color: PINK, marginLeft: 8 },

  stageBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#FAFAFE', borderRadius: 10,
  },
  stageDot: { width: 8, height: 8, borderRadius: 4 },
  stageText: { flex: 1, fontSize: 12, color: '#1E1B4B', fontWeight: '600' },
  stageMeta: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },

  addrBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  addrText: { flex: 1, fontSize: 11, color: '#9CA3AF' },
  addrEdit: { fontSize: 11, color: PURPLE, fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  actionGhost: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 16, borderWidth: 1, borderColor: PURPLE,
  },
  actionGhostText: { fontSize: 12, fontWeight: '700', color: PURPLE },
  actionPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 16, backgroundColor: PURPLE,
  },
  actionPrimaryText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  empty: { alignItems: 'center', padding: 36 },
  emptyText: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
});
