import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PURPLE = '#7C3AED';
const PINK = '#F43F5E';

interface ToReceiveOrder {
  id: string;
  ownerName: string;
  ownerAvatar: string;
  groupName: string;
  sku: string;
  amount: number;
  shippedAt: number;
  carrier: string;          // 物流公司
  trackingNo: string;       // 单号
  latestStatus: string;     // 最新轨迹
  latestAt: number;
  daysSinceShip: number;
}

const MOCK: ToReceiveOrder[] = [
  {
    id: 'tr1', ownerName: '月光团', ownerAvatar: '月',
    groupName: '原神 4.5 卡池代抽',
    sku: '阿蕾奇诺 立牌 ×1',
    amount: 120,
    shippedAt: Date.now() - 2 * 86400_000,
    carrier: '顺丰速运',
    trackingNo: 'SF1001234567',
    latestStatus: '快递在【杭州市余杭区中转场】已发出',
    latestAt: Date.now() - 3 * 3600_000,
    daysSinceShip: 2,
  },
];

const TRACK_STEPS = [
  { label: '已揽收',     desc: '团长寄出 · 顺丰速运已收件', t: -2 * 86400_000, on: true },
  { label: '在途中',     desc: '杭州市余杭区中转场已发出', t: -3 * 3600_000, on: true },
  { label: '派送中',     desc: '快递员揽件 · 预计今日送达', t: 0, on: false },
  { label: '已签收',     desc: '请记得确认收货 + 评价', t: 0, on: false },
];

export default function MemberToReceivePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [trackId, setTrackId] = useState<string | null>(null);
  const trackOrder = MOCK.find((o) => o.id === trackId) ?? null;

  return (
    <View style={s.screen}>
      {/* —— 顶栏 —— */}
      <LinearGradient
        colors={['#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.topRow}>
          <Pressable style={s.iconBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <Text style={s.title}>待收货订单</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={s.headerSub}>
          共 <Text style={{ fontWeight: '800' }}>{MOCK.length}</Text> 单在途 · 收到货请尽快「确认收货」
        </Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 30 + insets.bottom, gap: 10 }}>
        {/* —— 提示 —— */}
        <View style={s.banner}>
          <Ionicons name="information-circle-outline" size={14} color="#065F46" />
          <Text style={s.bannerText}>
            收到货后 7 天内未确认 · 系统自动确认收货并进入"已完成"
          </Text>
        </View>

        {MOCK.map((o) => (
          <View key={o.id} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.avatar}><Text style={s.avatarText}>{o.ownerAvatar}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={s.owner}>{o.ownerName}</Text>
                  <View style={s.statusPill}>
                    <Text style={s.statusPillText}>已发货 · {o.daysSinceShip}天</Text>
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

            {/* 物流信息 */}
            <Pressable style={s.trackBox} onPress={() => setTrackId(o.id)}>
              <View style={s.trackIcon}>
                <Ionicons name="cube" size={14} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.trackTitle}>{o.carrier} · {o.trackingNo}</Text>
                <Text style={s.trackLatest} numberOfLines={1}>{o.latestStatus}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#C4C4D4" />
            </Pressable>

            {/* 操作 */}
            <View style={s.actionRow}>
              <TouchableOpacity style={s.actionGhost} onPress={() => Alert.alert('联系团长', '已唤起微信')} activeOpacity={0.8}>
                <Ionicons name="logo-wechat" size={12} color={PURPLE} />
                <Text style={s.actionGhostText}>联系团长</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.actionPrimary}
                activeOpacity={0.85}
                onPress={() => Alert.alert(
                  '确认收货',
                  `确认已收到「${o.sku}」？\n确认后将进入"已完成"，请同时给团长打分`,
                  [
                    { text: '再等等', style: 'cancel' },
                    { text: '确认收货', onPress: () => Alert.alert('已确认收货', '订单已进入「已完成」') },
                  ]
                )}
              >
                <Ionicons name="checkmark-done" size={12} color="#FFF" />
                <Text style={s.actionPrimaryText}>确认收货</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {MOCK.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="archive-outline" size={36} color="#E5E7EB" />
            <Text style={s.emptyText}>暂无待收货订单</Text>
          </View>
        )}
      </ScrollView>

      {/* —— 物流轨迹 Modal —— */}
      <Modal visible={!!trackId} transparent animationType="slide" onRequestClose={() => setTrackId(null)}>
        <Pressable style={mS.overlay} onPress={() => setTrackId(null)}>
          <Pressable style={mS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={mS.handle} />
            <Text style={mS.title}>物流轨迹</Text>
            <Text style={mS.sub}>{trackOrder?.carrier} · {trackOrder?.trackingNo}</Text>

            <ScrollView style={{ maxHeight: 360, marginTop: 14 }}>
              {TRACK_STEPS.map((step, i) => (
                <View key={i} style={mS.stepRow}>
                  <View style={mS.stepLineCol}>
                    <View style={[mS.stepDot, step.on && mS.stepDotOn]}>
                      {step.on && <Ionicons name="checkmark" size={9} color="#FFF" />}
                    </View>
                    {i < TRACK_STEPS.length - 1 && (
                      <View style={[mS.stepLine, TRACK_STEPS[i + 1].on && mS.stepLineOn]} />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 14 }}>
                    <Text style={[mS.stepLabel, step.on && { color: '#1E1B4B' }]}>{step.label}</Text>
                    <Text style={mS.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <Pressable
              style={mS.copyBtn}
              onPress={() => Alert.alert('已复制', `${trackOrder?.trackingNo} 已复制到剪贴板`)}
            >
              <Ionicons name="copy-outline" size={14} color={PURPLE} />
              <Text style={mS.copyText}>复制单号</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    backgroundColor: '#ECFDF5', borderRadius: 12,
  },
  bannerText: { flex: 1, fontSize: 11, color: '#065F46', fontWeight: '600' },

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
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#ECFDF5' },
  statusPillText: { fontSize: 11, fontWeight: '700', color: '#10B981' },

  skuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  sku: { flex: 1, fontSize: 12, color: '#6B7280' },
  amount: { fontSize: 15, fontWeight: '800', color: PINK, marginLeft: 8 },

  trackBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#ECFDF5', borderRadius: 12,
  },
  trackIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  trackTitle: { fontSize: 12, fontWeight: '700', color: '#1E1B4B' },
  trackLatest: { fontSize: 11, color: '#065F46', marginTop: 2 },

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
    borderRadius: 16, backgroundColor: '#10B981',
  },
  actionPrimaryText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  empty: { alignItems: 'center', padding: 36 },
  emptyText: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
});

const mS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 14, paddingBottom: 28, paddingHorizontal: 18,
    maxHeight: '90%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800', color: '#1E1B4B' },
  sub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  stepRow: { flexDirection: 'row', gap: 10 },
  stepLineCol: { alignItems: 'center', width: 18 },
  stepDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotOn: { backgroundColor: '#10B981' },
  stepLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 2 },
  stepLineOn: { backgroundColor: '#10B981' },
  stepLabel: { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  stepDesc: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    marginTop: 16, paddingVertical: 12,
    backgroundColor: '#F5F3FF', borderRadius: 14,
  },
  copyText: { fontSize: 13, fontWeight: '700', color: PURPLE },
});
