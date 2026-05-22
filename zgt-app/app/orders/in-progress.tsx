import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Modal, Alert, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../../src/store/useStore';
import type { GroupStage } from '../../src/types';
import {
  canonicalGroupStage,
  CANONICAL_STAGE_META,
  type CanonicalGroupStage,
} from '../../src/utils/helpers';

/** 策划案 §3.1.x「我当团长」-「我的订单」-「进行中订单管理页」 */

const PURPLE = '#7C3AED';
const PURPLE_DARK = '#5B21B6';
const PINK = '#F43F5E';

// V1 demo「进行中」订单页只包含 5 个未发货前的状态:
//   gathering / payDeposit / payFull / finalPay / shipFee
// 发货后的状态(待发货 / 待收货 / 已完成)挂在 profile 上独立 tile,跳独立的页面
type Status = 'gathering' | 'payDeposit' | 'payFull' | 'finalPay' | 'shipFee';

interface OrderItem {
  id: string;
  groupId: string;
  userName: string;
  userAvatar: string;
  groupName: string;
  sku: string;
  amount: number;
  status: Status;
  finalNotified?: boolean;
  shipFeeReason?: string;
  userNote?: string;
  userCity?: string;
  userAddress?: string;
}

const STATUS_CFG: Record<Status, { label: string; emoji: string; color: string; bg: string; icon: string }> = {
  gathering:  { label: '成团中',   emoji: '🧩', color: '#3B82F6', bg: '#EFF6FF', icon: 'people-outline' },
  payDeposit: { label: '待付定金', emoji: '💵', color: PINK,      bg: '#FFF1F2', icon: 'cash-outline' },
  payFull:    { label: '待支付',   emoji: '💳', color: PINK,      bg: '#FFF1F2', icon: 'card-outline' },
  finalPay:   { label: '待付尾款', emoji: '💰', color: '#A855F7', bg: '#F5F3FF', icon: 'wallet-outline' },
  shipFee:    { label: '待补邮',   emoji: '📦', color: '#D97706', bg: '#FFFBEB', icon: 'cube-outline' },
};

const ALL_STATUSES: Status[] = ['gathering', 'payDeposit', 'payFull', 'finalPay', 'shipFee'];

// 顶部状态 tile
const TILE_STATUSES: Status[] = ['gathering', 'payDeposit', 'payFull', 'finalPay', 'shipFee'];

// —— mock 订单数据 ——
const MOCK_ORDERS: OrderItem[] = [
  { id: 'o1',  groupId: 'g1', userName: '星月',   userAvatar: '星', groupName: '偶像梦幻祭 6月新谷代购团', sku: '朔间零 吧唧 ×1',            amount: 42,    status: 'gathering',   userNote: '希望包装仔细一点～', userCity: '上海', userAddress: '浦东新区张杨路500号' },
  { id: 'o2',  groupId: 'g1', userName: '七七',   userAvatar: '七', groupName: '偶像梦幻祭 6月新谷代购团', sku: '天城一彩 吧唧 ×1',          amount: 42,    status: 'gathering',   userNote: '周末不在家请放快递柜', userCity: '北京', userAddress: '朝阳区望京SOHO' },
  { id: 'o3',  groupId: 'g1', userName: '小鹿',   userAvatar: '小', groupName: '偶像梦幻祭 6月新谷代购团', sku: '冰鹰 立牌 ×1',              amount: 35,    status: 'payDeposit',  userCity: '广州', userAddress: '天河区体育西路' },
  { id: 'o4',  groupId: 'leader_sampling', userName: '柚子',   userAvatar: '柚', groupName: '名侦探柯南 一番赏代抽',     sku: '柯南 A 赏立牌 ×1',          amount: 95,    status: 'payFull',     userCity: '深圳', userAddress: '南山区科技园' },
  { id: 'o5',  groupId: 'member_gathering', userName: '棉花糖', userAvatar: '棉', groupName: '原神 4.5 卡池代抽',         sku: '钟离 挂件 ×1',              amount: 47.25, status: 'finalPay', finalNotified: false, userNote: '急用', userCity: '杭州', userAddress: '西湖区文三路' },
  { id: 'o6',  groupId: 'member_gathering', userName: '阿澈',   userAvatar: '阿', groupName: '原神 4.5 卡池代抽',         sku: '阿蕾奇诺 立牌 ×1',           amount: 47.25, status: 'finalPay', finalNotified: true, userCity: '成都', userAddress: '锦江区春熙路' },
  { id: 'o7',  groupId: 'member_gathering', userName: '夏目',   userAvatar: '夏', groupName: '原神 4.5 卡池代抽',         sku: '钟离 立牌 ×1',               amount: 47.25, status: 'finalPay', finalNotified: true, userCity: '武汉', userAddress: '武昌区中南路' },
  { id: 'o11', groupId: 'g1', userName: '团子',   userAvatar: '团', groupName: '偶像梦幻祭 6月新谷代购团', sku: '限定盲盒 ×1',                amount: 127,   status: 'payDeposit',  userNote: '盲盒不要拆！', userCity: '南京', userAddress: '鼓楼区中山路' },
  { id: 'o13', groupId: 'g1', userName: '星月',   userAvatar: '星', groupName: '偶像梦幻祭 6月新谷代购团', sku: '📦 补邮费 · 货物超重邮费上浮', amount: 5,     status: 'shipFee', shipFeeReason: '包裹超过 3kg,顺丰实际邮费上浮', userCity: '上海', userAddress: '浦东新区张杨路500号' },
  { id: 'o14', groupId: 'g1', userName: '七七',   userAvatar: '七', groupName: '偶像梦幻祭 6月新谷代购团', sku: '📦 补邮费 · 货物超重邮费上浮', amount: 5,     status: 'shipFee', shipFeeReason: '包裹超过 3kg,顺丰实际邮费上浮', userCity: '北京', userAddress: '朝阳区望京SOHO' },
];

export default function InProgressOrdersPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groupId, groupName } = useLocalSearchParams<{ groupId?: string; groupName?: string }>();
  const scopedGroupId = typeof groupId === 'string' ? groupId : undefined;
  const scopedGroupName = typeof groupName === 'string' ? groupName : undefined;

  // —— 状态筛选（多选） ——
  // null / 空集合 = 全部
  const [selectedStatuses, setSelectedStatuses] = useState<Set<Status>>(new Set());
  // 筛选 ActionSheet
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<Set<Status>>(new Set());
  // —— 拼团筛选（单选）——
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [groupFilterOpen, setGroupFilterOpen] = useState(false);

  // —— 批量模式 ——
  const [batchMode, setBatchMode] = useState(false);
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());

  // —— 删除二次确认 ——
  const [confirmDelete, setConfirmDelete] = useState(false);
  // —— 一键提醒 弹层(仅"待付尾款 · finalNotified=false"时可用) ——
  const [remindOpen, setRemindOpen] = useState<null | 'finalPay'>(null);
  const [remindAmount, setRemindAmount] = useState('0');
  const [remindDeadline, setRemindDeadline] = useState('2026-05-25');
  const [remindNote, setRemindNote] = useState('');

  // —— 团长操作（从 group detail 迁移过来） ——
  const [stageEditOpen, setStageEditOpen] = useState(false);
  const [collectConfirmOpen, setCollectConfirmOpen] = useState<null | 'deposit' | 'final' | 'full'>(null);

  // —— 数据 ——
  const [orders, setOrders] = useState<OrderItem[]>(MOCK_ORDERS);

  // 从 store 取当前团,把订单状态按团 stage 投影
  const groups = useStore((st) => st.groups);
  const updateGroupStage = useStore((st) => st.updateGroupStage);
  const scopedGroup = useMemo(
    () => (scopedGroupId ? groups.find((g) => g.id === scopedGroupId) : undefined),
    [groups, scopedGroupId],
  );
  const scopedStage: CanonicalGroupStage | undefined = scopedGroup
    ? canonicalGroupStage(scopedGroup.stage)
    : undefined;
  const scopedPayMode: 'deposit' | 'full' = scopedGroup
    ? (scopedGroup.payMode ?? ((scopedGroup.depositRate ?? 0) > 0 ? 'deposit' : 'full'))
    : 'deposit';

  const projectStatus = (
    raw: OrderItem,
    stage: CanonicalGroupStage,
    payMode: 'deposit' | 'full',
  ): OrderItem & { _hidden?: boolean } => {
    if (raw.status === 'shipFee') {
      return stage === 'shipping' ? raw : { ...raw, _hidden: true };
    }
    switch (stage) {
      case 'gathering':
        return { ...raw, status: 'gathering', finalNotified: undefined };
      case 'deposit_collecting':
        return { ...raw, status: 'payDeposit', finalNotified: undefined };
      case 'full_collecting':
        return { ...raw, status: 'payFull', finalNotified: undefined };
      case 'final_collecting':
        return { ...raw, status: 'finalPay', finalNotified: true };
      case 'shipping':
        return raw;
      case 'closed':
        return { ...raw, status: payMode === 'full' ? 'payFull' : 'finalPay', finalNotified: true };
      default:
        return raw;
    }
  };

  // scopedGroupId 但 mock 里没数据时,按团 stage 兜底造 1-3 笔示例订单 (demo)
  const fallbackOrders = useMemo<OrderItem[]>(() => {
    if (!scopedGroup || !scopedStage) return [];
    const hits = orders.filter((o) => o.groupId === scopedGroup.id);
    if (hits.length > 0) return [];
    const tops = (scopedGroup.products ?? []).slice(0, 3);
    if (tops.length === 0) return [];
    const fakeMembers: { name: string; avatar: string }[] = [
      { name: '星月', avatar: '星' },
      { name: '七七', avatar: '七' },
      { name: '小鹿', avatar: '小' },
    ];
    return tops.map((p, i) => {
      const m = fakeMembers[i % fakeMembers.length];
      return projectStatus(
        {
          id: `__mock_${scopedGroup.id}_${i}`,
          groupId: scopedGroup.id,
          userName: m.name,
          userAvatar: m.avatar,
          groupName: scopedGroup.name,
          sku: `${p.name} ×1`,
          amount: p.price ?? 60,
          status: 'gathering',
        },
        scopedStage,
        scopedPayMode,
      ) as OrderItem;
    });
  }, [scopedGroup, scopedStage, scopedPayMode, orders]);

  const baseOrders = useMemo(() => {
    if (!scopedGroupId) return orders;
    const hits = orders.filter((o) => o.groupId === scopedGroupId);
    const source = hits.length > 0 ? hits : fallbackOrders;
    if (!scopedStage) return source;
    return source
      .map((o) => projectStatus(o, scopedStage, scopedPayMode))
      .filter((o) => !(o as any)._hidden);
  }, [orders, scopedGroupId, scopedStage, scopedPayMode, fallbackOrders]);

  const scopedGroupLabel = scopedGroup?.name ?? scopedGroupName ?? baseOrders[0]?.groupName ?? '当前拼团';

  const counts = useMemo(() => {
    const c: Record<Status, number> = { gathering: 0, payDeposit: 0, payFull: 0, finalPay: 0, shipFee: 0 };
    baseOrders.forEach((o) => { c[o.status] += 1; });
    return c;
  }, [baseOrders]);

  const filtered = useMemo(() => {
    let list = baseOrders;
    if (selectedStatuses.size > 0) list = list.filter((o) => selectedStatuses.has(o.status));
    if (!scopedGroupId && groupFilter !== 'all') list = list.filter((o) => o.groupName === groupFilter);
    return list;
  }, [baseOrders, selectedStatuses, scopedGroupId, groupFilter]);

  // 拼团选项 & 每团订单数
  const groupOptions = useMemo(() => {
    const map = new Map<string, number>();
    baseOrders.forEach((o) => map.set(o.groupName, (map.get(o.groupName) ?? 0) + 1));
    return Array.from(map.entries());
  }, [baseOrders]);

  // —— Tile 点击：toggle 筛选 ——
  const toggleStatus = (st: Status) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st); else next.add(st);
      return next;
    });
  };

  // —— 进入筛选 ActionSheet 时同步 draft ——
  const openFilter = () => {
    setFilterDraft(new Set(selectedStatuses));
    setFilterOpen(true);
  };
  const toggleFilterDraft = (st: Status) => {
    setFilterDraft((prev) => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st); else next.add(st);
      return next;
    });
  };
  const applyFilter = () => {
    setSelectedStatuses(new Set(filterDraft));
    setFilterOpen(false);
  };
  const clearFilter = () => {
    setFilterDraft(new Set());
  };

  // —— 批量模式 ——
  const enterBatch = () => {
    setBatchMode(true);
    setBatchSelected(new Set());
  };
  const exitBatch = () => {
    setBatchMode(false);
    setBatchSelected(new Set());
  };
  const toggleBatch = (id: string) => {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    setBatchSelected(new Set(filtered.map((o) => o.id)));
  };

  // —— 批量删除 ——
  const handleDelete = () => {
    setOrders((prev) => prev.filter((o) => !batchSelected.has(o.id)));
    setConfirmDelete(false);
    exitBatch();
  };

  // —— 批量一键提醒：仅当所选订单全部为 shipFee 或全部为 finalPay 才可点 ——
  const selectedItems = useMemo(
    () => orders.filter((o) => batchSelected.has(o.id)),
    [orders, batchSelected]
  );
  const selectedStatusSet = useMemo(
    () => new Set(selectedItems.map((o) => o.status)),
    [selectedItems]
  );
  // 仅 finalPay 且单一状态时可一键提醒补尾款
  const remindable: Status | null = useMemo(() => {
    if (selectedStatusSet.size !== 1) return null;
    const only = [...selectedStatusSet][0];
    if (only === 'finalPay') return only;
    return null;
  }, [selectedStatusSet]);
  const remindDisableReason = useMemo(() => {
    if (selectedItems.length === 0) return '请先勾选订单';
    if (selectedStatusSet.size > 1) return '所选订单含多个状态,请单一状态批量提醒';
    if (!remindable) return '仅"待付尾款"可一键提醒(其余状态请回拼团详情页一键通知收款)';
    return '';
  }, [selectedItems, selectedStatusSet, remindable]);

  const openRemind = () => {
    if (!remindable) {
      Alert.alert('无法一键提醒', remindDisableReason);
      return;
    }
    setRemindAmount('47.25');
    setRemindOpen(remindable);
  };
  const sendRemind = () => {
    Alert.alert(
      '已发送',
      `已向 ${batchSelected.size} 位团员发送尾款补付通知。\n\n截止 ${remindDeadline}\n金额 ¥${remindAmount}`
    );
    setRemindOpen(null);
    exitBatch();
  };

  // —— 单击订单(非批量)的跳转 ——
  const onPressOrder = (o: OrderItem) => {
    if (batchMode) { toggleBatch(o.id); return; }
    switch (o.status) {
      case 'finalPay':
        setBatchSelected(new Set([o.id]));
        setRemindAmount('47.25');
        setRemindOpen('finalPay');
        break;
      case 'payDeposit':
        Alert.alert('待付定金', `${o.userName} 已收到付定金通知 · 等团员完成微信支付`);
        break;
      case 'payFull':
        Alert.alert('待支付', `${o.userName} 已收到付款通知 · 等团员完成微信支付`);
        break;
      case 'gathering':
        Alert.alert('成团中', `${o.userName} 已下单 · 等团长发起收款`);
        break;
      case 'shipFee':
        Alert.alert('待补邮', `${o.userName} 已收到补邮费通知 ¥${o.amount.toFixed(2)} · 用于:${o.shipFeeReason ?? '货物过大邮费超出预算'}`);
        break;
    }
  };

  const filterLabel = useMemo(() => {
    if (selectedStatuses.size === 0) return '筛选：全部';
    if (selectedStatuses.size === 1) {
      const only = [...selectedStatuses][0];
      return `筛选：${STATUS_CFG[only].label}`;
    }
    return `筛选：${selectedStatuses.size} 项`;
  }, [selectedStatuses]);

  return (
    <View style={s.screen}>
      {/* —— 顶部 header —— */}
      <LinearGradient
        colors={[PINK, '#FB7185']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.topRow}>
          <Pressable style={s.iconBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <Text style={s.title}>{scopedGroupId ? '团订单' : '进行中订单'}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* 6 状态 tile · 仅全局模式显示 */}
        {!scopedGroupId && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tileRow}>
            {TILE_STATUSES.map((st) => {
              const cfg = STATUS_CFG[st];
              const on = selectedStatuses.has(st);
              return (
                <Pressable
                  key={st}
                  style={[s.tile, on && s.tileActive]}
                  onPress={() => toggleStatus(st)}
                >
                  <Text style={s.tileEmoji}>{cfg.emoji}</Text>
                  <Text style={s.tileLabel}>{cfg.label}</Text>
                  <Text style={s.tileNum}>{counts[st]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </LinearGradient>

      {/* —— 团阶段 · 左右布局 —— */}
      {scopedGroup && scopedStage && (
        <View style={s.stageBar}>
          <View style={s.stageBarLeft}>
            <View style={[s.stageBarDot, { backgroundColor: CANONICAL_STAGE_META[scopedStage].color }]} />
            <Text style={s.stageBarLabel}>当前阶段</Text>
            <Text style={[s.stageBarValue, { color: CANONICAL_STAGE_META[scopedStage].color }]}>
              {CANONICAL_STAGE_META[scopedStage].label}
            </Text>
          </View>
          <Pressable style={s.stageBarBtn} onPress={() => setStageEditOpen(true)}>
            <Ionicons name="swap-horizontal-outline" size={15} color={PURPLE} />
            <Text style={s.stageBarBtnText}>切换阶段</Text>
          </Pressable>
        </View>
      )}

      {/* —— 操作工具栏 · 仅全局模式显示 —— */}
      {!scopedGroupId && (
        <View style={s.toolbar}>
          <Pressable style={s.toolBtn} onPress={openFilter}>
            <Ionicons name="filter" size={14} color={PURPLE} />
            <Text style={s.toolBtnText} numberOfLines={1}>{filterLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={PURPLE} />
          </Pressable>

          <Pressable
            style={s.toolBtn}
            onPress={() => setGroupFilterOpen(true)}
          >
            <Ionicons name="people-outline" size={14} color={PURPLE} />
            <Text style={s.toolBtnText} numberOfLines={1}>
              {groupFilter === 'all' ? '全部拼团' : groupFilter.length > 8 ? groupFilter.slice(0, 8) + '…' : groupFilter}
            </Text>
            <Ionicons name="chevron-down" size={14} color={PURPLE} />
          </Pressable>

          <Pressable
            style={[s.toolBtn, batchMode && s.toolBtnActive]}
            onPress={() => (batchMode ? exitBatch() : enterBatch())}
          >
            <Ionicons name={batchMode ? 'close' : 'checkbox-outline'} size={14} color={batchMode ? '#FFF' : PURPLE} />
            <Text style={[s.toolBtnText, batchMode && { color: '#FFF' }]}>
              {batchMode ? '退出批量' : '批量'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* —— 订单列表 —— */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 6,
          paddingBottom: batchMode ? 110 + insets.bottom : 24 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 团阶段提示卡片已移除 · 从团详情进来不需要重复展示 */}

        {filtered.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="filter-outline" size={36} color="#E5E7EB" />
            <Text style={s.emptyText}>当前筛选下暂无订单</Text>
            <Pressable onPress={() => setSelectedStatuses(new Set())} style={s.emptyBtn}>
              <Text style={s.emptyBtnText}>清除筛选</Text>
            </Pressable>
          </View>
        )}

        {filtered.map((o) => (
          <OrderRow
            key={o.id}
            order={o}
            batchMode={batchMode}
            checked={batchSelected.has(o.id)}
            onPress={() => onPressOrder(o)}
          />
        ))}
      </ScrollView>

      {/* —— 批量模式底部操作栏 —— */}
      {batchMode && (
        <View style={[s.batchBar, { paddingBottom: 10 + insets.bottom }]}>
          <View style={s.batchInfo}>
            <Text style={s.batchCount}>已选 <Text style={{ color: PINK, fontWeight: '800' }}>{batchSelected.size}</Text> 单</Text>
            <Pressable onPress={selectAll}>
              <Text style={s.batchAll}>全选</Text>
            </Pressable>
          </View>
          <View style={s.batchActions}>
            <Pressable
              style={[s.batchBtn, s.batchBtnDanger, batchSelected.size === 0 && { opacity: 0.4 }]}
              disabled={batchSelected.size === 0}
              onPress={() => setConfirmDelete(true)}
            >
              <Ionicons name="trash-outline" size={14} color="#EF4444" />
              <Text style={[s.batchBtnText, { color: '#EF4444' }]}>删除 {batchSelected.size} 单</Text>
            </Pressable>
            <Pressable
              style={[s.batchBtn, s.batchBtnPrimary, !remindable && { opacity: 0.5 }]}
              onPress={openRemind}
            >
              <Ionicons name="notifications-outline" size={14} color="#FFF" />
              <Text style={[s.batchBtnText, { color: '#FFF' }]}>一键提醒</Text>
            </Pressable>
          </View>
          {!remindable && batchSelected.size > 0 && (
            <Text style={s.batchTip}>⚠️ {remindDisableReason}</Text>
          )}
        </View>
      )}

      {/* —— 吸底 CTA（根据团阶段变化） —— */}
      {scopedGroup && scopedStage && scopedStage !== 'closed' && !batchMode && (() => {
        const ctaMap: Record<string, { label: string; icon: string; color: string; onPress: () => void }> = {
          gathering:           { label: '分享团', icon: 'share-social', color: '#3B82F6', onPress: () => Alert.alert('分享', '已生成分享链接') },
          deposit_collecting:  { label: '一键催收', icon: 'megaphone', color: PINK, onPress: () => setCollectConfirmOpen(scopedPayMode === 'full' ? 'full' : 'deposit') },
          final_collecting:    { label: '一键催收', icon: 'megaphone', color: '#A855F7', onPress: () => setCollectConfirmOpen('final') },
          shipping:            { label: '导出发货表', icon: 'download-outline', color: '#D97706', onPress: () => Alert.alert('导出', '发货表已生成') },
        };
        const cta = ctaMap[scopedStage];
        if (!cta) return null;
        return (
          <View style={[s.stickyCtaWrap, { paddingBottom: 12 + insets.bottom }]}>
            <Pressable style={[s.stickyCta, { backgroundColor: cta.color }]} onPress={cta.onPress}>
              <Ionicons name={cta.icon as any} size={18} color="#FFF" />
              <Text style={s.stickyCtaText}>{cta.label}</Text>
            </Pressable>
          </View>
        );
      })()}

      {/* ============ 拼团筛选 ActionSheet ============ */}
      <Modal visible={groupFilterOpen} transparent animationType="slide" onRequestClose={() => setGroupFilterOpen(false)}>
        <Pressable style={sheetS.overlay} onPress={() => setGroupFilterOpen(false)}>
          <Pressable style={sheetS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={sheetS.handle} />
            <Text style={sheetS.title}>按拼团筛选</Text>
            <Text style={sheetS.sub}>只看某一个拼团的进行中订单</Text>

            <ScrollView style={{ maxHeight: 360, marginTop: 14 }} contentContainerStyle={{ paddingBottom: 8 }}>
              <Pressable
                style={[sheetS.row, groupFilter === 'all' && { backgroundColor: '#F5F3FF' }]}
                onPress={() => { setGroupFilter('all'); setGroupFilterOpen(false); }}
              >
                <View style={[sheetS.checkbox, groupFilter === 'all' && sheetS.checkboxOn]}>
                  {groupFilter === 'all' && <Ionicons name="checkmark" size={12} color="#FFF" />}
                </View>
                <Text style={sheetS.rowEmoji}>🗂️</Text>
                <Text style={sheetS.rowLabel}>全部拼团</Text>
                <View style={[sheetS.rowCount, { backgroundColor: '#F5F3FF' }]}>
                  <Text style={[sheetS.rowCountText, { color: PURPLE }]}>{baseOrders.length}</Text>
                </View>
              </Pressable>

              {groupOptions.map(([gn, cnt]) => {
                const on = groupFilter === gn;
                return (
                  <Pressable
                    key={gn}
                    style={[sheetS.row, on && { backgroundColor: '#F5F3FF' }]}
                    onPress={() => { setGroupFilter(gn); setGroupFilterOpen(false); }}
                  >
                    <View style={[sheetS.checkbox, on && sheetS.checkboxOn]}>
                      {on && <Ionicons name="checkmark" size={12} color="#FFF" />}
                    </View>
                    <Text style={sheetS.rowEmoji}>📦</Text>
                    <Text style={sheetS.rowLabel} numberOfLines={1}>{gn}</Text>
                    <View style={[sheetS.rowCount, { backgroundColor: '#FFF1F2' }]}>
                      <Text style={[sheetS.rowCountText, { color: PINK }]}>{cnt}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable style={sheetS.cancelBtn} onPress={() => { setGroupFilter('all'); setGroupFilterOpen(false); }}>
                <Text style={sheetS.cancelText}>清除筛选</Text>
              </Pressable>
              <Pressable style={sheetS.applyBtn} onPress={() => setGroupFilterOpen(false)}>
                <Text style={sheetS.applyText}>完成</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============ 筛选 ActionSheet ============ */}
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={sheetS.overlay} onPress={() => setFilterOpen(false)}>
          <Pressable style={sheetS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={sheetS.handle} />
            <Text style={sheetS.title}>筛选订单状态</Text>
            <Text style={sheetS.sub}>支持多选 · 不选 = 显示全部进行中订单</Text>
            <View style={{ marginTop: 14, gap: 4 }}>
              {ALL_STATUSES.map((st) => {
                const cfg = STATUS_CFG[st];
                const on = filterDraft.has(st);
                return (
                  <Pressable key={st} style={sheetS.row} onPress={() => toggleFilterDraft(st)}>
                    <View style={[sheetS.checkbox, on && sheetS.checkboxOn]}>
                      {on && <Ionicons name="checkmark" size={12} color="#FFF" />}
                    </View>
                    <Text style={sheetS.rowEmoji}>{cfg.emoji}</Text>
                    <Text style={sheetS.rowLabel}>{cfg.label}</Text>
                    <View style={[sheetS.rowCount, { backgroundColor: cfg.bg }]}>
                      <Text style={[sheetS.rowCountText, { color: cfg.color }]}>{counts[st]}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={sheetS.btnRow}>
              <Pressable style={sheetS.cancelBtn} onPress={clearFilter}>
                <Text style={sheetS.cancelText}>清空</Text>
              </Pressable>
              <Pressable style={sheetS.confirmBtn} onPress={applyFilter}>
                <Text style={sheetS.confirmText}>确定（{filterDraft.size}）</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============ 删除二次确认 ============ */}
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <Pressable style={confirmS.overlay} onPress={() => setConfirmDelete(false)}>
          <Pressable style={confirmS.card} onPress={(e) => e.stopPropagation()}>
            <View style={confirmS.iconWrap}>
              <Ionicons name="warning" size={26} color="#EF4444" />
            </View>
            <Text style={confirmS.title}>删除 {batchSelected.size} 单</Text>
            <Text style={confirmS.sub}>
              确认从「进行中」移除这 {batchSelected.size} 单订单？
              {'\n'}该操作不可撤销，相关团员将收到「订单已被撤除」通知。
            </Text>
            <View style={confirmS.btnRow}>
              <Pressable style={confirmS.cancelBtn} onPress={() => setConfirmDelete(false)}>
                <Text style={confirmS.cancelText}>取消</Text>
              </Pressable>
              <Pressable style={confirmS.dangerBtn} onPress={handleDelete}>
                <Ionicons name="trash" size={14} color="#FFF" />
                <Text style={confirmS.dangerText}>确认删除</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============ 一键提醒 弹层 ============ */}
      <Modal visible={!!remindOpen} transparent animationType="slide" onRequestClose={() => setRemindOpen(null)}>
        <Pressable style={sheetS.overlay} onPress={() => setRemindOpen(null)}>
          <Pressable style={sheetS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={sheetS.handle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="wallet-outline" size={20} color={PINK} />
              <Text style={sheetS.title}>通知补尾款</Text>
            </View>

            <View style={remindS.previewCard}>
              <Text style={remindS.previewLabel}>关联团员</Text>
              <Text style={remindS.previewValue}>{batchSelected.size} 位待补尾款</Text>
              <Text style={remindS.previewMeta}>
                总金额:¥{(parseFloat(remindAmount || '0') * batchSelected.size).toFixed(2)}
              </Text>
            </View>

            <Text style={remindS.fieldLabel}>截止时间</Text>
            <View style={remindS.field}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <TextInput
                style={remindS.fieldInput}
                value={remindDeadline}
                onChangeText={setRemindDeadline}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#C4C4D4"
              />
              <Text style={remindS.fieldHint}>默认 7 天后</Text>
            </View>

            <Text style={remindS.fieldLabel}>金额（按规则预填）</Text>
            <View style={remindS.field}>
              <Text style={{ color: '#1E1B4B', fontWeight: '700' }}>¥</Text>
              <TextInput
                style={remindS.fieldInput}
                value={remindAmount}
                onChangeText={(v) => setRemindAmount(v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={remindS.fieldLabel}>补充说明（可选）</Text>
            <TextInput
              style={[remindS.fieldInput, { backgroundColor: '#F5F5FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }]}
              value={remindNote}
              onChangeText={setRemindNote}
              placeholder="例如：成团时间临近，请尽快补款"
              placeholderTextColor="#C4C4D4"
              multiline
            />

            <View style={sheetS.btnRow}>
              <Pressable style={sheetS.cancelBtn} onPress={() => setRemindOpen(null)}>
                <Text style={sheetS.cancelText}>取消</Text>
              </Pressable>
              <Pressable style={sheetS.confirmBtn} onPress={sendRemind}>
                <Ionicons name="send" size={14} color="#FFF" />
                <Text style={sheetS.confirmText}>一键发送</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ====== 修改团阶段弹窗 ====== */}
      {scopedGroup && (
        <Modal visible={stageEditOpen} transparent animationType="slide" onRequestClose={() => setStageEditOpen(false)}>
          <Pressable style={stageModalS.overlay} onPress={() => setStageEditOpen(false)}>
            <Pressable style={stageModalS.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={stageModalS.title}>修改团阶段</Text>
              <Text style={stageModalS.sub}>选择新阶段后将即时生效，团员订单状态将同步更新</Text>
              <View style={stageModalS.list}>
                {CANONICAL_STAGES.map((cs) => {
                  const meta = CANONICAL_STAGE_META[cs];
                  const on = scopedStage === cs;
                  return (
                    <Pressable
                      key={cs}
                      style={[stageModalS.item, on && { backgroundColor: meta.bg, borderColor: meta.color }]}
                      onPress={() => {
                        if (scopedGroup) {
                          updateGroupStage(scopedGroup.id, CANONICAL_TO_RAW[cs]);
                        }
                        setStageEditOpen(false);
                      }}
                    >
                      <View style={[stageModalS.dot, { backgroundColor: meta.color }]} />
                      <Text style={[stageModalS.itemText, on && { color: meta.color, fontWeight: '800' }]}>{meta.label}</Text>
                      {on && <Ionicons name="checkmark-circle" size={16} color={meta.color} />}
                    </Pressable>
                  );
                })}
              </View>
              <Pressable style={stageModalS.cancelBtn} onPress={() => setStageEditOpen(false)}>
                <Text style={stageModalS.cancelText}>取消</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ====== 一键收款确认弹窗 ====== */}
      {scopedGroup && (
        <Modal visible={collectConfirmOpen !== null} transparent animationType="fade" onRequestClose={() => setCollectConfirmOpen(null)}>
          <Pressable style={confirmS.overlay} onPress={() => setCollectConfirmOpen(null)}>
            <Pressable style={confirmS.card} onPress={(e) => e.stopPropagation()}>
              {(() => {
                const kind = collectConfirmOpen;
                if (!kind) return null;
                const text: Record<string, { title: string; desc: string; btn: string; color: string }> = {
                  deposit: { title: '一键收定金', desc: '确认向所有团员发起定金收款通知？', btn: '发起收款', color: PINK },
                  full:    { title: '一键收全款', desc: '确认向所有团员发起全款收款通知？', btn: '发起收款', color: PINK },
                  final:   { title: '一键收尾款', desc: '确认向所有团员发起尾款收款通知？', btn: '发起收款', color: '#A855F7' },
                };
                const t = text[kind] ?? text.deposit;
                return (
                  <>
                    <View style={[confirmS.iconWrap, { backgroundColor: t.color + '15' }]}>
                      <Ionicons name="megaphone" size={28} color={t.color} />
                    </View>
                    <Text style={confirmS.title}>{t.title}</Text>
                    <Text style={confirmS.sub}>{t.desc}</Text>
                    <View style={confirmS.btnRow}>
                      <Pressable style={confirmS.cancelBtn} onPress={() => setCollectConfirmOpen(null)}>
                        <Text style={confirmS.cancelText}>取消</Text>
                      </Pressable>
                      <Pressable
                        style={[confirmS.dangerBtn, { backgroundColor: t.color }]}
                        onPress={() => {
                          Alert.alert('已通知', `已向所有团员推送${t.title}通知`);
                          setCollectConfirmOpen(null);
                        }}
                      >
                        <Ionicons name="send" size={13} color="#FFF" />
                        <Text style={confirmS.dangerText}>{t.btn}</Text>
                      </Pressable>
                    </View>
                  </>
                );
              })()}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const CANONICAL_STAGES: CanonicalGroupStage[] = [
  'gathering', 'deposit_collecting', 'final_collecting', 'shipping', 'closed',
];
const CANONICAL_TO_RAW: Record<CanonicalGroupStage, GroupStage> = {
  gathering: 'gathering',
  deposit_collecting: 'deposit_collecting',
  final_collecting: 'final_collecting',
  shipping: 'shipping',
  closed: 'completed',
};

/* ============ 订单行（细长两行卡片） ============ */
function OrderRow({ order, batchMode, checked, onPress }: {
  order: OrderItem; batchMode: boolean; checked: boolean; onPress: () => void;
}) {
  const cfg = STATUS_CFG[order.status];
  return (
    <Pressable
      style={[rowS.card, batchMode && checked && rowS.cardChecked]}
      onPress={onPress}
      android_ripple={{ color: '#F5F3FF' }}
    >
      {batchMode && (
        <View style={[rowS.checkbox, checked && rowS.checkboxOn]}>
          {checked && <Ionicons name="checkmark" size={13} color="#FFF" />}
        </View>
      )}

      <View style={rowS.avatar}>
        <Text style={rowS.avatarText}>{order.userAvatar}</Text>
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        {/* 第一行：昵称 */}
        <Text style={rowS.userName} numberOfLines={1}>{order.userName}</Text>

        {/* 第二行：备注 */}
        {order.userNote ? (
          <Text style={rowS.userNote} numberOfLines={1}>{order.userNote}</Text>
        ) : (
          <Text style={rowS.userNoteEmpty}>暂无备注</Text>
        )}

        {/* 第三行：地址 */}
        {order.userCity && (
          <View style={rowS.addressRow}>
            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
            <Text style={rowS.addressText} numberOfLines={1}>
              {order.userCity} · {order.userAddress}
            </Text>
          </View>
        )}
      </View>

      {/* 右侧：金额 + 状态 */}
      <View style={rowS.rightCol}>
        <Text style={[rowS.amount, { color: cfg.color }]}>¥{order.amount.toFixed(2)}</Text>
        <View style={[rowS.statusPill, { backgroundColor: cfg.bg }]}>
          <Text style={[rowS.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/* ============ 样式 ============ */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },

  // —— 6 状态 tile (水平滚动) ——
  tileRow: { gap: 8, marginTop: 14, paddingRight: 14 },
  tile: {
    width: 72, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  tileActive: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
    shadowColor: '#1E1B4B', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  tileEmoji: { fontSize: 18 },
  tileLabel: { fontSize: 11, color: '#FFF', fontWeight: '600', marginTop: 4 },
  tileNum: { fontSize: 16, fontWeight: '800', color: '#FFF', marginTop: 2 },

  // —— 工具栏 ——
  toolbar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8,
  },
  toolBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFF', borderRadius: 18,
    paddingVertical: 9, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  toolBtnActive: {
    backgroundColor: PURPLE, borderColor: PURPLE,
  },
  toolBtnText: { fontSize: 12, fontWeight: '700', color: PURPLE, maxWidth: 120 },

  // —— 团 stage 提示卡 ——
  stageCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, marginTop: 8, marginBottom: 4,
    borderLeftWidth: 3,
  },
  stagePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10,
  },
  stagePillText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  stageGroupName: { fontSize: 12, fontWeight: '800', color: '#1E1B4B' },
  stageHint: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  stageJump: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  stageJumpText: { fontSize: 11, fontWeight: '700' },

  // —— 空态 ——
  empty: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 24 },
  emptyBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14, backgroundColor: PURPLE },
  emptyBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // —— 批量底部栏 ——
  batchBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingHorizontal: 14, paddingTop: 10,
    shadowColor: '#1E1B4B', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12,
  },
  batchInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  batchCount: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  batchAll: { fontSize: 12, color: PURPLE, fontWeight: '700' },
  batchActions: { flexDirection: 'row', gap: 10 },
  batchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 11, borderRadius: 18,
  },
  batchBtnDanger: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  batchBtnPrimary: { backgroundColor: PURPLE },
  batchBtnText: { fontSize: 13, fontWeight: '700' },
  batchTip: { fontSize: 10, color: '#F59E0B', marginTop: 6, textAlign: 'center' },

  // —— 团阶段左右栏 ——
  stageBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', marginHorizontal: 14, marginTop: 10,
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#EEEAF5',
    shadowColor: '#1E1B4B', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  stageBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stageBarDot: { width: 8, height: 8, borderRadius: 4 },
  stageBarLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  stageBarValue: { fontSize: 16, fontWeight: '900' },
  stageBarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#F5F3FF',
    borderWidth: 1.5, borderColor: '#E9D5FF',
  },
  stageBarBtnText: { fontSize: 12, fontWeight: '700', color: PURPLE },

  // —— 吸底 CTA ——
  stickyCtaWrap: {
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  stickyCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: 14,
  },
  stickyCtaText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});

const rowS = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  cardChecked: { borderColor: PURPLE, backgroundColor: '#FAFAFE' },

  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  checkboxOn: { backgroundColor: PURPLE, borderColor: PURPLE },

  avatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: PURPLE },

  userName: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  userNote: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  userNoteEmpty: { fontSize: 11, color: '#D1D5DB', fontStyle: 'italic' },

  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  addressText: { fontSize: 11, color: '#9CA3AF', flex: 1 },

  rightCol: { alignItems: 'flex-end', gap: 4, marginLeft: 4 },
  amount: { fontSize: 15, fontWeight: '800' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
});

const sheetS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 12, paddingBottom: 24, paddingHorizontal: 18,
    maxHeight: '90%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '800', color: '#1E1B4B' },
  sub: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 10,
    backgroundColor: '#FAFAFE', borderRadius: 12,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: PURPLE, borderColor: PURPLE },
  rowEmoji: { fontSize: 16 },
  rowLabel: { flex: 1, fontSize: 14, color: '#1E1B4B', fontWeight: '600' },
  rowCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  rowCountText: { fontSize: 11, fontWeight: '700' },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 22, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  confirmBtn: {
    flex: 1.5, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 13, borderRadius: 22, backgroundColor: PURPLE,
  },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  applyBtn: {
    flex: 1.5, paddingVertical: 13, borderRadius: 22, alignItems: 'center',
    backgroundColor: PURPLE,
  },
  applyText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});

const confirmS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: {
    width: '100%', maxWidth: 320,
    backgroundColor: '#FFF', borderRadius: 22,
    paddingVertical: 22, paddingHorizontal: 22,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#1E1B4B', textAlign: 'center' },
  sub: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  dangerBtn: {
    flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 12, borderRadius: 20, backgroundColor: '#EF4444',
  },
  dangerText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
});

const remindS = StyleSheet.create({
  previewCard: {
    backgroundColor: '#FFF1F2', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    marginTop: 12,
  },
  previewLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  previewValue: { fontSize: 16, fontWeight: '800', color: PINK, marginTop: 2 },
  previewMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#1E1B4B', marginTop: 14, marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F5FA', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  fieldInput: { flex: 1, fontSize: 13, color: '#1E1B4B', padding: 0 },
  fieldHint: { fontSize: 10, color: '#9CA3AF' },
});

const stageModalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 20, paddingBottom: 30, paddingHorizontal: 20,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#1E1B4B', textAlign: 'center' },
  sub: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 4 },
  list: { marginTop: 16, gap: 8 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFE',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  itemText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },
  cancelBtn: {
    marginTop: 14, paddingVertical: 12, borderRadius: 20,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
});
