import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PURPLE = '#7C3AED';

interface LeaderToReceiveOrder {
  id: string;
  userName: string;
  userAvatar: string;
  groupName: string;
  sku: string;
  amount: number;
  shippedAt: string;
  carrier: string;
  trackingNo: string;
  daysSinceShip: number;
}

const MOCK: LeaderToReceiveOrder[] = [
  { id: 'lr1', userName: '星月', userAvatar: '星', groupName: '偶像梦幻祭 4月新谷代购团', sku: '朔间凛月 吧唧 ×1', amount: 42, shippedAt: '2026-05-15', carrier: '顺丰速运', trackingNo: 'SF1001234001', daysSinceShip: 4 },
  { id: 'lr2', userName: '七七', userAvatar: '七', groupName: '偶像梦幻祭 4月新谷代购团', sku: '天城一彩 吧唧 ×1', amount: 42, shippedAt: '2026-05-15', carrier: '顺丰速运', trackingNo: 'SF1001234002', daysSinceShip: 4 },
  { id: 'lr3', userName: '小鹿', userAvatar: '小', groupName: '名侦探柯南 一番赏代抽',     sku: 'C 赏立牌 ×1', amount: 65, shippedAt: '2026-05-16', carrier: '中通快递', trackingNo: 'ZTO9988776655', daysSinceShip: 3 },
];

export default function LeaderToReceivePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={s.screen}>
      <LinearGradient
        colors={['#0EA5E9', '#38BDF8']}
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
          共 <Text style={{ fontWeight: '800' }}>{MOCK.length}</Text> 单等团员确认收货 · 平台会在 14 天后自动确认放款
        </Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 30 + insets.bottom, gap: 10 }}>
        <View style={s.banner}>
          <Ionicons name="paper-plane-outline" size={14} color="#0369A1" />
          <Text style={s.bannerText}>团员确认收货后,平台才会把尾款 / 全款放款到团长账户(超时 14 天自动确认)</Text>
        </View>

        {MOCK.map((o) => (
          <View key={o.id} style={s.card}>
            <View style={s.row1}>
              <View style={s.avatar}><Text style={s.avatarText}>{o.userAvatar}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={s.userName}>{o.userName}</Text>
                  <View style={s.statusPill}>
                    <Ionicons name="paper-plane" size={11} color="#0EA5E9" />
                    <Text style={s.statusText}>待收货 · {o.daysSinceShip} 天</Text>
                  </View>
                </View>
                <Text style={s.groupName} numberOfLines={1}>{o.groupName}</Text>
              </View>
            </View>

            <View style={s.row2}>
              <Text style={s.sku} numberOfLines={1}>{o.sku}</Text>
              <Text style={s.amount}>¥{o.amount.toFixed(2)}</Text>
            </View>

            <View style={s.metaRow}>
              <Ionicons name="cube-outline" size={11} color="#9CA3AF" />
              <Text style={s.metaText}>
                {o.carrier} · {o.trackingNo} · 发出 {o.shippedAt}
              </Text>
            </View>

            <View style={s.actionRow}>
              <Pressable
                style={s.btnGhost}
                onPress={() => Alert.alert('查看物流', `${o.carrier} · ${o.trackingNo}\n\n已发出 ${o.daysSinceShip} 天,正在派送`)}
              >
                <Ionicons name="locate-outline" size={12} color={PURPLE} />
                <Text style={s.btnGhostText}>查看物流</Text>
              </Pressable>
              <Pressable
                style={s.btnGhost}
                onPress={() => Alert.alert('催收货', `已向「${o.userName}」发送催确认收货提醒`)}
              >
                <Ionicons name="notifications-outline" size={12} color={PURPLE} />
                <Text style={s.btnGhostText}>催收货</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {MOCK.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="paper-plane-outline" size={36} color="#E5E7EB" />
            <Text style={s.emptyText}>暂无待收货订单</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  header: {
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.92)', marginTop: 12 },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E0F2FE', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  bannerText: { fontSize: 11, color: '#0369A1', flex: 1, fontWeight: '600' },

  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 12,
    shadowColor: '#1E1B4B', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  row1: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#0369A1' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    backgroundColor: '#E0F2FE',
  },
  statusText: { fontSize: 10, color: '#0369A1', fontWeight: '700' },
  groupName: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  row2: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 8, gap: 6,
  },
  sku: { flex: 1, fontSize: 12, color: '#1E1B4B' },
  amount: { fontSize: 14, fontWeight: '800', color: '#0EA5E9' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 11, color: '#9CA3AF', flex: 1 },

  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  btnGhost: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 16, borderWidth: 1, borderColor: '#D8B4FE',
    backgroundColor: '#FAF5FF',
  },
  btnGhostText: { fontSize: 12, fontWeight: '700', color: PURPLE },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
});
