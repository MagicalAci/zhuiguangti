import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Modal, Alert, TextInput, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Address {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault?: boolean;
}

function emptyAddress(): Address {
  return { id: '', name: '', phone: '', province: '', city: '', district: '', detail: '' };
}

/** 策划案 §2.3 页面 3 · 团员支付页面（成团后才出现） */

const PURPLE = '#7C3AED';
const PINK = '#F43F5E';

// V1 demo:支付页保留 4 种 PayKind
//   deposit:  首付定金(定金团第一步)
//   full:     一次性付全款(全款团)
//   final:    补尾款(定金团第二步)
//   shipFee:  补邮费(团长在拼团详情页 [通知补邮费] 卡片二次发起 · 处理货物过大邮费超预算)
// 默认邮费在团员下单时已并入应付总额 → shipFee 不是常规支付路径,仅作为团长事后补差的兜底通道
// 兼容旧路由参数 'fullOrDeposit' / 'finalPay'
type PayKind = 'deposit' | 'full' | 'final' | 'shipFee';
type RawKind = PayKind | 'fullOrDeposit' | 'finalPay';

interface PayOrder {
  id: string;
  ownerName: string;
  ownerAvatar: string;
  groupName: string;
  amount: number;
  // 24h 倒计时锚点
  deadlineMs: number;
  /** 团长联系方式 mock */
  contact: {
    wechat: string;
    qqGroup: string;
    phone: string;
  };
  /** 本团的付款方式：deposit = 定金+尾款；full = 全款 */
  payMode: 'deposit' | 'full';
  depositRate: number;                  // 0~1
  /** 补尾款截止日期（仅 deposit 时有意义） */
  finalPayDeadline: string;
  /** 邮费规则 */
  shipping: {
    kind: 'free' | 'need';
    label: string;
    estimate: number;                   // 预计邮费
    /** 'immediate' = 下单即补 ；'after_group' = 成团后补 ；'custom' = 自定义时间 */
    shipFeeTime: 'immediate' | 'after_group' | 'custom';
    /** 自定义补邮窗口（小时） */
    customHours?: number;
  };
}

// 与 profile.tsx 的 MOCK_MEMBER_ORDERS 保持同步的简易映射
const MOCK_ORDERS: Record<string, PayOrder> = {
  mo2: {
    id: 'mo2', ownerName: '星河里', ownerAvatar: '星',
    groupName: '恋与深空 角色香薰蜡烛团',
    amount: 68,
    deadlineMs: Date.now() + 23 * 60 * 60 * 1000 + 42 * 60 * 1000 + 8 * 1000,
    contact: { wechat: 'xinghe_li_2024', qqGroup: '826 192 880', phone: '138****5577' },
    payMode: 'deposit',
    depositRate: 0.3,
    finalPayDeadline: '2026-06-08',
    shipping: { kind: 'need', label: '江浙沪 ¥7 · 其他 ¥8', estimate: 7, shipFeeTime: 'after_group', customHours: 24 },
  },
  mo3: {
    id: 'mo3', ownerName: '团长大人', ownerAvatar: '团',
    groupName: '偶像梦幻祭 6月新谷代购团',
    amount: 7,
    deadlineMs: Date.now() + 4 * 24 * 60 * 60 * 1000,
    contact: { wechat: 'zgt_leader_88', qqGroup: '826 188 880', phone: '139****6612' },
    payMode: 'deposit',
    depositRate: 0.3,
    finalPayDeadline: '2026-06-10',
    shipping: { kind: 'need', label: '江浙沪 ¥7 · 其他 ¥8', estimate: 7, shipFeeTime: 'after_group', customHours: 24 },
  },
  mo4: {
    id: 'mo4', ownerName: '团长大人', ownerAvatar: '团',
    groupName: '偶像梦幻祭 6月新谷代购团',
    amount: 47.25,
    deadlineMs: Date.now() + 4 * 24 * 60 * 60 * 1000,
    contact: { wechat: 'zgt_leader_88', qqGroup: '826 188 880', phone: '139****6612' },
    payMode: 'deposit',
    depositRate: 0.3,
    finalPayDeadline: '2026-06-10',
    shipping: { kind: 'need', label: '江浙沪 ¥7 · 其他 ¥8', estimate: 7, shipFeeTime: 'after_group', customHours: 24 },
  },
  // 团长事后发起的补邮费(对应 member/orders-ongoing 中 mo8)
  mo8: {
    id: 'mo8', ownerName: '团长大人', ownerAvatar: '团',
    groupName: '偶像梦幻祭 6月新谷代购团',
    amount: 5,
    deadlineMs: Date.now() + 3 * 24 * 60 * 60 * 1000,
    contact: { wechat: 'zgt_leader_88', qqGroup: '826 188 880', phone: '139****6612' },
    payMode: 'deposit',
    depositRate: 0.3,
    finalPayDeadline: '2026-06-10',
    shipping: { kind: 'need', label: '包裹超过 3kg · 顺丰实际邮费上浮', estimate: 5, shipFeeTime: 'after_group', customHours: 24 },
  },
};

const KIND_CFG: Record<PayKind, { title: string; subTitle: string; hint: string; accent: [string, string] }> = {
  deposit: {
    title: '去付定金',
    subTitle: '团长已发起收定金 · 限时支付',
    hint: '请在 24h 内完成付款,超时系统将自动撤排该订单',
    accent: [PINK, '#FB7185'],
  },
  full: {
    title: '去付全款',
    subTitle: '团长已发起收全款 · 限时支付',
    hint: '请在 24h 内完成付款,超时系统将自动撤排该订单',
    accent: [PINK, '#FB7185'],
  },
  final: {
    title: '去付尾款',
    subTitle: '团长已发起补尾款',
    hint: '请在截止前补齐尾款,超时将自动剔除并加入团长黑名单候选',
    accent: ['#A855F7', '#C084FC'],
  },
  shipFee: {
    title: '去补邮费',
    subTitle: '团长已发起补邮费 · 货物过大 / 实际邮费超预算',
    hint: '该笔为团长事后补差,请按提示金额完成支付。常规邮费已在下单时一次性结算,此处仅处理超额部分',
    accent: ['#D97706', '#F59E0B'],
  },
};

function normalizeKind(raw: string | undefined, mode: 'deposit' | 'full'): PayKind {
  // 兼容旧值
  if (raw === 'deposit' || raw === 'full' || raw === 'final' || raw === 'shipFee') return raw;
  if (raw === 'finalPay') return 'final';
  // 'fullOrDeposit' / undefined: 走团 payMode 推断第一笔支付类型
  return mode === 'deposit' ? 'deposit' : 'full';
}

export default function PayPage() {
  const { id, kind } = useLocalSearchParams<{ id?: string; kind?: RawKind }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const orderId = (id as string) || 'mo2';
  const order = MOCK_ORDERS[orderId] || MOCK_ORDERS.mo2;
  const payKind: PayKind = normalizeKind(kind as string | undefined, order.payMode);
  const cfg = KIND_CFG[payKind];

  // —— 倒计时 ——
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remain = Math.max(0, order.deadlineMs - now);
  const remainText = useMemo(() => {
    if (remain <= 0) return '已超时';
    const h = Math.floor(remain / 3600_000);
    const m = Math.floor((remain % 3600_000) / 60_000);
    const sec = Math.floor((remain % 60_000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }, [remain]);

  // —— 哈啰平台保障 详情 Modal ——
  const [haloDetailOpen, setHaloDetailOpen] = useState(false);
  // —— 团长联系方式 Modal ——
  const [contactOpen, setContactOpen] = useState(false);
  // —— 提交完成 ——
  const [doneOpen, setDoneOpen] = useState(false);

  // —— 收货地址（首单支付时必填，补尾款/补邮亦可改） ——
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: 'a1', name: '追光的小七', phone: '138****5566',
      province: '浙江省', city: '杭州市', district: '余杭区',
      detail: '梦想小镇 4 号楼 502 室',
      isDefault: true,
    },
  ]);
  const [activeAddrId, setActiveAddrId] = useState<string>('a1');
  const [addrSheetOpen, setAddrSheetOpen] = useState(false);
  const [editAddrId, setEditAddrId] = useState<string | null>(null);
  const [addrDraft, setAddrDraft] = useState<Address>(emptyAddress());
  const activeAddress = addresses.find((a) => a.id === activeAddrId) ?? addresses[0];

  const handleSubmit = () => {
    if (!activeAddress) {
      Alert.alert('请先添加收货地址');
      return;
    }
    setDoneOpen(true);
  };

  // —— 地址操作 ——
  const openAddNew = () => {
    setEditAddrId(null);
    setAddrDraft({ ...emptyAddress(), id: `a_${Date.now().toString(36)}` });
    setAddrSheetOpen(true);
  };
  const openEdit = (a: Address) => {
    setEditAddrId(a.id);
    setAddrDraft({ ...a });
    setAddrSheetOpen(true);
  };
  const saveAddr = () => {
    if (!addrDraft.name.trim() || !addrDraft.phone.trim() || !addrDraft.detail.trim()) {
      Alert.alert('请补全信息', '收件人 / 手机号 / 详细地址必填');
      return;
    }
    setAddresses((prev) => {
      let next: Address[];
      if (editAddrId) {
        next = prev.map((a) => (a.id === editAddrId ? { ...addrDraft } : a));
      } else {
        next = [...prev, { ...addrDraft }];
      }
      // 默认地址互斥
      if (addrDraft.isDefault) {
        next = next.map((a) => ({ ...a, isDefault: a.id === addrDraft.id }));
      }
      return next;
    });
    setActiveAddrId(addrDraft.id);
    setAddrSheetOpen(false);
  };
  const deleteAddr = (aid: string) => {
    Alert.alert('删除地址', '确认删除该地址？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确认删除', style: 'destructive', onPress: () => {
          setAddresses((prev) => {
            const next = prev.filter((a) => a.id !== aid);
            if (next.length && aid === activeAddrId) setActiveAddrId(next[0].id);
            return next;
          });
        },
      },
    ]);
  };
  const handleBackToOrders = () => {
    setDoneOpen(false);
    router.back();
  };

  return (
    <View style={s.screen}>
      {/* —— 顶部 header —— */}
      <LinearGradient
        colors={cfg.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.topRow}>
          <Pressable style={s.iconBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <Text style={s.title}>{cfg.title}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* 拼团信息卡 */}
        <View style={s.infoCard}>
          <View style={s.infoOwnerRow}>
            <View style={s.ownerAvatar}>
              <Text style={s.ownerAvatarText}>{order.ownerAvatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ownerName}>{order.ownerName}</Text>
              <Text style={s.groupName} numberOfLines={1}>{order.groupName}</Text>
            </View>
            <View style={s.kindPill}>
              <Text style={s.kindPillText}>{cfg.subTitle}</Text>
            </View>
          </View>

          <View style={s.amountWrap}>
            <Text style={s.amountLabel}>应付金额</Text>
            <Text style={s.amountValue}>
              <Text style={s.amountUnit}>¥</Text>{Math.floor(order.amount)}
              <Text style={s.amountDecimal}>.{((order.amount * 100) % 100).toFixed(0).padStart(2, '0')}</Text>
            </Text>
          </View>

          <View style={s.countdownRow}>
            <Ionicons name="time-outline" size={14} color={remain > 0 ? cfg.accent[0] : '#EF4444'} />
            <Text style={s.countdownLabel}>付款倒计时</Text>
            <Text style={[s.countdownText, { color: remain > 0 ? cfg.accent[0] : '#EF4444' }]}>{remainText}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 110 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* —— 收货地址（置顶 · 类淘宝） —— */}
        <View style={s.addrCard}>
          <View style={s.addrHeader}>
            <Ionicons name="location-outline" size={16} color={PURPLE} />
            <Text style={s.addrTitle}>收货地址</Text>
            <View style={s.requiredTag}>
              <Text style={s.requiredText}>必填</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Pressable style={s.addrMore} onPress={openAddNew} hitSlop={8}>
              <Ionicons name="add-circle" size={14} color={PURPLE} />
              <Text style={s.addrMoreText}>新增</Text>
            </Pressable>
          </View>

          {activeAddress ? (
            <Pressable style={s.addrCurrent} onPress={() => openEdit(activeAddress)}>
              <View style={{ flex: 1 }}>
                <View style={s.addrNameRow}>
                  <Text style={s.addrName}>{activeAddress.name}</Text>
                  <Text style={s.addrPhone}>{activeAddress.phone}</Text>
                  {activeAddress.isDefault && (
                    <View style={s.defaultTag}><Text style={s.defaultTagText}>默认</Text></View>
                  )}
                </View>
                <Text style={s.addrDetail} numberOfLines={2}>
                  {activeAddress.province} {activeAddress.city} {activeAddress.district} {activeAddress.detail}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C4C4D4" />
            </Pressable>
          ) : (
            <Pressable style={s.addrEmpty} onPress={openAddNew}>
              <Ionicons name="add-outline" size={22} color={PURPLE} />
              <Text style={s.addrEmptyText}>+ 添加收货地址</Text>
            </Pressable>
          )}

          {addresses.length > 1 && (
            <View style={s.addrSwitcher}>
              <Text style={s.addrSwitcherLabel}>切换地址：</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {addresses.map((a) => (
                  <Pressable
                    key={a.id}
                    style={[s.addrPill, activeAddrId === a.id && s.addrPillActive]}
                    onPress={() => setActiveAddrId(a.id)}
                  >
                    <Text
                      style={[s.addrPillText, activeAddrId === a.id && s.addrPillTextActive]}
                      numberOfLines={1}
                    >
                      {a.name} · {a.city}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={s.addrTipBox}>
            <Ionicons name="shield-checkmark-outline" size={12} color="#10B981" />
            <Text style={s.addrTipText}>地址仅团长可见 · 用于本次拼团发货</Text>
          </View>
        </View>

        {/* —— 平台代收款保障卡 —— */}
        <LinearGradient
          colors={['#7C3AED', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.guardCard}
        >
          <View style={s.guardHeaderRow}>
            <View style={s.guardLogo}>
              <Text style={s.guardLogoText}>哈啰</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.guardTitle}>哈啰平台代收 · 资金安全</Text>
              <Text style={s.guardSub}>追光体接入哈啰收银台，由平台代为托管资金</Text>
            </View>
            <Pressable style={s.guardHelp} onPress={() => setHaloDetailOpen(true)} hitSlop={6}>
              <Text style={s.guardHelpText}>?</Text>
            </Pressable>
          </View>

          <View style={s.guardPointsRow}>
            <View style={s.guardPoint}>
              <View style={s.guardPointIcon}>
                <Ionicons name="shield-checkmark" size={14} color="#FFF" />
              </View>
              <Text style={s.guardPointText}>资金{'\n'}托管</Text>
            </View>
            <View style={s.guardPoint}>
              <View style={s.guardPointIcon}>
                <Ionicons name="time-outline" size={14} color="#FFF" />
              </View>
              <Text style={s.guardPointText}>到货{'\n'}确认放款</Text>
            </View>
            <View style={s.guardPoint}>
              <View style={s.guardPointIcon}>
                <Ionicons name="alert-circle" size={14} color="#FFF" />
              </View>
              <Text style={s.guardPointText}>跑单{'\n'}全额可申诉</Text>
            </View>
            <View style={s.guardPoint}>
              <View style={s.guardPointIcon}>
                <Ionicons name="cash-outline" size={14} color="#FFF" />
              </View>
              <Text style={s.guardPointText}>0 手续费{'\n'}全程透明</Text>
            </View>
          </View>
        </LinearGradient>

        {/* —— 金额明细 —— */}
        <View style={s.amountCard}>
          <View style={s.amountRow}>
            <Text style={s.amountRowLabel}>{cfg.subTitle}</Text>
            <Text style={s.amountRowValue}>¥{order.amount.toFixed(2)}</Text>
          </View>
          <View style={s.amountDivider} />
          <View style={s.amountRow}>
            <Text style={[s.amountRowLabel, { fontWeight: '800', color: '#1E1B4B' }]}>实付</Text>
            <Text style={[s.amountRowValue, { color: PINK, fontWeight: '800', fontSize: 20 }]}>
              ¥{order.amount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* —— 联系团长提示 —— */}
        <View style={s.contactTip}>
          <View style={s.contactTipIcon}>
            <Ionicons name="chatbubble-ellipses" size={14} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.contactTipTitle}>记得加上 {order.ownerName} 的联系方式</Text>
            <Text style={s.contactTipSub}>团长会在群内同步物流、发货时间、补尾款等关键信息</Text>
          </View>
          <Pressable style={s.contactTipBtn} onPress={() => setContactOpen(true)}>
            <Ionicons name="eye-outline" size={11} color="#FFF" />
            <Text style={s.contactTipBtnText}>查看</Text>
          </Pressable>
        </View>

        {/* —— 首单支付:后续款项提醒(仅定金团首付时显示) —— */}
        {payKind === 'deposit' && (
          <View style={s.followUpCard}>
            <View style={s.followUpHeader}>
              <View style={s.followUpHeaderIcon}>
                <Ionicons name="alert-circle" size={14} color="#F59E0B" />
              </View>
              <Text style={s.followUpHeaderTitle}>提示 · 本团还有后续款项,请关注</Text>
            </View>

            {order.payMode === 'deposit' && (
              <View style={s.followUpRow}>
                <View style={[s.followUpDot, { backgroundColor: '#FFF1F2' }]}>
                  <Ionicons name="cash-outline" size={12} color={PINK} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.followUpTitle}>
                    本团采取 <Text style={{ color: PINK, fontWeight: '800' }}>定金 {Math.round(order.depositRate * 100)}%</Text> 模式,**待团长通知** 后补 {Math.round((1 - order.depositRate) * 100)}% 尾款
                  </Text>
                  <Text style={s.followUpSub}>
                    预计尾款约 ¥{(order.amount * (1 - order.depositRate) / order.depositRate).toFixed(2)} · 团长发起补尾款前订单显示「尾款时间待团长通知」
                  </Text>
                  <Text style={s.followUpHint}>⚠️ 团长发起补尾款后请尽快支付,逾期会自动剔除</Text>
                </View>
              </View>
            )}

            {order.shipping.kind === 'need' && (
              <View style={s.followUpRow}>
                <View style={[s.followUpDot, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="cube-outline" size={12} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.followUpTitle}>
                    本团 <Text style={{ color: '#10B981', fontWeight: '800' }}>邮费已自动算入应付总额</Text>
                    {' · '}{order.shipping.label}
                  </Text>
                  <Text style={s.followUpSub}>
                    V1 demo 起取消「补邮费」单独环节,邮费在下单时就并入应付金额一次性结算
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* —— 风控提示 —— */}
        <View style={s.tipBox}>
          <Ionicons name="warning-outline" size={14} color={cfg.accent[0]} />
          <Text style={s.tipText}>
            <Text style={{ fontWeight: '700', color: cfg.accent[0] }}>注意：</Text>
            {cfg.hint}
          </Text>
        </View>
      </ScrollView>

      {/* —— 底部 [前往哈啰平台支付] —— */}
      <View style={[s.bottomBar, { paddingBottom: 10 + insets.bottom }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.bottomLabel}>实付 <Text style={{ color: PINK, fontWeight: '800', fontSize: 16 }}>¥{order.amount.toFixed(2)}</Text></Text>
          <Text style={s.bottomSub}>{!activeAddress ? '请先添加收货地址' : '哈啰平台代收 · 安全有保障'}</Text>
        </View>
        <Pressable
          style={[s.submitBtn, !activeAddress && { opacity: 0.4 }]}
          disabled={!activeAddress}
          onPress={handleSubmit}
        >
          <LinearGradient
            colors={cfg.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.submitBtnInner}
          >
            <Ionicons name="shield-checkmark" size={16} color="#FFF" />
            <Text style={s.submitBtnText}>哈啰平台支付</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* ============ 提交完成 Modal ============ */}
      <Modal visible={doneOpen} transparent animationType="fade" onRequestClose={() => setDoneOpen(false)}>
        <Pressable style={doneS.overlay} onPress={() => setDoneOpen(false)}>
          <Pressable style={doneS.card} onPress={(e) => e.stopPropagation()}>
            <View style={doneS.iconWrap}>
              <Text style={{ fontSize: 38 }}>🛡️</Text>
            </View>
            <Text style={doneS.title}>支付成功</Text>
            <Text style={doneS.sub}>
              款项已由 <Text style={{ color: PURPLE, fontWeight: '700' }}>哈啰平台</Text> 代为托管
              {'\n'}到货确认收货后自动结算给团长
            </Text>

            <View style={doneS.statusFlow}>
              <View style={doneS.flowStep}>
                <View style={[doneS.flowDot, { backgroundColor: '#10B981' }]}><Ionicons name="checkmark" size={9} color="#FFF" /></View>
                <Text style={doneS.flowText}>已支付</Text>
              </View>
              <View style={doneS.flowLine} />
              <View style={doneS.flowStep}>
                <View style={[doneS.flowDot, { backgroundColor: PURPLE }]}><Ionicons name="lock-closed" size={9} color="#FFF" /></View>
                <Text style={[doneS.flowText, { color: PURPLE, fontWeight: '800' }]}>平台托管</Text>
              </View>
              <View style={[doneS.flowLine, { backgroundColor: '#E5E7EB' }]} />
              <View style={doneS.flowStep}>
                <View style={[doneS.flowDot, { backgroundColor: '#E5E7EB' }]} />
                <Text style={[doneS.flowText, { color: '#9CA3AF' }]}>待发货</Text>
              </View>
            </View>

            <Pressable style={doneS.confirmBtn} onPress={handleBackToOrders}>
              <Text style={doneS.confirmText}>回到我的订单</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============ 哈啰平台保障 详情 Modal ============ */}
      <Modal visible={haloDetailOpen} transparent animationType="fade" onRequestClose={() => setHaloDetailOpen(false)}>
        <Pressable style={haloS.overlay} onPress={() => setHaloDetailOpen(false)}>
          <Pressable style={haloS.card} onPress={(e) => e.stopPropagation()}>
            <View style={haloS.headerRow}>
              <View style={haloS.headerIcon}>
                <Text style={{ fontSize: 18 }}>🛡️</Text>
              </View>
              <Text style={haloS.title}>哈啰平台代收 · 资金保障</Text>
              <Pressable onPress={() => setHaloDetailOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color="#9CA3AF" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <Text style={haloS.sectionTitle}>为什么选哈啰平台代收？</Text>
              <View style={haloS.bulletRow}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={haloS.bulletText}>
                  <Text style={{ fontWeight: '700' }}>资金托管：</Text>定金 / 尾款全部进入哈啰平台银行级账户，团长无法挪用
                </Text>
              </View>
              <View style={haloS.bulletRow}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={haloS.bulletText}>
                  <Text style={{ fontWeight: '700' }}>到货放款：</Text>团员确认收货后才结算给团长，团长跑单可申诉全额退款
                </Text>
              </View>
              <View style={haloS.bulletRow}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={haloS.bulletText}>
                  <Text style={{ fontWeight: '700' }}>0 手续费：</Text>追光体不抽佣、不收提现手续费，团长打开哈啰 APP 即可随时提现
                </Text>
              </View>
              <View style={haloS.bulletRow}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={haloS.bulletText}>
                  <Text style={{ fontWeight: '700' }}>信任背书：</Text>哈啰为大众熟知的出行平台，资金通道接入哈啰收银台
                </Text>
              </View>

              <Text style={haloS.sectionTitle}>资金流向（团员视角）</Text>
              <View style={haloS.flowCard}>
                <View style={haloS.flowItem}>
                  <View style={[haloS.flowDot, { backgroundColor: '#10B981' }]}><Text style={haloS.flowDotText}>1</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={haloS.flowTitle}>本页一键支付</Text>
                    <Text style={haloS.flowSub}>跳转哈啰收银台完成支付，款项进入平台托管</Text>
                  </View>
                </View>
                <View style={haloS.flowLine} />
                <View style={haloS.flowItem}>
                  <View style={[haloS.flowDot, { backgroundColor: '#7C3AED' }]}><Text style={haloS.flowDotText}>2</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={haloS.flowTitle}>团长接单 / 发货</Text>
                    <Text style={haloS.flowSub}>团长在 App 内可查看到账状态，但 <Text style={{ color: PINK, fontWeight: '700' }}>无法提取定金</Text></Text>
                  </View>
                </View>
                <View style={haloS.flowLine} />
                <View style={haloS.flowItem}>
                  <View style={[haloS.flowDot, { backgroundColor: '#3B82F6' }]}><Text style={haloS.flowDotText}>3</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={haloS.flowTitle}>团员确认收货</Text>
                    <Text style={haloS.flowSub}>确认无误后由平台结算给团长 → 哈啰 APP 内提现</Text>
                  </View>
                </View>
                <View style={haloS.flowLine} />
                <View style={haloS.flowItem}>
                  <View style={[haloS.flowDot, { backgroundColor: '#F43F5E' }]}><Text style={haloS.flowDotText}>!</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={haloS.flowTitle}>若团长跑单 / 商品有问题</Text>
                    <Text style={haloS.flowSub}>在 App 内发起申诉，平台介入核实后原路退款给团员</Text>
                  </View>
                </View>
              </View>

              <View style={haloS.warnBox}>
                <Ionicons name="alert-circle-outline" size={13} color="#F59E0B" />
                <Text style={haloS.warnText}>
                  不再支持线下转账 / 私下交易，请勿将款项打到团长私人账户，平台无法保护此类交易。
                </Text>
              </View>
            </ScrollView>

            <Pressable style={haloS.confirmBtn} onPress={() => setHaloDetailOpen(false)}>
              <Text style={haloS.confirmText}>知道了</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============ 团长联系方式 Modal ============ */}
      <Modal visible={contactOpen} transparent animationType="fade" onRequestClose={() => setContactOpen(false)}>
        <Pressable style={contactM.overlay} onPress={() => setContactOpen(false)}>
          <Pressable style={contactM.card} onPress={(e) => e.stopPropagation()}>
            <View style={contactM.headerRow}>
              <View style={contactM.headerIcon}>
                <Ionicons name="chatbubble-ellipses" size={16} color="#10B981" />
              </View>
              <Text style={contactM.title}>团长联系方式</Text>
              <Pressable onPress={() => setContactOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color="#9CA3AF" />
              </Pressable>
            </View>

            <View style={contactM.ownerRow}>
              <View style={contactM.ownerAvatar}>
                <Text style={contactM.ownerAvatarText}>{order.ownerAvatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={contactM.ownerName}>{order.ownerName}</Text>
                <Text style={contactM.ownerSub} numberOfLines={1}>{order.groupName}</Text>
              </View>
              <View style={contactM.creditBadge}>
                <Ionicons name="ribbon" size={10} color="#F59E0B" />
                <Text style={contactM.creditBadgeText}>信誉 98</Text>
              </View>
            </View>

            <View style={contactM.list}>
              <View style={contactM.row}>
                <View style={[contactM.rowIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={{ fontSize: 16 }}>💬</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={contactM.rowLabel}>微信</Text>
                  <Text style={contactM.rowValue}>{order.contact.wechat}</Text>
                </View>
                <Pressable
                  style={contactM.copyBtn}
                  onPress={() => Alert.alert('已复制', `微信号 ${order.contact.wechat} 已复制到剪贴板`)}
                >
                  <Ionicons name="copy-outline" size={11} color="#FFF" />
                  <Text style={contactM.copyText}>复制</Text>
                </Pressable>
              </View>

              <View style={contactM.row}>
                <View style={[contactM.rowIcon, { backgroundColor: '#F5F3FF' }]}>
                  <Text style={{ fontSize: 16 }}>📱</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={contactM.rowLabel}>QQ 群</Text>
                  <Text style={contactM.rowValue}>{order.contact.qqGroup}</Text>
                </View>
                <Pressable
                  style={contactM.copyBtn}
                  onPress={() => Alert.alert('已复制', `QQ 群号 ${order.contact.qqGroup} 已复制到剪贴板`)}
                >
                  <Ionicons name="copy-outline" size={11} color="#FFF" />
                  <Text style={contactM.copyText}>复制</Text>
                </Pressable>
              </View>

              <View style={contactM.row}>
                <View style={[contactM.rowIcon, { backgroundColor: '#FFFBEB' }]}>
                  <Text style={{ fontSize: 16 }}>📞</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={contactM.rowLabel}>电话（仅特殊情况使用）</Text>
                  <Text style={contactM.rowValue}>{order.contact.phone}</Text>
                </View>
                <Pressable
                  style={[contactM.copyBtn, { backgroundColor: '#F3F4F6' }]}
                  onPress={() => Alert.alert('提示', '团员一般通过群聊与团长沟通；如确需电话，请说明事项')}
                >
                  <Ionicons name="information-circle-outline" size={11} color="#6B7280" />
                  <Text style={[contactM.copyText, { color: '#6B7280' }]}>说明</Text>
                </Pressable>
              </View>
            </View>

            <View style={contactM.tip}>
              <Ionicons name="alert-circle-outline" size={12} color="#F59E0B" />
              <Text style={contactM.tipText}>
                成团后系统会 <Text style={{ fontWeight: '800' }}>自动建群</Text>，物流 / 补尾款 / 补邮 都通过群通知。请尽快加 <Text style={{ fontWeight: '800' }}>微信 / QQ 群</Text> 不要错过关键提醒。
              </Text>
            </View>

            <Pressable style={contactM.confirmBtn} onPress={() => setContactOpen(false)}>
              <Text style={contactM.confirmText}>知道了</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============ 收货地址编辑弹层 ============ */}
      <Modal visible={addrSheetOpen} transparent animationType="slide" onRequestClose={() => setAddrSheetOpen(false)}>
        <Pressable style={addrS.overlay} onPress={() => setAddrSheetOpen(false)}>
          <Pressable style={addrS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={addrS.handle} />
            <Text style={addrS.title}>{editAddrId ? '编辑地址' : '新增收货地址'}</Text>

            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              <Text style={addrS.fieldLabel}>收件人</Text>
              <View style={addrS.fieldRow}>
                <Ionicons name="person-outline" size={14} color="#9CA3AF" />
                <TextInput
                  style={addrS.fieldInput}
                  placeholder="请输入收件人姓名"
                  placeholderTextColor="#C4C4D4"
                  value={addrDraft.name}
                  onChangeText={(v) => setAddrDraft({ ...addrDraft, name: v })}
                />
              </View>

              <Text style={addrS.fieldLabel}>手机号</Text>
              <View style={addrS.fieldRow}>
                <Ionicons name="call-outline" size={14} color="#9CA3AF" />
                <TextInput
                  style={addrS.fieldInput}
                  placeholder="请输入 11 位手机号"
                  placeholderTextColor="#C4C4D4"
                  value={addrDraft.phone}
                  onChangeText={(v) => setAddrDraft({ ...addrDraft, phone: v.replace(/[^\d*]/g, '') })}
                  keyboardType="number-pad"
                  maxLength={15}
                />
              </View>

              <Text style={addrS.fieldLabel}>所在地区</Text>
              <View style={addrS.regionRow}>
                <Pressable style={addrS.regionField} onPress={() => {
                  setAddrDraft({ ...addrDraft, province: '浙江省', city: '杭州市', district: '余杭区' });
                }}>
                  <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                  <Text style={[addrS.regionText, !addrDraft.province && { color: '#C4C4D4' }]}>
                    {addrDraft.province ? `${addrDraft.province} · ${addrDraft.city} · ${addrDraft.district}` : '点击选择 省 / 市 / 区'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#C4C4D4" />
                </Pressable>
              </View>

              <Text style={addrS.fieldLabel}>详细地址</Text>
              <View style={[addrS.fieldRow, { alignItems: 'flex-start' }]}>
                <Ionicons name="home-outline" size={14} color="#9CA3AF" style={{ marginTop: 4 }} />
                <TextInput
                  style={[addrS.fieldInput, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="例如：街道、小区、楼栋、门牌"
                  placeholderTextColor="#C4C4D4"
                  multiline
                  value={addrDraft.detail}
                  onChangeText={(v) => setAddrDraft({ ...addrDraft, detail: v })}
                />
              </View>

              <View style={addrS.switchRow}>
                <Text style={addrS.switchLabel}>设为默认地址</Text>
                <Switch
                  value={!!addrDraft.isDefault}
                  onValueChange={(v) => setAddrDraft({ ...addrDraft, isDefault: v })}
                  trackColor={{ true: PURPLE, false: '#E5E7EB' }}
                  thumbColor="#FFF"
                />
              </View>

              {editAddrId && (
                <Pressable style={addrS.dangerBtn} onPress={() => { setAddrSheetOpen(false); deleteAddr(editAddrId); }}>
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  <Text style={addrS.dangerText}>删除该地址</Text>
                </Pressable>
              )}
            </ScrollView>

            <View style={addrS.btnRow}>
              <Pressable style={addrS.cancelBtn} onPress={() => setAddrSheetOpen(false)}>
                <Text style={addrS.cancelText}>取消</Text>
              </Pressable>
              <Pressable style={addrS.confirmBtn} onPress={saveAddr}>
                <LinearGradient
                  colors={[PURPLE, '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={addrS.confirmInner}
                >
                  <Ionicons name="save-outline" size={14} color="#FFF" />
                  <Text style={addrS.confirmText}>{editAddrId ? '保存修改' : '保存地址'}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ============ Styles ============ */
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

  // —— 拼团信息卡 ——
  infoCard: {
    marginTop: 14,
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 14,
  },
  infoOwnerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ownerAvatar: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  ownerAvatarText: { fontSize: 14, fontWeight: '800', color: PURPLE },
  ownerName: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  groupName: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  kindPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: '#FFF1F2', borderRadius: 8,
  },
  kindPillText: { fontSize: 10, fontWeight: '700', color: PINK },

  amountWrap: {
    marginTop: 14, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  amountLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  amountValue: { fontSize: 32, fontWeight: '800', color: PINK, letterSpacing: -1, marginTop: 4 },
  amountUnit: { fontSize: 16, fontWeight: '700' },
  amountDecimal: { fontSize: 18, fontWeight: '700' },

  countdownRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    justifyContent: 'center',
  },
  countdownLabel: { fontSize: 11, color: '#6B7280' },
  countdownText: { fontSize: 14, fontWeight: '800', marginLeft: 4, fontVariant: ['tabular-nums'] as any },

  // —— 二维码卡 ——
  qrCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 2,
    shadowColor: '#1E1B4B', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  qrTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qrTitle: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  qrChannelTabs: { flexDirection: 'row', gap: 4, backgroundColor: '#F3F4F6', borderRadius: 14, padding: 3 },
  qrTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 11 },
  qrTabActive: {},
  qrTabText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },

  qrFrame: {
    alignSelf: 'center',
    marginTop: 14, marginBottom: 10,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#F3F4F6',
    position: 'relative',
  },
  qrCenter: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  qrCenterIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF',
  },
  qrCenterText: { fontSize: 14, fontWeight: '800', color: '#FFF' },

  qrHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },

  qrMeta: {
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    gap: 8,
  },
  qrMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qrMetaLabel: { fontSize: 12, color: '#6B7280' },
  qrMetaValue: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },

  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    marginTop: 12, paddingVertical: 10,
    backgroundColor: '#F5F3FF', borderRadius: 14,
  },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: PURPLE },

  // —— 上传卡 ——
  uploadCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    shadowColor: '#1E1B4B', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  uploadHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadTitle: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  requiredTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#FEF2F2' },
  requiredText: { fontSize: 10, fontWeight: '700', color: '#EF4444' },
  uploadSub: { fontSize: 11, color: '#9CA3AF', marginTop: 4, lineHeight: 16 },

  uploadBox: {
    marginTop: 12,
    borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 16,
    paddingVertical: 26, alignItems: 'center', gap: 10,
    backgroundColor: '#FAFAFE',
  },
  uploadIcon: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadText: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  uploadSubText: { fontSize: 10, color: '#9CA3AF' },
  uploadProgress: { width: 180, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  uploadProgressFill: { height: 4, backgroundColor: PURPLE },

  uploadedBox: { marginTop: 12 },
  uploadedCert: {
    alignSelf: 'center',
    width: 200, height: 264,
    borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 18,
    justifyContent: 'space-between',
  },
  uploadedCertHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  uploadedCertIcon: {
    width: 28, height: 28, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadedCertApp: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  uploadedCertSub: { fontSize: 10, color: 'rgba(255,255,255,0.85)' },
  uploadedCertCenter: { alignItems: 'center' },
  uploadedCertLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  uploadedCertAmount: { fontSize: 28, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginTop: 6 },
  uploadedMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  uploadedMeta: { fontSize: 10, color: 'rgba(255,255,255,0.9)' },

  uploadedActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12,
  },
  uploadedSuccess: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  uploadedSuccessText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },

  // —— 收货地址 ——
  addrCard: {
    backgroundColor: '#FFF', borderRadius: 18,
    padding: 14, marginTop: 14,
    shadowColor: '#1E1B4B', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  addrHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addrTitle: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  addrMore: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: '#F5F3FF', borderRadius: 10,
  },
  addrMoreText: { fontSize: 11, fontWeight: '700', color: PURPLE },
  addrCurrent: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FAFAFE', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 12,
    marginTop: 10,
  },
  addrNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addrName: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  addrPhone: { fontSize: 12, color: '#6B7280' },
  defaultTag: { backgroundColor: '#F5F3FF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  defaultTagText: { fontSize: 9, color: PURPLE, fontWeight: '700' },
  addrDetail: { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 17 },
  addrEmpty: {
    marginTop: 10,
    paddingVertical: 18, borderRadius: 14,
    borderWidth: 1.5, borderColor: PURPLE, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4, flexDirection: 'row',
  },
  addrEmptyText: { fontSize: 13, fontWeight: '700', color: PURPLE },

  addrSwitcher: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addrSwitcherLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  addrPill: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12, backgroundColor: '#F3F4F6',
    marginRight: 6,
  },
  addrPillActive: { backgroundColor: PURPLE },
  addrPillText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  addrPillTextActive: { color: '#FFF', fontWeight: '700' },

  addrTipBox: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 10, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#ECFDF5', borderRadius: 8,
  },
  addrTipText: { fontSize: 11, color: '#065F46', fontWeight: '600' },

  // —— 平台代收保障卡 ——
  guardCard: {
    marginTop: 14,
    borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  guardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guardLogo: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  guardLogoText: { fontSize: 12, fontWeight: '900', color: '#FFF' },
  guardTitle: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  guardSub: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  guardHelp: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  guardHelpText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  guardPointsRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  guardPoint: {
    flex: 1, alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
  },
  guardPointIcon: {
    width: 26, height: 26, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  guardPointText: { fontSize: 10, color: '#FFF', textAlign: 'center', lineHeight: 13, fontWeight: '700' },

  // —— 金额明细卡 ——
  amountCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 12,
    marginTop: 14,
    shadowColor: '#1E1B4B', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  amountRowLabel: { fontSize: 12, color: '#6B7280' },
  amountRowValue: { fontSize: 14, color: '#1E1B4B', fontWeight: '700' },
  amountDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 2 },

  // —— 联系团长提示 ——
  contactTip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFBEB', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 14,
  },
  contactTipIcon: {
    width: 28, height: 28, borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center',
  },
  contactTipTitle: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  contactTipSub: { fontSize: 10, color: '#B45309', marginTop: 2, lineHeight: 14 },
  contactTipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#F59E0B', borderRadius: 10,
  },
  contactTipBtnText: { fontSize: 11, fontWeight: '800', color: '#FFF' },

  // —— 后续款项提醒卡 ——
  followUpCard: {
    backgroundColor: '#FFFBEB', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 12,
    marginTop: 14,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  followUpHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  followUpHeaderIcon: {
    width: 22, height: 22, borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center',
  },
  followUpHeaderTitle: { flex: 1, fontSize: 12, fontWeight: '800', color: '#92400E' },
  followUpRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  followUpDot: {
    width: 22, height: 22, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  followUpTitle: { fontSize: 12, color: '#1E1B4B', lineHeight: 17 },
  followUpSub: { fontSize: 11, color: '#6B7280', marginTop: 3, lineHeight: 15 },
  followUpHint: { fontSize: 10, color: '#B45309', marginTop: 4, lineHeight: 14 },

  // —— 风控提示 ——
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#FFFBEB', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 14,
  },
  tipText: { flex: 1, fontSize: 11, color: '#6B7280', lineHeight: 16 },

  // —— 底部 ——
  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingTop: 10,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    shadowColor: '#1E1B4B', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12,
  },
  bottomLabel: { fontSize: 12, color: '#6B7280' },
  bottomSub: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  submitBtn: { borderRadius: 22, overflow: 'hidden' },
  submitBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 22, paddingVertical: 12,
  },
  submitBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});

const doneS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 340,
    backgroundColor: '#FFF', borderRadius: 24,
    paddingVertical: 24, paddingHorizontal: 22,
    alignItems: 'stretch',
  },
  iconWrap: {
    alignSelf: 'center',
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#1E1B4B', textAlign: 'center' },
  sub: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 18 },

  statusFlow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 18, marginBottom: 8,
  },
  flowStep: { alignItems: 'center', gap: 4, width: 60 },
  flowDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  flowText: { fontSize: 11, color: '#1E1B4B', fontWeight: '600' },
  flowLine: { flex: 1, height: 2, backgroundColor: PURPLE, marginHorizontal: 4 },

  confirmBtn: {
    paddingVertical: 13, marginTop: 14,
    borderRadius: 22, backgroundColor: PURPLE,
    alignItems: 'center',
  },
  confirmText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});

const addrS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 14, paddingBottom: 28, paddingHorizontal: 18,
    maxHeight: '90%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800', color: '#1E1B4B', marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#1E1B4B', marginTop: 12, marginBottom: 6 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F5FA', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  fieldInput: { flex: 1, fontSize: 14, color: '#1E1B4B', padding: 0 },
  regionRow: {},
  regionField: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F5FA', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  regionText: { flex: 1, fontSize: 13, color: '#1E1B4B', fontWeight: '600' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 18,
  },
  switchLabel: { fontSize: 14, color: '#1E1B4B', fontWeight: '600' },
  dangerBtn: {
    marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, borderRadius: 14,
    backgroundColor: '#FEF2F2',
  },
  dangerText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 22, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  confirmBtn: { flex: 1.4, borderRadius: 22, overflow: 'hidden' },
  confirmInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 13,
  },
  confirmText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});

const haloS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 360,
    backgroundColor: '#FFF', borderRadius: 22,
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: '#1E1B4B' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#1E1B4B', marginTop: 16, marginBottom: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
  bulletText: { flex: 1, fontSize: 11.5, color: '#1E1B4B', lineHeight: 18 },

  flowCard: {
    marginTop: 6,
    backgroundColor: '#F8F8FC', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  flowItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  flowDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  flowDotText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  flowTitle: { fontSize: 12, fontWeight: '800', color: '#1E1B4B' },
  flowSub: { fontSize: 10, color: '#6B7280', marginTop: 2, lineHeight: 14 },
  flowLine: { width: 1, height: 8, backgroundColor: '#E5E7EB', marginLeft: 11 },

  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#FFFBEB', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    marginTop: 14,
  },
  warnText: { flex: 1, fontSize: 10, color: '#92400E', lineHeight: 14 },

  confirmBtn: {
    marginTop: 14, paddingVertical: 12, borderRadius: 18,
    backgroundColor: PURPLE, alignItems: 'center',
  },
  confirmText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});

const contactM = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 360,
    backgroundColor: '#FFF', borderRadius: 22,
    paddingHorizontal: 18, paddingVertical: 18,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 32, height: 32, borderRadius: 11,
    backgroundColor: '#ECFDF5',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: '#1E1B4B' },

  ownerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 14, paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: '#FAFAFE', borderRadius: 14,
  },
  ownerAvatar: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  ownerAvatarText: { fontSize: 14, fontWeight: '800', color: PURPLE },
  ownerName: { fontSize: 14, fontWeight: '800', color: '#1E1B4B' },
  ownerSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  creditBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    backgroundColor: '#FFFBEB', borderRadius: 8,
  },
  creditBadgeText: { fontSize: 10, fontWeight: '800', color: '#F59E0B' },

  list: { marginTop: 12, gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: '#FAFAFE', borderRadius: 12,
  },
  rowIcon: {
    width: 32, height: 32, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  rowValue: { fontSize: 13, color: '#1E1B4B', fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] as any },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, backgroundColor: '#7C3AED',
  },
  copyText: { fontSize: 11, fontWeight: '800', color: '#FFF' },

  tip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 5,
    backgroundColor: '#FFFBEB', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 9,
    marginTop: 12,
  },
  tipText: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 16 },

  confirmBtn: {
    marginTop: 14, paddingVertical: 12, borderRadius: 18,
    backgroundColor: PURPLE, alignItems: 'center',
  },
  confirmText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});
