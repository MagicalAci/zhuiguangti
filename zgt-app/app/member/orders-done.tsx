import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PURPLE = '#7C3AED';

interface DoneOrder {
  id: string;
  ownerName: string;
  ownerAvatar: string;
  groupName: string;
  sku: string;
  amount: number;
  receivedAt: string;   // 确认收货时间
  rated?: boolean;      // 是否已评价
}

const MOCK: DoneOrder[] = [
  { id: 'd1', ownerName: '星河里', ownerAvatar: '星', groupName: '恋与深空 角色香薰蜡烛团',   sku: '沈星回 香薰蜡烛 ×1', amount: 75,  receivedAt: '2026-05-08', rated: true },
  { id: 'd2', ownerName: '团长大人', ownerAvatar: '团', groupName: '偶像梦幻祭 4月新谷代购团', sku: '朔间凛月 吧唧 ×1 + 海报 ×1', amount: 64, receivedAt: '2026-04-22', rated: true },
  { id: 'd3', ownerName: '月光团', ownerAvatar: '月', groupName: '名侦探柯南 一番赏代抽',     sku: 'D 赏挂件 ×2', amount: 56, receivedAt: '2026-04-15', rated: false },
];

export default function MemberDonePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
          共 <Text style={{ fontWeight: '800' }}>{MOCK.length}</Text> 单已确认收货 · 平台已放款给团长
        </Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 30 + insets.bottom, gap: 10 }}>
        <View style={s.banner}>
          <Ionicons name="checkmark-done-circle-outline" size={14} color="#374151" />
          <Text style={s.bannerText}>已完成的订单 30 天内可在此查看 · 后续会归档到团长信誉</Text>
        </View>

        {MOCK.map((o) => (
          <View key={o.id} style={s.card}>
            <View style={s.row1}>
              <View style={s.avatar}><Text style={s.avatarText}>{o.ownerAvatar}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={s.owner}>{o.ownerName}</Text>
                  <View style={s.statusPill}>
                    <Ionicons name="checkmark-circle" size={11} color="#6B7280" />
                    <Text style={s.statusText}>已完成</Text>
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
              <Ionicons name="time-outline" size={11} color="#9CA3AF" />
              <Text style={s.metaText}>确认收货:{o.receivedAt}</Text>
            </View>

            <View style={s.actionRow}>
              <Pressable
                style={s.btnGhost}
                onPress={() => Alert.alert('查看订单', `${o.groupName}\n\n${o.sku}\n¥${o.amount.toFixed(2)}`)}
              >
                <Text style={s.btnGhostText}>查看详情</Text>
              </Pressable>
              {o.rated ? (
                <View style={[s.btnGhost, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
                  <Ionicons name="star" size={12} color="#9CA3AF" />
                  <Text style={[s.btnGhostText, { color: '#9CA3AF' }]}>已评价</Text>
                </View>
              ) : (
                <Pressable
                  style={s.btnPrimary}
                  onPress={() => Alert.alert('去评价', `给「${o.ownerName}」一个赞 · 帮新团员看到靠谱团长`)}
                >
                  <Ionicons name="star-outline" size={12} color="#FFF" />
                  <Text style={s.btnPrimaryText}>去评价</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}

        {MOCK.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="albums-outline" size={36} color="#E5E7EB" />
            <Text style={s.emptyText}>暂无已完成订单</Text>
            <Pressable style={s.emptyBtn} onPress={() => router.push('/(main)/' as any)}>
              <Text style={s.emptyBtnText}>去首页看看</Text>
            </Pressable>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  owner: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  statusText: { fontSize: 10, color: '#6B7280', fontWeight: '700' },
  groupName: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  row2: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 8, gap: 6,
  },
  sku: { flex: 1, fontSize: 12, color: '#1E1B4B' },
  amount: { fontSize: 14, fontWeight: '800', color: '#1E1B4B' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 11, color: '#9CA3AF' },

  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  btnGhost: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 16, borderWidth: 1, borderColor: '#D8B4FE',
    backgroundColor: '#FAF5FF',
  },
  btnGhostText: { fontSize: 12, fontWeight: '700', color: PURPLE },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 16, backgroundColor: PURPLE,
  },
  btnPrimaryText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
  emptyBtn: {
    marginTop: 10, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16, backgroundColor: PURPLE,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
});
