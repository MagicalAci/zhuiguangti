import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Alert, Modal, TextInput,
  Image, Animated, Dimensions,
} from 'react-native';
const SCREEN_H = Dimensions.get('window').height;
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../src/store/useStore';
import { useRole } from '../../src/store/useRole';
import { usePrefs } from '../../src/store/usePrefs';
import { useMemberOrders } from '../../src/store/useMemberOrders';
import { Product } from '../../src/types';
import { canonicalGroupStage, type CanonicalGroupStage } from '../../src/utils/helpers';

const PLACEHOLDER_IMG = require('../../assets/products/placeholder.jpg');
const PURPLE = '#7C3AED';
const PINK = '#F43F5E';

// —— 临时 mock：根据 group.id 推算邮费规则（实际应来自 group 字段） ——
type GroupShipping =
  | { kind: 'free'; label: string; estimate: 0 }
  | { kind: 'standard'; label: string; estimate: number }     // 江浙沪 ¥7 其他 ¥8（取 7 估算）
  | { kind: 'custom'; label: string; estimate: number };

function getShippingRule(groupId: string): GroupShipping {
  const code = (groupId.charCodeAt(groupId.length - 1) || 0) % 3;
  if (code === 0) return { kind: 'standard', label: '江浙沪 ¥7 · 其他 ¥8', estimate: 7 };
  if (code === 1) return { kind: 'free', label: '包邮', estimate: 0 };
  return { kind: 'custom', label: '统一 ¥6', estimate: 6 };
}

// —— 一键通知收款卡片配置(按当前 stage + payMode 动态)
// V1 demo · 改动(2026-05-21):
//   1) 准备 / 成团中 / 已成团 阶段 → 不显示卡片(纯进度展示,团长可在 ✏️ 修改 弹层里手动推 stage)
//   2) 团长把 stage 推到「收定金 / 收款中 / 收尾款」后 → 下面才出现对应的「一键通知付款」卡片
//   3) 点击卡片只发通知,不再触发 stage 切换(因为 stage 已在收款阶段)
// 状态机(定金): 准备 → 成团中 → 已成团 → 收定金 → 收尾款 → 发货中 → 截团
// 状态机(全款): 准备 → 成团中 → 已成团 → 收款中 → 发货中 → 截团
function getCollectCardConfig(
  stage: import('../../src/types').GroupStage,
  payMode: 'deposit' | 'full',
): {
  title: string;
  sub: string;
  icon: string;
  color: string;
  bg: string;
  action: 'deposit' | 'final' | 'full';
} | null {
  // 全款团 · stage = 收款中
  if (payMode === 'full' && stage === 'full_collecting') {
    return {
      title: '一键通知付全款',
      sub: '向「拼团情况」里所有团员推送付全款通知',
      icon: 'megaphone-outline',
      color: '#F43F5E',
      bg: '#FFF1F2',
      action: 'full',
    };
  }
  // 定金团 · stage = 收定金
  if (payMode === 'deposit' && stage === 'deposit_collecting') {
    return {
      title: '一键通知付定金',
      sub: '向「拼团情况」里所有团员推送付定金通知',
      icon: 'card-outline',
      color: '#F43F5E',
      bg: '#FFF1F2',
      action: 'deposit',
    };
  }
  // 定金团 · stage = 收尾款
  if (payMode === 'deposit' && stage === 'final_collecting') {
    return {
      title: '一键通知补尾款',
      sub: '向已付定金的团员推送补尾款通知 · 进入采购阶段',
      icon: 'wallet-outline',
      color: '#A855F7',
      bg: '#F5F3FF',
      action: 'final',
    };
  }
  // 其余 stage(准备 / 成团中 / 已成团 / 发货中 / 截团)不显示该卡片
  return null;
}

const COLLECT_CONFIRM_TEXT: Record<'deposit' | 'final' | 'full', { title: string; body: string; toast: string }> = {
  deposit: {
    title: '通知所有团员付定金?',
    body: '团当前已在「收定金」阶段。点击后会向「拼团情况」里所有非空位的团员推送付定金通知。',
    toast: '已通知所有团员付定金 · 团状态保持「收定金」',
  },
  final: {
    title: '通知所有团员补尾款?',
    body: '团当前已在「收尾款」阶段。点击后会向所有已付定金的团员推送补尾款通知。',
    toast: '已通知已付定金的团员补尾款 · 团状态保持「收尾款」',
  },
  full: {
    title: '通知所有团员付全款?',
    body: '团当前已在「收款中」阶段。点击后会向「拼团情况」里所有非空位的团员推送付款通知。',
    toast: '已通知所有团员付全款 · 团状态保持「收款中」',
  },
};

function stageLabel(stage: import('../../src/types').GroupStage) {
  switch (canonicalGroupStage(stage)) {
    case 'gathering':            return { text: '凑车中', color: '#10B981', bg: '#ECFDF5' };
    case 'deposit_collecting':   return { text: '收定金', color: '#F59E0B', bg: '#FFFBEB' };
    case 'final_collecting':     return { text: '收尾款', color: '#F97316', bg: '#FFF7ED' };
    case 'shipping':             return { text: '发货中', color: '#3B82F6', bg: '#EFF6FF' };
    case 'closed':               return { text: '已截团', color: '#EF4444', bg: '#FEF2F2' };
    default:                     return { text: '凑车中', color: '#10B981', bg: '#ECFDF5' };
  }
}

export default function GroupDetail() {
  const { id, view } = useLocalSearchParams<{ id: string; view?: 'leader' | 'member' }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { role } = useRole();
  const { leaderCredImages, leaderCredDesc } = usePrefs();
  const { markPlaced } = useMemberOrders();
  const group = store.groups.find((g) => g.id === id);

  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [cart, setCart] = useState<Record<string, number>>({});

  // —— 各类弹层 ——
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  // remindOpen / setRemindOpen 已废弃, 改用「一键通知收款」collectConfirmOpen
  // const [remindOpen, setRemindOpen] = useState<null | 'final' | 'shipping'>(null);
  // 团员侧：加购热门款时的软提示（策划案 §2.3 页面 1）
  const [hotTip, setHotTip] = useState<null | { productId: string; productName: string; multiplier: number }>(null);

  // 通用 Toast
  const [toastMsg, setToastMsg] = useState<{ title: string; sub?: string; icon?: keyof typeof Ionicons.glyphMap; color?: string } | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (title: string, sub?: string, icon?: keyof typeof Ionicons.glyphMap, color?: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg({ title, sub, icon: icon ?? 'checkmark-circle', color: color ?? '#10B981' });
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToastMsg(null));
    }, 2000);
  };

  const showJoinedToast = () => showToast('已加入拼团池', '付款时机由团长决定 · 截团前可继续改单');
  // 团员侧 / 团长侧：[去下单] 成功反馈页
  const [orderDoneOpen, setOrderDoneOpen] = useState(false);
  // 团长凭证 Modal
  const [credViewOpen, setCredViewOpen] = useState(false);
  // 团长联系方式 Modal
  const [contactOpen, setContactOpen] = useState(false);
  // 团长修改团状态 Modal
  const [stageEditOpen, setStageEditOpen] = useState(false);
  // 团长「一键通知收款」二次确认 Modal
  const [collectConfirmOpen, setCollectConfirmOpen] = useState<null | 'deposit' | 'final' | 'full'>(null);

  // 团长「通知补邮费」Modal(货物过大 / 实际邮费超预算时的二次补付)
  const [shipFeeModalOpen, setShipFeeModalOpen] = useState(false);
  const [shipFeeAmount, setShipFeeAmount] = useState('5');
  const [shipFeeReason, setShipFeeReason] = useState('');

  // 视角优先级：路由 view 参数 > 全局 role
  // 详情页固定用此视角；不依赖外部全局 role 切换
  const isLeader = view ? view === 'leader' : role === 'leader';

  // —— 邮费规则（mock，依据 group.id 推算） ——
  const shipping = useMemo(() => getShippingRule(id ?? ''), [id]);

  if (!group) {
    return (
      <View style={s.empty}>
        <Ionicons name="cube-outline" size={40} color="#E5E7EB" />
        <Text style={s.emptyText}>团不存在</Text>
        <Pressable style={s.emptyBtn} onPress={() => router.back()}>
          <Text style={s.emptyBtnText}>返回</Text>
        </Pressable>
      </View>
    );
  }

  // —— 团类型 / 支付方式（用于流程条 / 拼团情况入口 / 一键收款按钮分支）——
  const isCustomGroup = group.type === 'custom';
  const currentStage = canonicalGroupStage(group.stage);

  // —— 商品按 IP / 名称简单"分组"（实际项目里走 product.groupName 字段） ——
  const categories = useMemo(() => {
    // mock: 根据商品名前缀分组
    const set = new Set<string>();
    group.products.forEach((p) => {
      const prefix = p.name.split(' ')[0] || '其他';
      set.add(prefix);
    });
    return ['全部', ...Array.from(set).slice(0, 6)];
  }, [group.products]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === '全部') return group.products;
    return group.products.filter((p) => p.name.startsWith(activeCategory));
  }, [group.products, activeCategory]);

  // —— cart 价格计算（团长/团员通用，按列表序号生成调价系数与团详情商品卡保持一致） ——
  const productPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    group.products.forEach((p, idx) => {
      const mult = [1.5, 1.2, 1.0, 0.9, 0.8][idx % 5];
      map.set(p.id, Math.round(p.price * mult * 10) / 10);
    });
    return map;
  }, [group.products]);

  const cartCount = Object.values(cart).reduce((s, n) => s + n, 0);
  const cartGoods = Object.entries(cart).reduce((sum, [pid, qty]) => {
    return sum + (productPriceMap.get(pid) ?? 0) * qty;
  }, 0);
  // 团员侧需要叠加邮费；团长占位无需任何付款（cartTotal=0）
  const cartShipping = isLeader ? 0 : (cartCount > 0 ? shipping.estimate : 0);
  const cartTotal = isLeader ? 0 : cartGoods + cartShipping;

  const updateCart = (pid: string, delta: 1 | -1) => {
    setCart((prev) => {
      const cur = prev[pid] ?? 0;
      const next = Math.max(0, cur + delta);
      const out = { ...prev };
      if (next === 0) delete out[pid];
      else out[pid] = next;
      return out;
    });
  };

  // 团员/团长:加购触发热门款软提示(团长不弹提示) + 团员侧首次加购弹"已加入拼团池" Toast
  const tryAddProduct = (pid: string, multiplier: number) => {
    const already = cart[pid] ?? 0;
    if (!isLeader && already === 0 && multiplier >= 1.3) {
      const p = group.products.find((x) => x.id === pid);
      setHotTip({ productId: pid, productName: p?.name ?? '该商品', multiplier });
      return;
    }
    updateCart(pid, 1);
    // 团员侧:任何成功加购的瞬间都弹一次轻量级 Toast,提醒"已加入拼团池 · 等团长通知付款"
    if (!isLeader) showJoinedToast();
  };

  // —— 团长侧统计:待付尾款 / 已凑齐盒数 团员数 ——
  // 注: V1 demo 已去掉「待补邮」状态(邮费在下单时自动算入应付总额)
  const orders = store.getGroupOrders(group.id);
  const finalPendingCount = orders.filter((o) => o.status === 'pending_final').length;
  const matchedBoxes = Math.floor(orders.filter((o) => o.depositPaid > 0).length / Math.max(1, group.products.length));

  // —— 编辑路由 ——
  const handleEditBase = () => {
    setEditMenuOpen(false);
    router.push({ pathname: '/create-group' as any, params: { editId: group.id, focus: 'base' } });
  };
  const handleEditProducts = () => {
    setEditMenuOpen(false);
    router.push({ pathname: '/create-group' as any, params: { editId: group.id, focus: 'products', step: '1' } });
  };

  const scrollY = useRef(new Animated.Value(0)).current;

  const navBg = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.98)'],
    extrapolate: 'clamp',
  });
  const navShadow = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 0.06],
    extrapolate: 'clamp',
  });

  return (
    <View style={s.screen}>
      {/* —— 顶部导航栏（固定 + 滚动渐变） —— */}
      <Animated.View style={[s.navBar, { paddingTop: insets.top + 4, backgroundColor: navBg, shadowOpacity: navShadow }]}>
        <Pressable style={s.iconBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
        </Pressable>
        <Text style={s.navTitle}>{isCustomGroup ? '自制团' : '代购团'}</Text>
        <Pressable style={s.iconBtn} hitSlop={10} onPress={() => showToast('已生成分享链接', '拼团短链 + 二维码已复制到剪贴板', 'share-social', '#7C3AED')}>
          <Ionicons name="share-outline" size={20} color="#1E1B4B" />
        </Pressable>
      </Animated.View>

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        stickyHeaderIndices={[1]}
      >
        {/* [0] —— 可折叠顶部信息区 —— */}
        <View style={[s.headerZone, { paddingTop: insets.top + 50 }]}>
          {/* 团长卡片 */}
          <View style={s.leaderCard}>
            <LinearGradient colors={['#F5F3FF', '#FFF']} style={s.leaderCardBg}>
              <View style={s.leaderRow}>
                <View style={s.leaderAvatar}>
                  <Text style={s.leaderAvatarText}>{isLeader ? '我' : '团'}</Text>
          </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.leaderName}>{isLeader ? '我的团' : '团长大人'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <View style={s.leaderBadge}>
                      <Ionicons name="shield-checkmark" size={9} color="#10B981" />
                      <Text style={s.leaderBadgeText}>信誉 98</Text>
                    </View>
                    <View style={[s.leaderBadge, { backgroundColor: '#EFF6FF' }]}>
                      <Text style={[s.leaderBadgeText, { color: '#3B82F6' }]}>23 团</Text>
                    </View>
                  </View>
                </View>
                <Pressable style={s.contactBtn} onPress={() => setContactOpen(true)}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={PURPLE} />
                  <Text style={s.contactBtnText}>联系团长</Text>
                </Pressable>
              </View>
            </LinearGradient>
        </View>

          {/* 团信息区 */}
          <View style={s.infoSection}>
            <View style={s.infoTitleRow}>
              <View style={[s.stageBadge, { backgroundColor: stageLabel(group.stage).bg }]}>
                <Text style={[s.stageBadgeText, { color: stageLabel(group.stage).color }]}>
                  {stageLabel(group.stage).text}
                </Text>
          </View>
              <Text style={s.groupName} numberOfLines={2}>
                {group.name.replace(/^【[^】]+】[^\s·]*\s*[·]\s*/, '')}
              </Text>
                  </View>

            {!!group.description && (
              <Text style={s.groupDesc} numberOfLines={3}>{group.description}</Text>
            )}

            {!!group.orderRules && (
              <View style={s.rulesCard}>
                <View style={s.rulesHeader}>
                  <Ionicons name="document-text-outline" size={13} color="#F59E0B" />
                  <Text style={s.rulesTitle}>下单 / 退换规则</Text>
                </View>
                <Text style={s.rulesText}>{group.orderRules}</Text>
              </View>
            )}

            <View style={s.metaRow}>
              <View style={s.metaItem}>
                <Ionicons name="time-outline" size={13} color="#F43F5E" />
                <Text style={s.metaText}>
                  {group.endDate
                    ? `截止 ${new Date(group.endDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} ${new Date(group.endDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
                    : '无截止时间'}
                </Text>
              </View>
              <View style={s.metaItem}>
                <Ionicons name="people-outline" size={13} color={PURPLE} />
                <Text style={s.metaText}>{group.memberCount ?? 0} 人参团</Text>
              </View>
              <View style={s.metaItem}>
                <Ionicons name="car-sport-outline" size={13} color={PURPLE} />
                <Text style={s.metaText}>已凑 {matchedBoxes} 车</Text>
              </View>
            </View>

            {/* 团长工具：修改状态 + 阶段操作 */}
            {isLeader && (
              <View style={s.leaderToolRow}>
                <Pressable style={s.leaderToolBtn} onPress={() => setStageEditOpen(true)}>
                  <Ionicons name="create-outline" size={15} color={PURPLE} />
                  <Text style={[s.leaderToolText, { color: PURPLE }]}>修改状态</Text>
                </Pressable>
                {currentStage === 'deposit_collecting' && (
                  <Pressable style={s.leaderToolBtn} onPress={() => setCollectConfirmOpen('deposit')}>
                    <Ionicons name="card-outline" size={15} color="#F43F5E" />
                    <Text style={[s.leaderToolText, { color: '#F43F5E' }]}>通知收定金</Text>
                  </Pressable>
                )}
                {currentStage === 'final_collecting' && (
                  <Pressable style={s.leaderToolBtn} onPress={() => setCollectConfirmOpen('final')}>
                    <Ionicons name="wallet-outline" size={15} color="#A855F7" />
                    <Text style={[s.leaderToolText, { color: '#A855F7' }]}>通知收尾款</Text>
                  </Pressable>
                )}
                {currentStage === 'shipping' && (
                  <Pressable
                    style={s.leaderToolBtn}
                    onPress={() => router.push({ pathname: '/group/ship-fee' as any, params: { id: group.id } })}
                  >
                    <Ionicons name="cube-outline" size={15} color="#D97706" />
                    <Text style={[s.leaderToolText, { color: '#D97706' }]}>通知补邮费</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>

        {/* [1] —— 左右布局：左侧分类 + 右侧商品（sticky） —— */}
        <View style={[s.mainSection, { height: SCREEN_H - (insets.top + 52) - 70 }]}>
          {/* 左侧分类栏 */}
          <ScrollView
            style={s.sideNav}
            contentContainerStyle={s.sideNavContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={s.sideList}>
              {categories.map((c) => {
                const on = activeCategory === c;
                return (
                  <Pressable key={c} style={[s.sideItem, on && s.sideItemOn]} onPress={() => setActiveCategory(c)}>
                    {on && <View style={s.sideBar} />}
                    <Text style={[s.sideText, on && s.sideTextOn]} numberOfLines={2}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* 右侧商品列表 */}
          <ScrollView
            style={s.productsCol}
            contentContainerStyle={s.productsContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {filteredProducts.map((p, idx) => {
              const mult = [1.5, 1.2, 1.0, 0.9, 0.8][idx % 5];
              return (
                <ProductTile
                  key={p.id}
                  product={p}
                  priceMultiplier={mult}
                  qty={cart[p.id] ?? 0}
                  onAdd={() => tryAddProduct(p.id, mult)}
                  onSub={() => updateCart(p.id, -1)}
                  isLeader={isLeader}
                />
              );
            })}
            {filteredProducts.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Ionicons name="cube-outline" size={36} color="#E5E7EB" />
                <Text style={{ color: '#9CA3AF', marginTop: 10, fontSize: 13 }}>该分类暂无商品</Text>
        </View>
            )}
          </ScrollView>
        </View>
      </Animated.ScrollView>

      {/* —— 底部按钮区 —— */}
      {isLeader ? (
        <View style={[s.bottomBar, { paddingBottom: 10 + insets.bottom, gap: 6 }]}>
          <Pressable style={s.btn} onPress={() => setEditMenuOpen(true)}>
            <Ionicons name="create-outline" size={18} color={PURPLE} />
            <Text style={s.btnLabel}>编辑</Text>
          </Pressable>
          <Pressable
            style={s.btn}
            onPress={() =>
              router.push({
                pathname: '/group/matrix' as any,
                params: { id: group.id, view: 'leader' },
              })
            }
          >
            <Ionicons name="grid-outline" size={18} color={PURPLE} />
            <Text style={s.btnLabel}>拼团情况</Text>
          </Pressable>
          <Pressable
            style={s.btn}
            onPress={() =>
              router.push({
                pathname: '/orders/in-progress' as any,
                params: { groupId: group.id, groupName: group.name },
              })
            }
          >
            <Ionicons name="receipt-outline" size={18} color={PURPLE} />
            <Text style={s.btnLabel}>我的订单</Text>
          </Pressable>

          {/* —— 团长加购后的占位下单 CTA —— */}
          <Pressable
            style={[s.btnPrimary, cartCount === 0 && { opacity: 0.4 }]}
            disabled={cartCount === 0}
            onPress={() => setOrderDoneOpen(true)}
          >
            <LinearGradient
              colors={cartCount > 0 ? [PURPLE, '#A855F7'] : ['#9CA3AF', '#9CA3AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.btnPrimaryInner}
            >
              <Ionicons name={cartCount > 0 ? 'checkmark-circle' : 'cart-outline'} size={16} color="#FFF" />
              <Text style={s.btnPrimaryText}>
                {cartCount > 0 ? `去下单 ${cartCount}` : '去下单'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View style={[s.bottomBar, { paddingBottom: 10 + insets.bottom, gap: 6 }]}>
          <Pressable
            style={s.btnSmall}
            onPress={() =>
              router.push({
                pathname: '/group/matrix' as any,
                params: { id: group.id, view: 'member' },
              })
            }
          >
            <Ionicons name="grid-outline" size={16} color={PURPLE} />
            <Text style={s.btnSmallLabel}>拼团情况</Text>
          </Pressable>
          <Pressable
            style={s.btnSmall}
            onPress={() =>
              router.push({
                pathname: '/member/orders-ongoing' as any,
                params: { groupId: group.id, groupName: group.name },
              })
            }
          >
            <Ionicons name="receipt-outline" size={16} color={PURPLE} />
            <Text style={s.btnSmallLabel}>我的订单</Text>
          </Pressable>
          <View style={s.cartSummary}>
            <Text style={s.cartCount}>
              已选 <Text style={{ color: PINK, fontWeight: '800' }}>{cartCount}</Text>
              {cartShipping > 0 && (
                <Text style={{ color: '#9CA3AF', fontSize: 10 }}> · 含邮 ¥{cartShipping}</Text>
              )}
              {shipping.kind === 'free' && cartCount > 0 && (
                <Text style={{ color: '#10B981', fontSize: 10 }}> · 包邮</Text>
              )}
            </Text>
            <Text style={s.cartTotal}>¥{cartTotal.toFixed(0)}</Text>
          </View>
          <Pressable
            style={[s.btnPrimary, cartCount === 0 && { opacity: 0.4 }]}
            disabled={cartCount === 0}
            onPress={() => {
              markPlaced(group.id, cartCount);
              setOrderDoneOpen(true);
            }}
          >
            <LinearGradient
              colors={[PINK, '#FB7185']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.btnPrimaryInner}
            >
              <Text style={s.btnPrimaryText}>去下单</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* —— 编辑二级选择 弹层 —— */}
      <Modal visible={editMenuOpen} transparent animationType="fade" onRequestClose={() => setEditMenuOpen(false)}>
        <Pressable style={modalS.overlay} onPress={() => setEditMenuOpen(false)}>
          <Pressable style={modalS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={modalS.handle} />
            <Text style={modalS.title}>编辑拼团</Text>
            <Text style={modalS.sub}>商品高频独立调整 · 与基础设定的修改场景不一样，已拆成两个入口</Text>

            <Pressable style={modalS.editRow} onPress={handleEditBase}>
              <View style={[modalS.editIcon, { backgroundColor: '#F5F3FF' }]}>
                <Text style={{ fontSize: 22 }}>🛠</Text>
            </View>
              <View style={{ flex: 1 }}>
                <Text style={modalS.editTitle}>修改拼团</Text>
                <Text style={modalS.editSub}>
                  ① 团基本信息 + ③ 拼团属性{'\n'}
                  名称 / 描述 / 凭证 / 支付方式 / 邮费规则 / 开团截团时间 / 联系方式 / 收款码
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C4C4D4" />
            </Pressable>

            <Pressable style={modalS.editRow} onPress={handleEditProducts}>
              <View style={[modalS.editIcon, { backgroundColor: '#FFF1F2' }]}>
                <Text style={{ fontSize: 22 }}>📦</Text>
            </View>
              <View style={{ flex: 1 }}>
                <Text style={modalS.editTitle}>修改商品</Text>
                <Text style={modalS.editSub}>
                  ② 编辑商品（独立入口）{'\n'}
                  SKU 件数 / 价格 / 名称 / 图片 / 分组 / 调价系数
                </Text>
                </View>
              <Ionicons name="chevron-forward" size={16} color="#C4C4D4" />
            </Pressable>

            <View style={modalS.editHint}>
              <Ionicons name="information-circle-outline" size={14} color={PURPLE} />
              <Text style={modalS.editHintText}>
                <Text style={{ fontWeight: '700' }}>截团前</Text>所有字段可改；
                <Text style={{ fontWeight: '700' }}>截团后</Text>商品和价格锁定，仅可改物流相关字段。
              </Text>
              </View>

            <Pressable style={modalS.cancelBtn} onPress={() => setEditMenuOpen(false)}>
              <Text style={modalS.cancelText}>取消</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 团长凭证 Modal —— */}
      <Modal visible={credViewOpen} transparent animationType="fade" onRequestClose={() => setCredViewOpen(false)}>
        <Pressable style={credS.overlay} onPress={() => setCredViewOpen(false)}>
          <Pressable style={credS.card} onPress={(e) => e.stopPropagation()}>
            <View style={credS.headerRow}>
              <View style={credS.headerIcon}>
                <Ionicons name="shield-checkmark" size={16} color={PURPLE} />
          </View>
              <Text style={credS.title}>团长信誉凭证</Text>
              <Pressable onPress={() => setCredViewOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
            <Text style={credS.sub}>
              {leaderCredDesc || '团长上传的过往拼车经验 / 粉籍自证 / 工作证明，可放心上车。'}
            </Text>

            <View style={credS.metaRow}>
              <View style={credS.metaPill}>
                <Ionicons name="ribbon" size={11} color="#F59E0B" />
                <Text style={credS.metaPillText}>S 级 · 信誉 98</Text>
              </View>
              <View style={[credS.metaPill, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[credS.metaPillText, { color: '#10B981' }]}>成功率 96%</Text>
          </View>
              <View style={[credS.metaPill, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[credS.metaPillText, { color: '#3B82F6' }]}>已开 23 团</Text>
              </View>
            </View>

            <Text style={credS.sectionTitle}>凭证截图（{leaderCredImages.length}）</Text>
            {leaderCredImages.length === 0 ? (
              <View style={credS.emptyBox}>
                <Ionicons name="image-outline" size={26} color="#C4C4D4" />
                <Text style={credS.emptyText}>团长还未上传凭证</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {leaderCredImages.map((c) => (
                  <View key={c.id} style={credS.imgBox}>
                    <Image source={PLACEHOLDER_IMG} style={credS.img} resizeMode="cover" />
                    <View style={credS.imgTypeTag}>
                      <Text style={credS.imgTypeText}>{c.type}</Text>
                    </View>
                    <Text style={credS.imgLabel} numberOfLines={2}>{c.label}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={credS.tip}>
              <Ionicons name="information-circle-outline" size={12} color={PURPLE} />
              <Text style={credS.tipText}>凭证由平台审核，作为信誉参考，不代表实际收益</Text>
                </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 团长联系方式 Modal —— */}
      <Modal visible={contactOpen} transparent animationType="fade" onRequestClose={() => setContactOpen(false)}>
        <Pressable style={credS.overlay} onPress={() => setContactOpen(false)}>
          <Pressable style={credS.card} onPress={(e) => e.stopPropagation()}>
            <View style={credS.headerRow}>
              <View style={[credS.headerIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="chatbubble-ellipses" size={16} color="#10B981" />
                </View>
              <Text style={credS.title}>联系团长</Text>
              <Pressable onPress={() => setContactOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color="#9CA3AF" />
              </Pressable>
              </View>
            <Text style={credS.sub}>团长会在群内同步物流 / 补尾款 / 发货等关键信息，请务必添加</Text>

            <View style={credS.contactList}>
              <View style={credS.contactRow}>
                <View style={[credS.contactIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={{ fontSize: 14 }}>💬</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={credS.contactLabel}>微信</Text>
                  <Text style={credS.contactValue}>zgt_leader_88</Text>
                </View>
                <Pressable
                  style={credS.copyBtn}
                  onPress={() => showToast('已复制', '团长微信 zgt_leader_88', 'copy', '#7C3AED')}
                >
                  <Text style={credS.copyText}>复制</Text>
                </Pressable>
              </View>
              <View style={credS.contactRow}>
                <View style={[credS.contactIcon, { backgroundColor: '#F5F3FF' }]}>
                  <Text style={{ fontSize: 14 }}>📱</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={credS.contactLabel}>QQ 群</Text>
                  <Text style={credS.contactValue}>826 1{group.id.slice(-2)} 880</Text>
                </View>
                <Pressable
                  style={credS.copyBtn}
                  onPress={() => showToast('已复制', 'QQ 群号已复制', 'copy', '#7C3AED')}
                >
                  <Text style={credS.copyText}>复制</Text>
                </Pressable>
              </View>
            </View>

            <View style={[credS.tip, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="alert-circle-outline" size={12} color="#F59E0B" />
              <Text style={[credS.tipText, { color: '#92400E' }]}>
                成团后系统会自动建群，群消息也会同步到 App 内「设置-消息」
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 团长修改团状态 Modal —— */}
      <Modal visible={stageEditOpen} transparent animationType="slide" onRequestClose={() => setStageEditOpen(false)}>
        <Pressable style={stageS.overlay} onPress={() => setStageEditOpen(false)}>
          <Pressable style={stageS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={stageS.handle} />
            <Text style={stageS.title}>修改团状态</Text>
            <Text style={stageS.sub}>状态流转:凑车中 → 收定金 → 收尾款 → 发货中 → 已截团</Text>

            <ScrollView style={{ maxHeight: 420, marginTop: 12 }}>
              {STAGE_OPTIONS.map((opt) => {
                const active = currentStage === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[stageS.row, active && stageS.rowActive]}
                    onPress={() => {
                      store.updateGroupStage(group.id, opt.value);
                      setStageEditOpen(false);
                      setTimeout(() => showToast('状态已更新', `已切换为「${opt.label}」· 已通知群聊`, 'checkmark-circle', '#10B981'), 60);
                    }}
                  >
                    <View style={[stageS.rowIcon, { backgroundColor: opt.bg }]}>
                      <Ionicons name={opt.icon as any} size={15} color={opt.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[stageS.rowTitle, active && { color: PURPLE }]}>{opt.label}</Text>
                      <Text style={stageS.rowSub}>{opt.desc}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={18} color={PURPLE} />}
                  </Pressable>
          );
        })}
            </ScrollView>

            <Pressable style={stageS.cancelBtn} onPress={() => setStageEditOpen(false)}>
              <Text style={stageS.cancelText}>关闭</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 一键通知收款 · 二次确认 Modal —— */}
      <Modal
        visible={collectConfirmOpen !== null}
        transparent animationType="fade"
        onRequestClose={() => setCollectConfirmOpen(null)}
      >
        <Pressable style={s.collectModalOverlay} onPress={() => setCollectConfirmOpen(null)}>
          <Pressable style={s.collectModalCard} onPress={(e) => e.stopPropagation()}>
            {(() => {
              if (!collectConfirmOpen) return null;
              const text = COLLECT_CONFIRM_TEXT[collectConfirmOpen];
              return (
                <>
                  <View style={[s.collectModalIconWrap, { backgroundColor: '#FFF1F2' }]}>
                    <Ionicons name="megaphone" size={28} color={PINK} />
            </View>
                  <Text style={s.collectModalTitle}>{text.title}</Text>
                  <Text style={s.collectModalSub}>{text.body}</Text>
                  <View style={s.collectModalWarn}>
                    <Ionicons name="alert-circle" size={14} color="#92400E" />
                    <Text style={s.collectModalWarnText}>
                      将通知「拼团情况」里 <Text style={{ fontWeight: '800' }}>所有非空位的团员</Text>。建议先去拼团情况页用「砍排 / 撤排」剔除凑不齐 / 跑团的位置,再统一通知付款。
                    </Text>
          </View>
                  <View style={s.collectModalBtnRow}>
                    <Pressable
                      style={s.collectModalBtnSecondary}
                      onPress={() => {
                        setCollectConfirmOpen(null);
                        if (isCustomGroup) return;
                        router.push({
                          pathname: '/group/matrix' as any,
                          params: { id: group.id, view: 'leader' },
                        });
                      }}
                    >
                      <Text style={s.collectModalBtnSecondaryText}>
                        {isCustomGroup ? '再想想' : '去拼团情况看看'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={s.collectModalBtnPrimary}
                      onPress={() => {
                        // 仅发通知,不再切换 stage(stage 已经在收款阶段)
                        setCollectConfirmOpen(null);
                        setTimeout(() => showToast('通知已发送', text.toast, 'megaphone', '#F43F5E'), 60);
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                      <Text style={s.collectModalBtnPrimaryText}>确认通知</Text>
                    </Pressable>
                  </View>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 催款通知弹层(已废弃,统一走「一键通知收款」二次确认 Modal) —— */}

      {/* —— 团长「通知补邮费」Modal(货物过大 / 实际邮费超预算时) —— */}
      <Modal visible={shipFeeModalOpen} transparent animationType="fade" onRequestClose={() => setShipFeeModalOpen(false)}>
        <Pressable style={shipFeeS.overlay} onPress={() => setShipFeeModalOpen(false)}>
          <Pressable style={shipFeeS.card} onPress={(e) => e.stopPropagation()}>
            <View style={shipFeeS.iconWrap}>
              <Ionicons name="cube" size={28} color="#D97706" />
            </View>
            <Text style={shipFeeS.title}>通知补邮费</Text>
            <Text style={shipFeeS.sub}>
              用于「货物过大 / 实际邮费超出下单预算」时,向已上车团员发起一笔「待支付 · 补邮费」。
              {'\n'}团员订单将在「待支付」里多出一笔补邮费单据。
            </Text>

            <View style={shipFeeS.row}>
              <Text style={shipFeeS.fieldLabel}>每位补付金额</Text>
              <View style={shipFeeS.inputWrap}>
                <Text style={shipFeeS.inputPrefix}>¥</Text>
                <TextInput
                  style={shipFeeS.input}
                  value={shipFeeAmount}
                  onChangeText={setShipFeeAmount}
                  keyboardType="decimal-pad"
                  placeholder="如: 5"
                  placeholderTextColor="#C4C4D4"
                />
              </View>
            </View>

            <View style={shipFeeS.row}>
              <Text style={shipFeeS.fieldLabel}>补付理由 (可选)</Text>
              <TextInput
                style={[shipFeeS.input, { width: '100%', marginTop: 6 }]}
                value={shipFeeReason}
                onChangeText={setShipFeeReason}
                placeholder="如: 包裹超过 3kg,顺丰实际邮费上浮"
                placeholderTextColor="#C4C4D4"
              />
            </View>

            <View style={shipFeeS.previewBox}>
              <Ionicons name="information-circle" size={12} color="#D97706" />
              <Text style={shipFeeS.previewText}>
                将向团内 {group.memberCount} 位团员发起补邮 · 总计约 ¥{((parseFloat(shipFeeAmount) || 0) * group.memberCount).toFixed(2)}
              </Text>
            </View>

            <View style={shipFeeS.btnRow}>
              <Pressable style={shipFeeS.cancelBtn} onPress={() => setShipFeeModalOpen(false)}>
                <Text style={shipFeeS.cancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={[shipFeeS.confirmBtn, !parseFloat(shipFeeAmount) && { opacity: 0.5 }]}
                disabled={!parseFloat(shipFeeAmount)}
                onPress={() => {
                  const amt = parseFloat(shipFeeAmount) || 0;
                  setShipFeeModalOpen(false);
                  showToast('补邮通知已发送', `已向 ${group.memberCount} 位团员发起补邮 ¥${amt.toFixed(2)}`, 'cube', '#D97706');
                }}
              >
                <Ionicons name="megaphone" size={14} color="#FFF" />
                <Text style={shipFeeS.confirmText}>通知补邮 ¥{(parseFloat(shipFeeAmount) || 0).toFixed(2)}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 通用 Toast —— */}
      {toastMsg && (
        <Animated.View
          pointerEvents="none"
          style={[
            s.toastWrap,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
              bottom: 90 + insets.bottom,
            },
          ]}
        >
          <View style={[s.toastIcon, { backgroundColor: toastMsg.color ?? '#10B981' }]}>
            <Ionicons name={(toastMsg.icon ?? 'checkmark-circle') as any} size={15} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.toastTitle}>{toastMsg.title}</Text>
            {!!toastMsg.sub && <Text style={s.toastSub}>{toastMsg.sub}</Text>}
          </View>
        </Animated.View>
      )}

      {/* —— 团员加购热门款软提示（策划案 §2.3 页面 1） —— */}
      <Modal visible={!!hotTip} transparent animationType="fade" onRequestClose={() => setHotTip(null)}>
        <Pressable style={hotS.overlay} onPress={() => setHotTip(null)}>
          <Pressable style={hotS.card} onPress={(e) => e.stopPropagation()}>
            <View style={hotS.iconWrap}>
              <Text style={{ fontSize: 28 }}>💡</Text>
        </View>
            <Text style={hotS.title}>团长建议</Text>
            <Text style={hotS.sub}>
              <Text style={{ fontWeight: '700', color: '#1E1B4B' }}>{hotTip?.productName}</Text> 较热门
              <Text style={{ color: '#9CA3AF' }}>（调价系数 ×{hotTip?.multiplier.toFixed(1)}）</Text>
              {'\n'}可先看看目前拼团情况再决定是否上车
            </Text>

            <View style={hotS.btnRow}>
              <Pressable
                style={hotS.btnSecondary}
                onPress={() => {
                  if (hotTip) {
                    updateCart(hotTip.productId, 1);
                    if (!isLeader) showJoinedToast();
                  }
                  setHotTip(null);
                }}
              >
                <Text style={hotS.btnSecondaryText}>仅加购当前</Text>
              </Pressable>
              <Pressable
                style={hotS.btnPrimary}
                onPress={() => {
                  setHotTip(null);
                  router.push({
                    pathname: '/group/matrix' as any,
                    params: { id: group.id, view: isLeader ? 'leader' : 'member' },
                  });
                }}
              >
                <Ionicons name="grid-outline" size={14} color="#FFF" />
                <Text style={hotS.btnPrimaryText}>看看排单</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 下单成功反馈：团员=凑车成功 / 团长=占位成功 —— */}
      <Modal visible={orderDoneOpen} transparent animationType="fade" onRequestClose={() => setOrderDoneOpen(false)}>
        <Pressable style={doneS.overlay} onPress={() => setOrderDoneOpen(false)}>
          <Pressable style={doneS.card} onPress={(e) => e.stopPropagation()}>
            <View style={[doneS.celebrate, isLeader && { backgroundColor: '#FFF1F2' }]}>
              <Text style={{ fontSize: 38 }}>{isLeader ? '🎯' : '🚗'}</Text>
            </View>
            <Text style={doneS.title}>{isLeader ? '占位成功' : '已加入凑车池'}</Text>
            <Text style={doneS.sub}>
              {isLeader ? (
                <>
                  团长已占位 {cartCount} 件 · 头像将出现在
                  <Text style={{ color: PURPLE, fontWeight: '700' }}> 拼团情况</Text> 排单中
                </>
              ) : (
                <>
                  {cartCount} 件已上车 · 订单状态
                  <Text style={{ color: '#3B82F6', fontWeight: '700' }}> 成团中</Text>
                </>
              )}
            </Text>

            <View style={doneS.statCard}>
              {isLeader ? (
                <>
                  <View style={doneS.statRow}>
                    <Text style={doneS.statLabel}>占位件数</Text>
                    <Text style={[doneS.statValue, { color: PURPLE }]}>{cartCount} 件</Text>
                  </View>
                  <View style={doneS.statRow}>
                    <Text style={doneS.statLabel}>需付款金额</Text>
                    <Text style={[doneS.statValue, { color: '#10B981' }]}>¥0 · 免付款</Text>
                  </View>
                  <View style={doneS.statRow}>
                    <Text style={doneS.statLabel}>排单显示</Text>
                    <Text style={doneS.statValueSmall}>团长头像 + 「团长占位」标签</Text>
                  </View>
                  <View style={doneS.statRow}>
                    <Text style={doneS.statLabel}>用途</Text>
                    <Text style={doneS.statValueSmall}>占冷门 SKU / 帮散车快速凑齐</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={doneS.statRow}>
                    <Text style={doneS.statLabel}>商品金额</Text>
                    <Text style={doneS.statValueSmall}>¥{cartGoods.toFixed(0)}</Text>
                  </View>
                  <View style={doneS.statRow}>
                    <Text style={doneS.statLabel}>邮费</Text>
                    <Text style={doneS.statValueSmall}>
                      {shipping.kind === 'free' ? '包邮' : `+ ¥${cartShipping}（${shipping.label}）`}
                    </Text>
                  </View>
                  <View style={doneS.statRow}>
                    <Text style={doneS.statLabel}>预计应付</Text>
                    <Text style={doneS.statValue}>¥{cartTotal.toFixed(0)}</Text>
                  </View>
                  <View style={doneS.statRow}>
                    <Text style={doneS.statLabel}>付款时机</Text>
                    <Text style={doneS.statValueSmall}>系统凑齐 1 套 SKU 后通知</Text>
                  </View>
                </>
              )}
            </View>

            <View style={doneS.tipBox}>
              <Ionicons name="shield-checkmark-outline" size={14} color={PURPLE} />
              <Text style={doneS.tipText}>
                <Text style={{ fontWeight: '700', color: PURPLE }}>{isLeader ? '团长占位说明：' : 'V1 保障：'}</Text>
                {isLeader
                  ? '团长占位 不参与扣款 / 排表上以「团长占位」展示，可随时取消，方便帮团员凑齐'
                  : '没付款就不付款，凑不齐自动无需退款'}
              </Text>
            </View>

            <View style={doneS.btnRow}>
              <Pressable
                style={doneS.btnSecondary}
                onPress={() => setOrderDoneOpen(false)}
              >
                <Text style={doneS.btnSecondaryText}>继续逛逛</Text>
              </Pressable>
              <Pressable
                style={doneS.btnPrimary}
                onPress={() => {
                  setOrderDoneOpen(false);
                  router.push({
                    pathname: '/group/matrix' as any,
                    params: { id: group.id, view: isLeader ? 'leader' : 'member' },
                  });
                }}
              >
                <Ionicons name="grid-outline" size={14} color="#FFF" />
                <Text style={doneS.btnPrimaryText}>查看排单</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// —— 团长修改团状态 · 只暴露业务上可操作的 5 个状态 ——
type StageOption = {
  value: import('../../src/types').GroupStage;
  label: string;
  desc: string;
  icon: string;
  color: string;
  bg: string;
};

const STAGE_OPTIONS: StageOption[] = [
  { value: 'gathering',          label: '凑车中', desc: '团员可下单 / 修改订单 · 暂不收款',                 icon: 'people-outline',      color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'deposit_collecting', label: '收定金', desc: '团长通知团员付定金 · 定金到账后保留排位',           icon: 'card-outline',        color: '#F43F5E', bg: '#FFF1F2' },
  { value: 'final_collecting',   label: '收尾款', desc: '团长通知补尾款 · 补齐后等待到货与发货',             icon: 'wallet-outline',      color: '#A855F7', bg: '#F5F3FF' },
  { value: 'shipping',           label: '发货中', desc: '已能确认收货地址 · 此阶段才允许发起补邮费',         icon: 'cube-outline',        color: '#0EA5E9', bg: '#E0F2FE' },
  { value: 'closed',             label: '已截团', desc: '本团结束 · 不再接单 / 不再补款',                    icon: 'lock-closed-outline', color: '#7C3AED', bg: '#F5F3FF' },
];

/* GroupProgressBar removed — status shown in stageBadge, tools in leaderToolRow */

/* —————————————————— 商品卡 —————————————————— */

function ProductTile({
  product, priceMultiplier, qty, onAdd, onSub, isLeader,
}: {
  product: Product; priceMultiplier: number; qty: number;
  onAdd: () => void; onSub: () => void; isLeader: boolean;
}) {
  const finalPrice = Math.round(product.price * priceMultiplier * 10) / 10;
  const heatLabel = priceMultiplier >= 1.3 ? '热门' : priceMultiplier <= 0.9 ? '可爱' : '常规';
  const heatColor = priceMultiplier >= 1.3 ? '#F43F5E' : priceMultiplier <= 0.9 ? '#3B82F6' : '#9CA3AF';

  return (
    <View style={tileS.card}>
      <View style={tileS.imgWrap}>
        <Image source={PLACEHOLDER_IMG} style={tileS.img} resizeMode="cover" />
        {/* 调价标签 */}
        <View style={[tileS.adjustTag, { backgroundColor: heatColor }]}>
          <Text style={tileS.adjustTagText}>×{priceMultiplier.toFixed(1)}</Text>
        </View>
        {/* 状态标签 */}
        <View style={tileS.statusTag}>
          <View style={[tileS.statusDot, { backgroundColor: '#10B981' }]} />
          <Text style={tileS.statusText}>现货</Text>
        </View>
      </View>

      <View style={tileS.body}>
        <Text style={tileS.name} numberOfLines={2}>{product.name}</Text>
        <View style={tileS.priceRow}>
          <Text style={tileS.price}>
            <Text style={tileS.priceUnit}>¥</Text>{finalPrice.toFixed(0)}
            <Text style={tileS.priceDecimal}>.{(finalPrice * 10) % 10}</Text>
          </Text>
          <Text style={tileS.priceOriginal}>原 ¥{product.price}</Text>
        </View>
        <View style={tileS.bottomRow}>
          <View style={[tileS.heatPill, { backgroundColor: heatColor + '18' }]}>
            <Text style={[tileS.heatText, { color: heatColor }]}>{heatLabel}</Text>
          </View>

          {qty > 0 ? (
            <View style={tileS.stepperWrap}>
              {isLeader && (
                <View style={tileS.placedTag}>
                  <Ionicons name="checkmark-circle" size={9} color={PURPLE} />
                  <Text style={tileS.placedTagText}>已占位 ×{qty}</Text>
                </View>
              )}
              <View style={tileS.stepper}>
                <Pressable style={tileS.stepBtn} onPress={onSub}>
                  <Ionicons name="remove" size={14} color={PURPLE} />
                </Pressable>
                <Text style={tileS.stepQty}>{qty}</Text>
                <Pressable style={tileS.stepBtn} onPress={onAdd}>
                  <Ionicons name="add" size={14} color={PURPLE} />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={tileS.buyBtn} onPress={onAdd}>
              <Text style={tileS.buyBtnText}>{isLeader ? '加购' : '购入'}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

/* —————————————————— 催款 Modal —————————————————— */

function RemindModal({
  visible, type, count, defaultAmount, onClose, onSend,
}: {
  visible: boolean; type: 'final' | 'shipping' | null; count: number; defaultAmount: number;
  onClose: () => void;
  onSend: (payload: { type: 'final' | 'shipping'; count: number; deadline: string; amount: string }) => void;
}) {
  const [amount, setAmount] = useState(String(defaultAmount));
  const [deadline, setDeadline] = useState('2026-05-25');
  const [note, setNote] = useState('');
  const [inApp, setInApp] = useState(true);
  const [wechat, setWechat] = useState(true);
  const [sms, setSms] = useState(false);

  if (!type) return null;
  const t = type;
  const title = t === 'final' ? '通知补尾款' : '通知补邮费';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalS.overlay}>
        <View style={modalS.sheet}>
          <View style={modalS.handle} />
          <View style={modalS.remindHeader}>
            <Ionicons name={t === 'final' ? 'card-outline' : 'cube-outline'} size={20} color={PINK} />
            <Text style={modalS.title}>{title}</Text>
      </View>

          <View style={modalS.previewCard}>
            <Text style={modalS.previewLabel}>关联团员</Text>
            <Text style={modalS.previewValue}>{count} 位待{t === 'final' ? '补尾款' : '补邮费'}</Text>
            <Text style={modalS.previewMeta}>总金额：¥{(parseFloat(amount) * count).toFixed(2)}</Text>
    </View>

          <Text style={modalS.fieldLabel}>截止时间</Text>
          <View style={modalS.field}>
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <TextInput
              style={modalS.fieldInput}
              value={deadline}
              onChangeText={setDeadline}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#C4C4D4"
            />
            <Text style={modalS.fieldHint}>默认 7 天后</Text>
          </View>

          <Text style={modalS.fieldLabel}>金额（按规则预填）</Text>
          <View style={modalS.field}>
            <Text style={{ color: '#1E1B4B', fontWeight: '700' }}>¥</Text>
            <TextInput
              style={modalS.fieldInput}
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
            />
          </View>

          <Text style={modalS.fieldLabel}>补充说明（可选）</Text>
          <TextInput
            style={[modalS.fieldInput, { backgroundColor: '#F5F5FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }]}
            value={note}
            onChangeText={setNote}
            placeholder="例如：成团时间临近，请尽快补款"
            placeholderTextColor="#C4C4D4"
            multiline
          />

          <Text style={modalS.fieldLabel}>通知方式</Text>
          <View style={modalS.notifyList}>
            <NotifyToggle label="站内消息" enabled={inApp} onToggle={setInApp} />
            <NotifyToggle label="微信模板消息" enabled={wechat} onToggle={setWechat} />
            <NotifyToggle label="短信" enabled={sms} onToggle={setSms} sub="V2 上线" disabled />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Pressable style={modalS.cancelBtn2} onPress={onClose}>
              <Text style={modalS.cancelText2}>取消</Text>
            </Pressable>
            <Pressable
              style={modalS.confirmBtn}
              onPress={() => onSend({ type: t, count, deadline, amount })}
            >
              <Ionicons name="send" size={14} color="#FFF" />
              <Text style={modalS.confirmText}>一键发送</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NotifyToggle({ label, enabled, onToggle, sub, disabled }: {
  label: string; enabled: boolean; onToggle: (v: boolean) => void;
  sub?: string; disabled?: boolean;
}) {
  return (
    <Pressable
      style={[modalS.notifyRow, disabled && { opacity: 0.4 }]}
      onPress={() => !disabled && onToggle(!enabled)}
    >
      <View style={[modalS.checkbox, enabled && modalS.checkboxOn]}>
        {enabled && <Ionicons name="checkmark" size={12} color="#FFF" />}
      </View>
      <Text style={modalS.notifyLabel}>{label}</Text>
      {sub ? <Text style={modalS.notifySub}>{sub}</Text> : null}
    </Pressable>
  );
}

/* —————————————————— Styles —————————————————— */

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FAFAFE' },
  emptyText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 18, backgroundColor: PURPLE },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // —— 顶部导航栏 ——
  navBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 8,
    shadowColor: '#1E1B4B', shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B4B' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },

  headerZone: { backgroundColor: '#F8F8FC' },

  // —— 团长卡片 ——
  leaderCard: { marginHorizontal: 12, marginTop: 6 },
  leaderCardBg: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  leaderAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E9D5FF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  leaderAvatarText: { fontSize: 16, fontWeight: '800', color: PURPLE },
  leaderName: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  leaderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  leaderBadgeText: { fontSize: 9, fontWeight: '700', color: '#10B981' },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E9D5FF',
    backgroundColor: '#FFF',
  },
  contactBtnText: { fontSize: 12, fontWeight: '600', color: PURPLE },

  // —— 团信息区 ——
  infoSection: {
    backgroundColor: '#FFF', marginHorizontal: 12, marginTop: 10,
    borderRadius: 16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
    shadowColor: '#1E1B4B', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  infoTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stageBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 2,
  },
  stageBadgeText: { fontSize: 11, fontWeight: '700' },
  groupName: { fontSize: 17, fontWeight: '800', color: '#1E1B4B', flex: 1, lineHeight: 24 },
  groupDesc: { fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 20 },
  rulesCard: {
    marginTop: 10, padding: 10, backgroundColor: '#FFFBEB',
    borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A',
  },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  rulesTitle: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  rulesText: { fontSize: 11.5, color: '#92400E', lineHeight: 17 },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    marginTop: 10, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11.5, color: '#6B7280' },

  // —— 团详情·规则速览卡 ——
  noticeCard: {
    marginHorizontal: 14, marginTop: 14,
    backgroundColor: '#FFF', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 12,
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeIcon: {
    width: 28, height: 28, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  noticeTitle: { fontSize: 12, fontWeight: '700', color: '#1E1B4B' },
  noticeSub: { fontSize: 11, color: '#6B7280', marginTop: 2, lineHeight: 16 },
  noticeDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  noticeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  noticeBadgeText: { fontSize: 10, fontWeight: '800' },

  // —— 催款管理面板 ——
  remindCard: {
    marginHorizontal: 14, marginTop: 14,
    backgroundColor: '#FFF', borderRadius: 16,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4,
    shadowColor: '#1E1B4B', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  remindHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  remindTitle: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  remindMeta: { fontSize: 10, color: '#9CA3AF', marginLeft: 'auto' },

  remindBtnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  remindBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  remindBtnDivider: { width: 1, height: 36, backgroundColor: '#F3F4F6', marginHorizontal: 8 },
  remindBtnIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  remindBtnTitle: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  remindBtnSub: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },

  // —— 团长工具按钮行 ——
  leaderToolRow: {
    flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap',
  },
  leaderToolBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#1E1B4B', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  leaderToolText: { fontSize: 12, fontWeight: '600' },

  // —— 左右布局 ——
  mainSection: {
    flexDirection: 'row', backgroundColor: '#FFF', overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F0F0F5',
  },
  sideNav: {
    width: 68, flexBasis: 68, flexGrow: 0, flexShrink: 0,
    backgroundColor: '#F8F7FB',
    borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#EEEAF5',
  },
  sideNavContent: { paddingVertical: 6 },
  sideList: { gap: 2 },
  sideItem: {
    minHeight: 46, justifyContent: 'center',
    paddingVertical: 8, paddingLeft: 10, paddingRight: 6,
    position: 'relative',
  },
  sideItemOn: { backgroundColor: '#FFF' },
  sideBar: {
    position: 'absolute', left: 0, top: 9, bottom: 9,
    width: 3, borderTopRightRadius: 2, borderBottomRightRadius: 2, backgroundColor: PURPLE,
  },
  sideText: { fontSize: 12.5, lineHeight: 17, color: '#8F8A99', fontWeight: '500' },
  sideTextOn: { color: '#1E1B4B', fontWeight: '800' },
  productsCol: { flex: 1, flexBasis: 0, flexShrink: 1, minWidth: 0, backgroundColor: '#FFF' },
  productsContent: { width: '100%', padding: 8, paddingBottom: 80 },

  // —— 一键收款 · 二次确认 Modal ——
  collectModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  collectModalCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 22, padding: 22 },
  collectModalIconWrap: { alignSelf: 'center', width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  collectModalTitle: { fontSize: 16, fontWeight: '800', color: '#1E1B4B', textAlign: 'center' },
  collectModalSub: { fontSize: 12.5, color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  collectModalWarn: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginTop: 14,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  collectModalWarnText: { flex: 1, fontSize: 11.5, color: '#92400E', lineHeight: 17 },
  collectModalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  collectModalBtnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  collectModalBtnSecondaryText: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  collectModalBtnPrimary: { flex: 1.4, paddingVertical: 12, borderRadius: 12, backgroundColor: PINK, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  collectModalBtnPrimaryText: { fontSize: 13, fontWeight: '800', color: '#FFF' },

  // (placeholder)

  // —— 底部按钮 ——
  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingTop: 10,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    shadowColor: '#1E1B4B', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  btn: {
    flexDirection: 'column', alignItems: 'center', gap: 2,
    paddingHorizontal: 4, paddingVertical: 4,
    minWidth: 48,
  },
  btnLabel: { fontSize: 10, fontWeight: '600', color: PURPLE },
  btnSmall: {
    flexDirection: 'column', alignItems: 'center', gap: 1,
    paddingHorizontal: 4, paddingVertical: 4,
    minWidth: 44,
  },
  btnSmallLabel: { fontSize: 9, fontWeight: '600', color: PURPLE },

  // —— 团员加购 Toast 「已加入拼团池」 ——
  toastWrap: {
    position: 'absolute', left: 24, right: 24,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 27, 75, 0.92)',
    shadowColor: '#1E1B4B', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
    zIndex: 999,
  },
  toastIcon: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  toastTitle: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  toastSub:   { fontSize: 11, color: '#C4B5FD', marginTop: 2 },

  btnPrimary: { flex: 1, borderRadius: 24, overflow: 'hidden', minWidth: 100 },
  btnPrimaryInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 13,
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  cartSummary: { flex: 1, paddingLeft: 8 },
  cartCount: { fontSize: 11, color: '#6B7280' },
  cartTotal: { fontSize: 18, fontWeight: '800', color: '#1E1B4B' },
  freeTag: {
    fontSize: 10, color: '#10B981',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4,
    fontWeight: '700', overflow: 'hidden',
  },
});

const tileS = StyleSheet.create({
  card: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    alignSelf: 'stretch',
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  imgWrap: { width: 84, height: 84, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  img: { width: 84, height: 84 },
  adjustTag: {
    position: 'absolute', top: 4, left: 4,
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 6,
  },
  adjustTagText: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  statusTag: {
    position: 'absolute', bottom: 4, left: 4,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 6,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: '700', color: '#1E1B4B' },

  body: { flex: 1, justifyContent: 'space-between' },
  name: { fontSize: 13, fontWeight: '600', color: '#1E1B4B', lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { fontSize: 17, fontWeight: '800', color: PINK },
  priceUnit: { fontSize: 11, fontWeight: '700' },
  priceDecimal: { fontSize: 11, fontWeight: '700' },
  priceOriginal: { fontSize: 10, color: '#9CA3AF', textDecorationLine: 'line-through' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  heatPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  heatText: { fontSize: 9, fontWeight: '700' },

  buyBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: PURPLE, borderRadius: 16,
  },
  buyBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  stepperWrap: { alignItems: 'flex-end', gap: 3 },
  placedTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 6,
  },
  placedTagText: { fontSize: 9, fontWeight: '700', color: PURPLE },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F3FF', borderRadius: 16, paddingHorizontal: 4, paddingVertical: 2 },
  stepBtn: { width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  stepQty: { fontSize: 12, fontWeight: '800', color: PURPLE, minWidth: 16, textAlign: 'center' },

  editTagBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F5F3FF', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  editTagText: { fontSize: 11, fontWeight: '700', color: PURPLE },
});

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 14, paddingBottom: 28, paddingHorizontal: 18,
    maxHeight: '90%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '700', color: '#1E1B4B' },
  sub: { fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 14 },

  editRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FAFAFE', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 10,
  },
  editIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  editTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  editSub: { fontSize: 10, color: '#9CA3AF', marginTop: 3, lineHeight: 14 },

  editHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F5F3FF', borderRadius: 10,
    padding: 10, marginTop: 4,
  },
  editHintText: { flex: 1, fontSize: 10, color: '#6B7280', lineHeight: 16 },

  cancelBtn: { paddingVertical: 12, marginTop: 14, borderRadius: 14, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },

  // 催款 modal
  remindHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  previewCard: {
    backgroundColor: '#FFF1F2', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    marginTop: 4,
  },
  previewLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  previewValue: { fontSize: 16, fontWeight: '800', color: PINK, marginTop: 2 },
  previewMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#1E1B4B', marginTop: 14, marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F5FA', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  fieldInput: { flex: 1, fontSize: 13, color: '#1E1B4B', padding: 0 },
  fieldHint: { fontSize: 10, color: '#9CA3AF' },

  notifyList: { gap: 6 },
  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: PURPLE, borderColor: PURPLE },
  notifyLabel: { fontSize: 13, color: '#1E1B4B', fontWeight: '500' },
  notifySub: { fontSize: 10, color: '#9CA3AF', marginLeft: 'auto' },

  cancelBtn2: { flex: 1, paddingVertical: 13, borderRadius: 22, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelText2: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  confirmBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13, borderRadius: 22, backgroundColor: PURPLE },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});

/* —————————————————— 团员热门款软提示 样式 —————————————————— */
const hotS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: {
    width: '100%', maxWidth: 320,
    backgroundColor: '#FFF', borderRadius: 22,
    paddingVertical: 22, paddingHorizontal: 22,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#FFFBEB',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#1E1B4B', textAlign: 'center' },
  sub: { fontSize: 12.5, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 19 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  btnSecondary: {
    flex: 1, paddingVertical: 12, borderRadius: 20,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  btnPrimary: {
    flex: 1.2, flexDirection: 'row', gap: 5,
    paddingVertical: 12, borderRadius: 20,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
});

/* —————————————————— 团员下单成功 反馈样式 —————————————————— */
const doneS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 340,
    backgroundColor: '#FFF', borderRadius: 24,
    paddingVertical: 22, paddingHorizontal: 20,
    alignItems: 'stretch',
  },
  celebrate: {
    alignSelf: 'center',
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#1E1B4B', textAlign: 'center' },
  sub: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 5 },

  statCard: {
    backgroundColor: '#FAFAFE', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  statLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  statValue: { fontSize: 18, fontWeight: '800', color: PINK },
  statValueSmall: { fontSize: 12, fontWeight: '700', color: '#1E1B4B' },

  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F5F3FF',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 12,
  },
  tipText: { flex: 1, fontSize: 11, color: '#6B7280', lineHeight: 16 },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnSecondary: {
    flex: 1, paddingVertical: 12, borderRadius: 20,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  btnPrimary: {
    flex: 1.3, flexDirection: 'row', gap: 5,
    paddingVertical: 12, borderRadius: 20,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
});

const credS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 360,
    backgroundColor: '#FFF', borderRadius: 22,
    paddingHorizontal: 18, paddingVertical: 18,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 32, height: 32, borderRadius: 11,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: '#1E1B4B' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 8, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: '#FFFBEB', borderRadius: 8,
  },
  metaPillText: { fontSize: 10, fontWeight: '700', color: '#F59E0B' },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#1E1B4B', marginTop: 14, marginBottom: 8 },
  imgBox: { width: 110, height: 152, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6', position: 'relative' },
  img: { width: '100%', height: 96 },
  imgTypeTag: {
    position: 'absolute', top: 6, left: 6,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    backgroundColor: 'rgba(30,27,75,0.7)',
  },
  imgTypeText: { fontSize: 9, color: '#FFF', fontWeight: '700' },
  imgLabel: { paddingHorizontal: 6, paddingTop: 4, fontSize: 10, color: '#1E1B4B', lineHeight: 14 },
  emptyBox: {
    height: 80, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F8F8FC', borderRadius: 12, gap: 6,
  },
  emptyText: { fontSize: 11, color: '#9CA3AF' },

  contactList: { marginTop: 12, gap: 8 },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FAFAFE', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 10,
  },
  contactIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 10, color: '#9CA3AF' },
  contactValue: { fontSize: 13, fontWeight: '700', color: '#1E1B4B', marginTop: 2 },
  copyBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#F5F3FF', borderRadius: 10 },
  copyText: { fontSize: 11, fontWeight: '700', color: PURPLE },

  tip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F3FF', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    marginTop: 14,
  },
  tipText: { flex: 1, fontSize: 10, color: '#6D28D9', lineHeight: 14 },
});

const stageS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 12, paddingHorizontal: 18, paddingBottom: 24,
    maxHeight: '85%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: '#1E1B4B' },
  sub: { fontSize: 12, color: '#9CA3AF', marginTop: 4, lineHeight: 18 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: 14, backgroundColor: '#FAFAFE',
    marginBottom: 8,
  },
  rowActive: { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE' },
  rowIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '800', color: '#1E1B4B' },
  rowSub: { fontSize: 11, color: '#6B7280', marginTop: 2, lineHeight: 15 },

  cancelBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: 16, alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
});

// —— 团长「通知补邮费」Modal 样式 ——
const shipFeeS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 360,
    backgroundColor: '#FFF', borderRadius: 22,
    paddingVertical: 22, paddingHorizontal: 22,
    alignItems: 'center',
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '800', color: '#1E1B4B', textAlign: 'center' },
  sub: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  row: { width: '100%', marginTop: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#1E1B4B', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  inputPrefix: { fontSize: 14, fontWeight: '700', color: '#D97706', marginRight: 4 },
  input: {
    flex: 1, paddingVertical: 11, fontSize: 14, color: '#1E1B4B',
  },
  previewBox: {
    width: '100%', marginTop: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#FFFBEB', borderRadius: 12,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  previewText: { fontSize: 11, color: '#92400E', fontWeight: '700', flex: 1 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  confirmBtn: {
    flex: 1.4, paddingVertical: 12, borderRadius: 20,
    backgroundColor: '#D97706', alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
