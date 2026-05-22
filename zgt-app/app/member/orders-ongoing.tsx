import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, Alert, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../src/store/useStore';
import {
  canonicalGroupStage,
  CANONICAL_STAGE_META,
  type CanonicalGroupStage,
} from '../../src/utils/helpers';

const PURPLE = '#7C3AED';
const PINK = '#F43F5E';

// V1 demo 状态机:成团中 → 待支付(含 待付定金 / 待付全款 / 待补邮) → 待付尾款 → 待发货 → 待收货 → 已完成
// 本页"进行中订单管理"只接收 5 种进行中状态(发货后 / 完成的订单挂在独立 tile/独立页):
//   gathering   = 成团中
//   payDeposit  = 待付定金  (定金团 · 团长已发起首笔收款)
//   payFull     = 待支付    (全款团 · 团长已发起首笔收款)
//   finalPay    = 待付尾款  (仅定金团 · 已付定金等团长发起补尾款)
//   shipFee     = 待补邮    (团长事后兜底补邮费)
type Status = 'gathering' | 'payDeposit' | 'payFull' | 'finalPay' | 'shipFee';
type Tab = 'all' | Status;

interface Item {
  id: string;
  groupId: string;
  status: Status;
  ownerName: string;
  groupName: string;
  sku: string;
  amount: number;
  /** 「待付尾款」状态下,团长是否已发起收尾款通知;false 时显示「尾款时间待团长通知」 */
  finalNotified?: boolean;
  /** 是否定金团(决定下单后流向:全款→待发货 / 定金→待付尾款) */
  payMode?: 'deposit' | 'full';
  /** 补邮原因(仅 status=shipFee 时有意义) */
  shipFeeReason?: string;
}

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string }> = {
  gathering:  { label: '成团中',   color: '#3B82F6', bg: '#EFF6FF' },
  payDeposit: { label: '待付定金', color: PINK,      bg: '#FFF1F2' },
  payFull:    { label: '待支付',   color: PINK,      bg: '#FFF1F2' },
  finalPay:   { label: '待付尾款', color: '#A855F7', bg: '#F5F3FF' },
  shipFee:    { label: '待补邮',   color: '#D97706', bg: '#FFFBEB' },
};

const MOCK: Item[] = [
  { id: 'mo1', groupId: 'g1', status: 'gathering',  ownerName: '团长大人', groupName: '偶像梦幻祭 6月新谷代购团', sku: '朔间零 吧唧 ×1 + 全员集合 海报 ×1', amount: 64,   payMode: 'deposit' },
  { id: 'mo2', groupId: 'g2', status: 'payFull',    ownerName: '星河里',   groupName: '恋与深空 角色香薰蜡烛团',   sku: '沈星回 香薰蜡烛 ×1',                  amount: 75,   payMode: 'full' },
  { id: 'mo3', groupId: 'g1', status: 'finalPay',   ownerName: '团长大人', groupName: '偶像梦幻祭 6月新谷代购团', sku: '盲盒挂件 ×1 + 海报 ×1',              amount: 47.25, payMode: 'deposit', finalNotified: false },
  { id: 'mo4', groupId: 'g1', status: 'finalPay',   ownerName: '团长大人', groupName: '偶像梦幻祭 6月新谷代购团', sku: '限定盲盒 挂件 ×1',                    amount: 47.25, payMode: 'deposit', finalNotified: true },
  { id: 'mo5', groupId: 'g3', status: 'payDeposit', ownerName: '月光团',   groupName: '名侦探柯南 一番赏代抽',     sku: 'A 赏立牌 ×1',                          amount: 28.5, payMode: 'deposit' },
  // 团长事后发起的补邮费(独立 status=shipFee)
  { id: 'mo8', groupId: 'g1', status: 'shipFee',    ownerName: '团长大人', groupName: '偶像梦幻祭 6月新谷代购团', sku: '📦 补邮费 · 货物超重邮费上浮',           amount: 5,    payMode: 'deposit', shipFeeReason: '包裹超过 3kg,顺丰实际邮费上浮' },
];

export default function MemberOngoingPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { focus, groupId, groupName } = useLocalSearchParams<{ focus?: Status; groupId?: string; groupName?: string }>();
  const [tab, setTab] = useState<Tab>((focus as Status) || 'all');
  // —— 拼团筛选（单选） ——
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [groupFilterOpen, setGroupFilterOpen] = useState(false);
  const scopedGroupId = typeof groupId === 'string' ? groupId : undefined;
  const scopedGroupName = typeof groupName === 'string' ? groupName : undefined;

  // 从 store 取当前团，订单状态据此投影到对应阶段
  const groups = useStore((st) => st.groups);
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

  /** 把订单状态按团当前 stage 投影回去 */
  const projectStatus = (raw: Item, stage: CanonicalGroupStage, payMode: 'deposit' | 'full'): Item => {
    // 补邮单（shipFee）有独立含义,只在「发货中」阶段保留
    if (raw.status === 'shipFee') {
      return stage === 'shipping' ? raw : { ...raw, status: 'gathering', finalNotified: undefined };
    }
    switch (stage) {
      case 'gathering':
        return { ...raw, status: 'gathering', finalNotified: undefined };
      case 'deposit_collecting':
        return {
          ...raw,
          status: payMode === 'full' ? 'payFull' : 'payDeposit',
          finalNotified: undefined,
          payMode,
        };
      case 'final_collecting':
        return { ...raw, status: 'finalPay', finalNotified: true, payMode };
      case 'shipping':
      case 'closed':
        // 这两个阶段订单已结清,不在进行中页展示
        return { ...raw, status: 'gathering', finalNotified: undefined, _hidden: true } as Item & { _hidden: true };
      default:
        return raw;
    }
  };

  /** 兜底：scopedGroupId 但 MOCK 里没数据时,按团 stage 造一笔示例订单 (demo) */
  const fallbackOrder = useMemo<Item | null>(() => {
    if (!scopedGroupId) return null;
    const hits = MOCK.filter((o) => o.groupId === scopedGroupId);
    if (hits.length > 0) return null;
    const stage = scopedStage ?? 'gathering';
    const payMode = scopedPayMode;
    const top = (scopedGroup?.products ?? []).slice(0, 2);
    const sku = top.length > 0
      ? top.map((p) => `${p.name} ×1`).join(' + ')
      : '示例商品 · 吧唧 ×1 + 立牌 ×1';
    const amount = top.length > 0
      ? top.reduce((sum, p) => sum + (p.price ?? 0), 0)
      : 64;
    return projectStatus(
      {
        id: `__mock_${scopedGroupId}`,
        groupId: scopedGroupId,
        status: 'gathering',
        ownerName: '团长大人',
        groupName: scopedGroup?.name ?? scopedGroupName ?? '当前拼团',
        sku,
        amount: amount > 0 ? amount : 64,
        payMode,
      },
      stage,
      payMode,
    );
  }, [scopedGroupId, scopedGroup, scopedStage, scopedPayMode, scopedGroupName]);

  const baseList = useMemo(() => {
    if (!scopedGroupId) return MOCK;
    const hits = MOCK.filter((o) => o.groupId === scopedGroupId);
    const source = hits.length > 0 ? hits : (fallbackOrder ? [fallbackOrder] : []);
    if (!scopedStage) return source;
    // 按团当前 stage 把订单状态强制投影一遍
    return source
      .map((o) => projectStatus(o, scopedStage, scopedPayMode))
      .filter((o) => !(o as any)._hidden);
  }, [scopedGroupId, scopedStage, scopedPayMode, fallbackOrder]);

  const scopedGroupLabel = scopedGroup?.name ?? scopedGroupName ?? baseList[0]?.groupName ?? '当前拼团';

  const counts = useMemo(() => {
    const list = scopedGroupId || groupFilter === 'all' ? baseList : baseList.filter((o) => o.groupName === groupFilter);
    const c: Record<Tab, number> = { all: list.length, gathering: 0, payDeposit: 0, payFull: 0, finalPay: 0, shipFee: 0 };
    list.forEach((o) => { c[o.status] += 1; });
    return c;
  }, [baseList, scopedGroupId, groupFilter]);

  const filtered = useMemo(() => {
    let list = baseList;
    if (!scopedGroupId && groupFilter !== 'all') list = list.filter((o) => o.groupName === groupFilter);
    if (tab !== 'all') list = list.filter((o) => o.status === tab);
    return list;
  }, [baseList, scopedGroupId, tab, groupFilter]);

  // 团选项 & 每团订单数
  const groupOptions = useMemo(() => {
    const map = new Map<string, number>();
    baseList.forEach((o) => map.set(o.groupName, (map.get(o.groupName) ?? 0) + 1));
    return Array.from(map.entries());
  }, [baseList]);

  type ActionConfig = {
    label: string;
    primary?: boolean;
    onPress: () => void;
    secondary?: { label: string; onPress: () => void };
    disabled?: boolean;
  };
  const buildAction = (o: Item): ActionConfig => {
    // 「成团中」「待支付」状态下,允许团员去拼团详情页修改/加购订单
    const editOrderAction = {
      label: '修改订单',
      onPress: () => router.push({ pathname: '/group/[id]' as any, params: { id: o.groupId, view: 'member' } }),
    };
    switch (o.status) {
      case 'gathering':
        return {
          label: '查看拼团情况',
          onPress: () => router.push({ pathname: '/group/matrix' as any, params: { id: o.groupId, view: 'member' } }),
          secondary: editOrderAction,
        };
      case 'payDeposit':
        return {
          label: '去付定金',
          primary: true,
          onPress: () => router.push({ pathname: '/order/pay' as any, params: { id: o.id, kind: 'deposit' } }),
          secondary: editOrderAction,
        };
      case 'payFull':
        return {
          label: '去支付',
          primary: true,
          onPress: () => router.push({ pathname: '/order/pay' as any, params: { id: o.id, kind: 'full' } }),
          secondary: editOrderAction,
        };
      case 'finalPay':
        if (o.finalNotified === false) {
          return { label: '尾款时间待团长通知', disabled: true, onPress: () => {} };
        }
        return { label: '去付尾款', primary: true, onPress: () => router.push({ pathname: '/order/pay' as any, params: { id: o.id, kind: 'final' } }) };
      case 'shipFee':
        return { label: `去补邮费 ¥${o.amount.toFixed(0)}`, primary: true, onPress: () => router.push({ pathname: '/order/pay' as any, params: { id: o.id, kind: 'shipFee' } }) };
    }
  };

  const banner: Record<Tab, { icon: string; text: string; bg: string; color: string }> = {
    all:        { icon: 'flash',                  text: `共 ${counts.all} 单进行中 · 发货后请到首页对应 tile 查看`, bg: '#F5F3FF', color: PURPLE },
    gathering:  { icon: 'people-outline',         text: '已下单 · 等团长发起收款',                                     bg: '#EFF6FF', color: '#3B82F6' },
    payDeposit: { icon: 'card-outline',           text: '🎉 团长已发起收定金 · 请在倒计时内通过微信支付',              bg: '#FFF1F2', color: PINK },
    payFull:    { icon: 'card-outline',           text: '🎉 团长已发起收款 · 请在倒计时内通过微信支付',                bg: '#FFF1F2', color: PINK },
    finalPay:   { icon: 'wallet-outline',         text: '定金已付 · 等团长发起补尾款通知',                              bg: '#F5F3FF', color: '#A855F7' },
    shipFee:    { icon: 'cube-outline',           text: '📦 团长已发起补邮费 · 用于货物过大/实际邮费超预算的差额补付',   bg: '#FFFBEB', color: '#D97706' },
  };

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
          <Text style={s.title}>进行中订单</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={s.headerSub}>
          {scopedGroupId
            ? <>「{scopedGroupLabel}」· 你有 <Text style={{ fontWeight: '800', color: '#FFF' }}>{baseList.length}</Text> 单进行中</>
            : <>共 <Text style={{ fontWeight: '800', color: '#FFF' }}>{counts.all}</Text> 单进行中 · 涵盖凑车 / 待支付 / 补款</>}
        </Text>
      </LinearGradient>

      {/* —— 拼团筛选 + 状态 Tab (全局模式才显示) —— */}
      {!scopedGroupId && (
        <>
          <View style={s.filterBar}>
            <Pressable
              style={s.filterChip}
              onPress={() => setGroupFilterOpen(true)}
            >
              <Ionicons name="people-outline" size={13} color={PURPLE} />
              <Text style={s.filterChipText} numberOfLines={1}>
                {groupFilter === 'all' ? '全部拼团' : groupFilter}
              </Text>
              <Ionicons name="chevron-down" size={12} color={PURPLE} />
            </Pressable>
            {groupFilter !== 'all' && (
              <Pressable style={s.filterClear} onPress={() => setGroupFilter('all')} hitSlop={6}>
                <Ionicons name="close-circle" size={14} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          <View style={s.subTabGrid}>
            {([
              { key: 'all',        label: '全部',     icon: undefined },
              { key: 'gathering',  label: '成团中',   icon: '🧩' },
              { key: 'payDeposit', label: '待付定金', icon: '💵' },
              { key: 'payFull',    label: '待支付',   icon: '💳' },
              { key: 'finalPay',   label: '待付尾款', icon: '💰' },
              { key: 'shipFee',    label: '待补邮',   icon: '📦' },
            ] as { key: Tab; label: string; icon?: string }[]).map((t) => {
              const active = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[s.subTab, active && s.subTabActive]}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.subTabText, active && s.subTabTextActive]}>
                    {t.icon ? `${t.icon} ` : ''}{t.label} {counts[t.key]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 + insets.bottom }}>
        {/* 团阶段提示 · 仅 scopedGroup 模式 */}
        {scopedStage && (
          <View style={[s.stageCard, { borderLeftColor: CANONICAL_STAGE_META[scopedStage].color, backgroundColor: CANONICAL_STAGE_META[scopedStage].bg }]}>
            <View style={[s.stagePill, { backgroundColor: CANONICAL_STAGE_META[scopedStage].color }]}>
              <Ionicons name={CANONICAL_STAGE_META[scopedStage].icon as any} size={12} color="#FFF" />
              <Text style={s.stagePillText}>{CANONICAL_STAGE_META[scopedStage].label}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.stageGroupName} numberOfLines={1}>{scopedGroupLabel}</Text>
              <Text style={[s.stageHint, { color: CANONICAL_STAGE_META[scopedStage].color }]}>
                {CANONICAL_STAGE_META[scopedStage].hint}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/group/[id]' as any, params: { id: scopedGroupId!, view: 'member' } })}
              hitSlop={6}
              style={s.stageJump}
            >
              <Text style={[s.stageJumpText, { color: CANONICAL_STAGE_META[scopedStage].color }]}>看详情</Text>
              <Ionicons name="chevron-forward" size={12} color={CANONICAL_STAGE_META[scopedStage].color} />
            </Pressable>
          </View>
        )}

        {/* 顶部 Banner (仅全局模式,scopedGroup 模式已被 stageCard 取代) */}
        {!scopedGroupId && (
          <View style={[s.banner, { backgroundColor: banner[tab].bg }]}>
            <Ionicons name={banner[tab].icon as any} size={16} color={banner[tab].color} />
            <Text style={[s.bannerText, { color: banner[tab].color }]}>{banner[tab].text}</Text>
          </View>
        )}

        {/* 订单列表 */}
        <View style={s.orderList}>
          {(scopedGroupId ? baseList : filtered).map((o) => (
            <OrderRow key={o.id} order={o} action={buildAction(o)} stage={scopedStage} />
          ))}
          {(scopedGroupId ? baseList : filtered).length === 0 && (
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={36} color="#E5E7EB" />
              <Text style={s.emptyText}>
                {scopedStage === 'shipping'
                  ? '货已发出 · 进行中页面不再展示该团订单'
                  : scopedStage === 'closed'
                  ? '本团已截团 · 历史订单请到「已完成订单」查看'
                  : scopedGroupId
                  ? '该团暂无你的订单'
                  : '该状态下暂无订单'}
              </Text>
              {!scopedGroupId && (
                <Pressable style={s.emptyBtn} onPress={() => setTab('all')}>
                  <Text style={s.emptyBtnText}>查看全部</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* —— 拼团筛选 Modal —— */}
      <Modal visible={groupFilterOpen} transparent animationType="slide" onRequestClose={() => setGroupFilterOpen(false)}>
        <Pressable style={modalS.overlay} onPress={() => setGroupFilterOpen(false)}>
          <Pressable style={modalS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={modalS.handle} />
            <Text style={modalS.title}>按拼团筛选</Text>
            <Text style={modalS.sub}>只看某一个拼团的订单</Text>

            <ScrollView style={{ maxHeight: 360, marginTop: 14 }}>
              <Pressable
                style={[modalS.row, groupFilter === 'all' && modalS.rowActive]}
                onPress={() => { setGroupFilter('all'); setGroupFilterOpen(false); }}
              >
                <View style={[modalS.rowIcon, { backgroundColor: '#F5F3FF' }]}>
                  <Ionicons name="grid" size={13} color={PURPLE} />
                </View>
                <Text style={[modalS.rowText, groupFilter === 'all' && modalS.rowTextActive]}>全部拼团</Text>
                <View style={modalS.rowCount}><Text style={modalS.rowCountText}>{baseList.length}</Text></View>
                {groupFilter === 'all' && <Ionicons name="checkmark-circle" size={16} color={PURPLE} />}
              </Pressable>
              {groupOptions.map(([gn, cnt]) => {
                const active = groupFilter === gn;
                return (
                  <Pressable
                    key={gn}
                    style={[modalS.row, active && modalS.rowActive]}
                    onPress={() => { setGroupFilter(gn); setGroupFilterOpen(false); }}
                  >
                    <View style={[modalS.rowIcon, { backgroundColor: '#FFF1F2' }]}>
                      <Ionicons name="people" size={13} color={PINK} />
                    </View>
                    <Text style={[modalS.rowText, active && modalS.rowTextActive]} numberOfLines={1}>{gn}</Text>
                    <View style={modalS.rowCount}><Text style={modalS.rowCountText}>{cnt}</Text></View>
                    {active && <Ionicons name="checkmark-circle" size={16} color={PURPLE} />}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable style={modalS.cancelBtn} onPress={() => setGroupFilterOpen(false)}>
              <Text style={modalS.cancelText}>关闭</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function OrderRow({
  order,
  action,
  stage,
}: {
  order: Item;
  action: { label: string; primary?: boolean; onPress: () => void; secondary?: { label: string; onPress: () => void }; disabled?: boolean };
  stage?: CanonicalGroupStage;
}) {
  const cfg = STATUS_CFG[order.status];
  const showFinalHint = order.status === 'finalPay' && order.finalNotified === false;
  // 跟着团阶段:在订单卡内部加一个微提示,让团员理解"为什么我的订单现在是这个状态"
  const stageNote = stage
    ? order.status === 'gathering'
      ? '团长还在凑车 · 出团后会发起收款'
      : order.status === 'payDeposit'
        ? `定金团 · 倒计时内付完定金即可保留排位`
        : order.status === 'payFull'
          ? `全款团 · 一次付清,无需再补尾款`
          : order.status === 'finalPay'
            ? '尾款已发起 · 24h 内补齐才算完成'
            : order.status === 'shipFee'
              ? '团长根据真实邮费发起补邮 · 补完即可发货'
              : ''
    : '';
  return (
    <View style={s.orderCard}>
      <View style={s.orderRow1}>
        <View style={s.orderAvatar}><Text style={s.orderAvatarText}>{order.ownerName[0]}</Text></View>
        <View style={{ flex: 1 }}>
          <View style={s.orderTitleRow}>
            <Text style={s.orderOwner}>{order.ownerName}</Text>
            <View style={[s.orderStatus, { backgroundColor: cfg.bg }]}>
              <Text style={[s.orderStatusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
          <Text style={s.orderGroup} numberOfLines={1}>{order.groupName}</Text>
        </View>
      </View>

      <View style={s.orderRow2}>
        <Text style={s.orderSku} numberOfLines={1}>{order.sku}</Text>
        <Text style={s.orderAmount}>¥{order.amount.toFixed(2)}</Text>
      </View>

      {showFinalHint && (
        <View style={s.finalHintRow}>
          <Ionicons name="time-outline" size={12} color="#A855F7" />
          <Text style={s.finalHintText}>尾款时间待团长通知</Text>
        </View>
      )}

      {stageNote && !showFinalHint && (
        <View style={s.stageNote}>
          <Ionicons name="information-circle-outline" size={12} color="#6B7280" />
          <Text style={s.stageNoteText} numberOfLines={2}>{stageNote}</Text>
        </View>
      )}

      <View style={s.orderActionRow}>
        {action.secondary && (
          <TouchableOpacity
            style={[s.orderActionBtn, s.orderActionBtnGhost]}
            activeOpacity={0.85}
            onPress={action.secondary.onPress}
          >
            <Ionicons name="create-outline" size={13} color={PURPLE} />
            <Text style={[s.orderActionText, s.orderActionTextGhost]}>{action.secondary.label}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            s.orderActionBtn,
            action.primary && s.orderActionBtnPrimary,
            action.disabled && s.orderActionBtnDisabled,
          ]}
          activeOpacity={action.disabled ? 1 : 0.85}
          disabled={action.disabled}
          onPress={action.onPress}
        >
          <Text
            style={[
              s.orderActionText,
              action.primary && s.orderActionTextPrimary,
              action.disabled && s.orderActionTextDisabled,
            ]}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  title: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 12 },

  filterBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingTop: 10,
    backgroundColor: '#FFF',
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#F5F3FF', borderRadius: 12,
    flex: 1,
  },
  filterChipText: { flex: 1, fontSize: 12, color: PURPLE, fontWeight: '700' },
  filterClear: { padding: 4 },

  subTabGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#FFF',
  },
  subTab: {
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 14, backgroundColor: '#F8F8FC',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  subTabActive: {
    backgroundColor: '#F5F3FF',
    borderColor: PURPLE,
  },
  subTabText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  subTabTextActive: { color: PURPLE, fontWeight: '800' },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, marginTop: 12,
  },
  bannerText: { flex: 1, fontSize: 12, fontWeight: '600' },

  orderList: { marginTop: 12, gap: 10 },
  orderCard: {
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  orderRow1: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orderAvatar: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  orderAvatarText: { fontSize: 14, fontWeight: '800', color: PURPLE },
  orderTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderOwner: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  orderStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  orderStatusText: { fontSize: 11, fontWeight: '700' },
  orderGroup: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  orderRow2: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  orderSku: { flex: 1, fontSize: 12, color: '#6B7280' },
  orderAmount: { fontSize: 15, fontWeight: '800', color: PINK, marginLeft: 8 },

  orderActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  orderActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 16, borderWidth: 1, borderColor: PURPLE,
  },
  orderActionBtnPrimary: { backgroundColor: PURPLE },
  orderActionBtnGhost: { borderColor: '#D8B4FE', backgroundColor: '#FAF5FF' },
  orderActionBtnDisabled: { borderColor: '#E5E7EB', backgroundColor: '#F3F4F6' },
  orderActionText: { fontSize: 12, fontWeight: '700', color: PURPLE },
  orderActionTextPrimary: { color: '#FFF' },
  orderActionTextGhost: { color: PURPLE },
  orderActionTextDisabled: { color: '#9CA3AF' },

  finalHintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6,
    paddingHorizontal: 8, paddingVertical: 5,
    backgroundColor: '#F5F3FF', borderRadius: 8,
    alignSelf: 'flex-start',
  },
  finalHintText: { fontSize: 11, color: '#7C3AED', fontWeight: '600' },

  stageNote: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, paddingHorizontal: 8, paddingVertical: 5,
    backgroundColor: '#F9FAFB', borderRadius: 8,
  },
  stageNoteText: { flex: 1, fontSize: 11, color: '#6B7280', fontWeight: '500' },

  // —— 团阶段提示卡 (scopedGroup 模式) ——
  stageCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, marginTop: 12,
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

  empty: { alignItems: 'center', padding: 32, gap: 10 },
  emptyText: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
  emptyBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 16, backgroundColor: '#F5F3FF',
  },
  emptyBtnText: { fontSize: 12, color: PURPLE, fontWeight: '700' },
});

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 12, paddingHorizontal: 18, paddingBottom: 24,
    maxHeight: '90%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: '#1E1B4B' },
  sub: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 10,
    borderRadius: 12, backgroundColor: '#FAFAFE',
    marginBottom: 6,
  },
  rowActive: { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE' },
  rowIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontSize: 13, color: '#1E1B4B', fontWeight: '600' },
  rowTextActive: { color: PURPLE, fontWeight: '800' },
  rowCount: { paddingHorizontal: 7, paddingVertical: 1, backgroundColor: '#F3F4F6', borderRadius: 6 },
  rowCountText: { fontSize: 10, fontWeight: '800', color: '#6B7280' },
  cancelBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: 16, alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
});
