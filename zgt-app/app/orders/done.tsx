import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PURPLE = '#7C3AED';

interface LeaderDoneOrder {
  id: string;
  userName: string;
  userAvatar: string;
  groupName: string;
  sku: string;
  amount: number;
  receivedAt: string;
  released: boolean;        // 平台是否已放款
  rating?: number;          // 团员评价 1~5
}

const MOCK: LeaderDoneOrder[] = [
  { id: 'ld1', userName: '星月', userAvatar: '星', groupName: '偶像梦幻祭 3月新谷代购团', sku: '朔间凛月 吧唧 ×1', amount: 42, receivedAt: '2026-04-22', released: true, rating: 5 },
  { id: 'ld2', userName: '七七', userAvatar: '七', groupName: '偶像梦幻祭 3月新谷代购团', sku: '天城一彩 吧唧 ×1', amount: 42, receivedAt: '2026-04-22', released: true, rating: 5 },
  { id: 'ld3', userName: '小鹿', userAvatar: '小', groupName: '名侦探柯南 一番赏代抽',     sku: 'A 赏立牌 ×1', amount: 88, receivedAt: '2026-04-18', released: true, rating: 4 },
  { id: 'ld4', userName: '柚子', userAvatar: '柚', groupName: '原神 3.7 卡池代抽',         sku: '夜兰 立牌 ×1', amount: 65, receivedAt: '2026-04-08', released: true },
];

export default function LeaderDonePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const totalRevenue = MOCK.reduce((sum, o) => sum + o.amount, 0);

  return (
    <View style={s.screen}>
      <LinearGradient
        colors={['#6B7280', '#9CA3AF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.topRow}>
          <Pressable style={s.iconBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <Text style={s.title}>已完成订单</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={s.headerSub}>
          共 <Text style={{ fontWeight: '800' }}>{MOCK.length}</Text> 单 · 累计放款 <Text style={{ fontWeight: '800' }}>¥{totalRevenue.toFixed(2)}</Text>
        </Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 30 + insets.bottom, gap: 10 }}>
        <View style={s.banner}>
          <Ionicons name="checkmark-done-circle-outline" size={14} color="#374151" />
          <Text style={s.bannerText}>这些订单团员已确认收货 · 平台已把尾款 / 全款放款到您的「资金账户 → 可提现余额」</Text>
        </View>

        {MOCK.map((o) => (
          <View key={o.id} style={s.card}>
            <View style={s.row1}>
              <View style={s.avatar}><Text style={s.avatarText}>{o.userAvatar}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={s.userName}>{o.userName}</Text>
                  <View style={s.statusPill}>
                    <Ionicons name="checkmark-circle" size={11} color="#6B7280" />
                    <Text style={s.statusText}>已完成</Text>
                  </View>
                  {o.released && (
                    <View style={s.releasePill}>
                      <Ionicons name="cash-outline" size={11} color="#10B981" />
                      <Text style={s.releaseText}>已放款</Text>
                    </View>
                  )}
                </View>
                <Text style={s.groupName} numberOfLines={1}>{o.groupName}</Text>
              </View>
            </View>

            <View style={s.row2}>
              <Text style={s.sku} numberOfLines={1}>{o.sku}</Text>
              <Text style={s.amount}>+¥{o.amount.toFixed(2)}</Text>
            </View>

            <View style={s.metaRow}>
              <Ionicons name="time-outline" size={11} color="#9CA3AF" />
              <Text style={s.metaText}>团员确认收货:{o.receivedAt}</Text>
              {o.rating != null && (
                <View style={s.starRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons key={i} name={i < o.rating! ? 'star' : 'star-outline'} size={10} color="#F59E0B" />
                  ))}
                </View>
              )}
            </View>

            <View style={s.actionRow}>
              <Pressable
                style={s.btnGhost}
                onPress={() => Alert.alert('订单详情', `${o.groupName}\n\n${o.sku}\n¥${o.amount.toFixed(2)}\n团员评价:${o.rating ? `${o.rating} 星` : '未评价'}`)}
              >
                <Text style={s.btnGhostText}>查看详情</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {MOCK.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="albums-outline" size={36} color="#E5E7EB" />
            <Text style={s.emptyText}>暂无已完成订单</Text>
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
    backgroundColor: '#F3F4F6', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  bannerText: { fontSize: 11, color: '#374151', flex: 1, fontWeight: '600' },

  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 12,
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  row1: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#6B7280' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  userName: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  statusText: { fontSize: 10, color: '#6B7280', fontWeight: '700' },
  releasePill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  releaseText: { fontSize: 10, color: '#10B981', fontWeight: '700' },
  groupName: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  row2: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 8, gap: 6,
  },
  sku: { flex: 1, fontSize: 12, color: '#1E1B4B' },
  amount: { fontSize: 14, fontWeight: '800', color: '#10B981' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 11, color: '#9CA3AF' },
  starRow: { flexDirection: 'row', gap: 1, marginLeft: 'auto' },

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
