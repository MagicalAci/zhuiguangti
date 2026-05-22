import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../src/store/useStore';

const PURPLE = '#7C3AED';

export default function ManagedOrdersPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groups, orders } = useStore();

  // mock：被授权管理的拼团
  const managedGroups = useMemo(
    () => groups.filter((g) => g.stage !== 'completed').slice(0, 3),
    [groups]
  );

  const stats = useMemo(() => {
    const ongoing  = orders.filter((o) => ['pending_deposit','deposit_paid','pending_final','final_paid'].includes(o.status)).length;
    const toShip   = orders.filter((o) => o.status === 'final_paid' || o.status === 'shipping').length;
    const shipped  = orders.filter((o) => o.status === 'shipped').length;
    const received = orders.filter((o) => o.status === 'completed').length;
    return { ongoing, toShip, shipped, received };
  }, [orders]);

  return (
    <View style={s.screen}>
      {/* —— 顶栏 —— */}
      <LinearGradient
        colors={[PURPLE, '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.topRow}>
          <Pressable style={s.iconBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <Text style={s.title}>我管理的</Text>
          <Pressable
            style={s.iconBtn}
            hitSlop={10}
            onPress={() => Alert.alert('管理员权限',
              '作为管理员，你可以：\n• 一键催款 / 撤排 / 手动分配\n• 发货管理 / 物流跟踪\n• 与团长共同管理本团\n\n你不能：\n• 解散拼团\n• 修改提现账户')}
          >
            <Ionicons name="help-circle-outline" size={20} color="#FFF" />
          </Pressable>
        </View>

        <View style={s.headerInfo}>
          <View style={s.headerBadge}>
            <Ionicons name="ribbon" size={12} color="#FFF" />
            <Text style={s.headerBadgeText}>管理员</Text>
          </View>
          <Text style={s.headerSub}>
            正在管理 {managedGroups.length} 个团 · 拥有团长一致权限（解散/收款除外）
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}>
        {/* —— 我的订单（与团长视角一致） —— */}
        <SectionTitle title="我的订单" subtitle="按状态切换处理" />
        <View style={s.orderChipWrap}>
          <OrderChip label="进行中" value={stats.ongoing}  color="#7C3AED" bg="#F5F3FF" highlight
            onPress={() => router.push('/orders/in-progress' as any)}
          />
          <OrderChip label="待发货" value={stats.toShip}   color="#3B82F6" bg="#EFF6FF"
            onPress={() => router.push('/group/shipping' as any)}
          />
          <OrderChip label="已发货" value={stats.shipped}  color="#10B981" bg="#ECFDF5"
            onPress={() => router.push('/group/shipping' as any)}
          />
          <OrderChip label="已收货" value={stats.received} color="#6B7280" bg="#F1F5F9"
            onPress={() => Alert.alert('已收货', '团员确认收货后的订单')}
          />
        </View>

        <Text style={s.tipText}>⚡ 哈啰平台代收 · 无需审核凭证，专注催款与发货即可</Text>

        {/* —— 我管理的拼团 —— */}
        <SectionTitle title="我管理的拼团" subtitle={`共 ${managedGroups.length} 个`} />
        <View style={s.groupList}>
          {managedGroups.map((g) => (
            <TouchableOpacity
              key={g.id}
              activeOpacity={0.85}
              style={s.groupRow}
              onPress={() => router.push(`/group/${g.id}` as any)}
            >
              <View style={s.groupAvatar}>
                <Ionicons name="car" size={20} color={PURPLE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.groupName} numberOfLines={1}>{g.name}</Text>
                <Text style={s.groupMeta}>团长：团长大人 · {g.memberCount} 人上车</Text>
              </View>
              <View style={s.adminPill}>
                <Ionicons name="ribbon" size={10} color="#FFF" />
                <Text style={s.adminPillText}>管理员</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C4C4D4" />
            </TouchableOpacity>
          ))}
          {managedGroups.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="ribbon-outline" size={36} color="#E5E7EB" />
              <Text style={s.emptyText}>暂无被授权管理的拼团</Text>
              <Text style={s.emptySub}>团长发起邀请后这里会出现</Text>
            </View>
          )}
        </View>

        {/* —— 工具区 —— */}
        <SectionTitle title="工具" subtitle="" />
        <View style={s.toolGrid}>
          <ToolCard
            icon="bar-chart"
            iconColor={PURPLE}
            iconBg="#F5F3FF"
            title="数据看板"
            sub="进度 / 凭证 / 物流"
            onPress={() => Alert.alert('数据看板', '管理员视角的拼团数据汇总')}
          />
          <ToolCard
            icon="chatbubbles"
            iconColor="#10B981"
            iconBg="#ECFDF5"
            title="联系团长"
            sub="对接团长解决疑难"
            onPress={() => Alert.alert('联系团长', '已唤起微信')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

/* ============ 共用子组件 ============ */
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.sectionTitle}>
      <Text style={s.sectionTitleText}>{title}</Text>
      {subtitle ? <Text style={s.sectionSubText}>{subtitle}</Text> : null}
    </View>
  );
}

function OrderChip({ label, value, color, bg, highlight, onPress }: {
  label: string; value: number; color: string; bg: string; highlight?: boolean; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={[chipS.chip, { backgroundColor: bg }]} activeOpacity={0.8} onPress={onPress}>
      <Text style={[chipS.num, { color }]}>{value}</Text>
      <View style={chipS.labelRow}>
        <Text style={chipS.label}>{label}</Text>
        {highlight && value > 0 && <View style={chipS.dot} />}
      </View>
    </TouchableOpacity>
  );
}

function ToolCard({ icon, iconColor, iconBg, title, sub, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string;
  title: string; sub: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.toolCard} activeOpacity={0.85} onPress={onPress}>
      <View style={[s.toolIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.toolTitle}>{title}</Text>
        <Text style={s.toolSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#C4C4D4" />
    </TouchableOpacity>
  );
}

/* ============ Styles ============ */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },

  header: {
    paddingHorizontal: 16, paddingBottom: 18,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },

  headerInfo: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  headerSub: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.9)' },

  sectionTitle: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 10, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  sectionTitleText: { fontSize: 16, fontWeight: '700', color: '#1E1B4B' },
  sectionSubText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  orderChipWrap: { flexDirection: 'row', gap: 7, paddingHorizontal: 14 },
  tipText: { fontSize: 11, color: '#9CA3AF', marginTop: 10, paddingHorizontal: 18 },

  groupList: { paddingHorizontal: 14, gap: 8 },
  groupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  groupAvatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  groupName: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  groupMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  adminPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
    backgroundColor: PURPLE,
  },
  adminPillText: { fontSize: 10, fontWeight: '700', color: '#FFF' },

  toolGrid: { paddingHorizontal: 14, gap: 10 },
  toolCard: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  toolIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  toolSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  empty: { alignItems: 'center', paddingVertical: 36, gap: 4 },
  emptyText: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginTop: 6 },
  emptySub: { fontSize: 11, color: '#9CA3AF' },
});

const chipS = StyleSheet.create({
  chip: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  num: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  label: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F43F5E' },
});
