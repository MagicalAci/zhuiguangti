import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Modal, Alert, Animated, Easing, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 策划案 §2.3 页面 4 · 团长审核凭证页 + AI 一键审核 */

const PURPLE = '#7C3AED';
const PURPLE_DARK = '#5B21B6';
const PINK = '#F43F5E';

type ReviewStatus = 'pending' | 'passed' | 'rejected';

// 凭证类型（待审核来源）
type CertKind = 'pay' | 'finalPay' | 'shipFee';

type RejectReason = '金额不符' | '凭证模糊' | '重复凭证' | '其他';
const REJECT_REASONS: RejectReason[] = ['金额不符', '凭证模糊', '重复凭证', '其他'];

const KIND_CFG: Record<CertKind, { label: string; emoji: string; color: string; bg: string; ariaLabel: string }> = {
  pay:      { label: '待支付',  emoji: '💳', color: '#F43F5E', bg: '#FFF1F2', ariaLabel: '首付/全款凭证' },
  finalPay: { label: '补尾款',  emoji: '💰', color: '#F59E0B', bg: '#FFFBEB', ariaLabel: '尾款补付凭证' },
  shipFee:  { label: '补邮费',  emoji: '📦', color: '#3B82F6', bg: '#EFF6FF', ariaLabel: '邮费补付凭证' },
};
const KIND_TABS: CertKind[] = ['pay', 'finalPay', 'shipFee'];

interface PendingOrder {
  id: string;
  userName: string;
  userAvatar: string;
  groupName: string;
  amount: number;
  payAt: string;
  channel: 'wechat' | 'alipay';
  certColors: [string, string]; // mock 凭证截图渐变色
  kind: CertKind;                // 凭证来源类型
  status: ReviewStatus;
  rejectReason?: RejectReason;
  rejectDetail?: string; // 选「其他」时团长填写的具体原因
  // AI 审核结果（按 [🤖 AI 一键审核] 后注入）
  aiTag?: { ok: true } | { ok: false; reason: string };
}

const MOCK_ORDERS: PendingOrder[] = [
  // —— 💳 待支付（首付/全款）——
  { id: 'r1', userName: '星月',   userAvatar: '星', groupName: '名侦探柯南 一番赏代抽',     amount: 88,    payAt: '今日 10:24', channel: 'wechat', certColors: ['#10B981', '#34D399'], kind: 'pay',      status: 'pending' },
  { id: 'r2', userName: '七七',   userAvatar: '七', groupName: '名侦探柯南 一番赏代抽',     amount: 88,    payAt: '今日 10:31', channel: 'alipay', certColors: ['#3B82F6', '#60A5FA'], kind: 'pay',      status: 'pending' },
  { id: 'r3', userName: '小鹿',   userAvatar: '小', groupName: '原神 4.5 卡池代抽',         amount: 120,   payAt: '今日 11:02', channel: 'wechat', certColors: ['#10B981', '#34D399'], kind: 'pay',      status: 'pending' },
  // —— 💰 补尾款 ——
  { id: 'r4', userName: '柚子',   userAvatar: '柚', groupName: '偶像梦幻祭 6月新谷代购团', amount: 47.25, payAt: '今日 11:18', channel: 'alipay', certColors: ['#3B82F6', '#60A5FA'], kind: 'finalPay', status: 'pending' },
  { id: 'r5', userName: '棉花糖', userAvatar: '棉', groupName: '偶像梦幻祭 6月新谷代购团', amount: 47.25, payAt: '今日 11:45', channel: 'wechat', certColors: ['#10B981', '#34D399'], kind: 'finalPay', status: 'pending' },
  { id: 'r6', userName: '阿澈',   userAvatar: '阿', groupName: '恋与深空 角色香薰蜡烛团',   amount: 47.6,  payAt: '今日 12:10', channel: 'wechat', certColors: ['#10B981', '#34D399'], kind: 'finalPay', status: 'pending' },
  // —— 📦 补邮费 ——
  { id: 'r7', userName: '夏目',   userAvatar: '夏', groupName: '偶像梦幻祭 6月新谷代购团', amount: 7,     payAt: '今日 12:33', channel: 'alipay', certColors: ['#3B82F6', '#60A5FA'], kind: 'shipFee',  status: 'pending' },
  { id: 'r8', userName: '泡芙',   userAvatar: '泡', groupName: '名侦探柯南 一番赏代抽',     amount: 8,     payAt: '今日 13:00', channel: 'wechat', certColors: ['#10B981', '#34D399'], kind: 'shipFee',  status: 'pending' },
];

export default function ReviewPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState<PendingOrder[]>(MOCK_ORDERS);
  // 凭证类型筛选（null = 全部）
  const [kindFilter, setKindFilter] = useState<CertKind | null>(null);

  // —— 各类弹层 ——
  const [aiOpen, setAiOpen] = useState(false);          // AI 扫描动画
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false); // AI 结果摘要
  const [previewOrder, setPreviewOrder] = useState<PendingOrder | null>(null); // 凭证大图
  const [rejectFor, setRejectFor] = useState<PendingOrder | null>(null); // 驳回原因选择
  const [otherReasonFor, setOtherReasonFor] = useState<PendingOrder | null>(null); // 「其他」原因填写
  const [otherReasonText, setOtherReasonText] = useState('');

  const pending = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders]);
  const done = orders.length - pending.length;
  const total = orders.length;

  const passed = useMemo(() => orders.filter((o) => o.status === 'passed').length, [orders]);
  const rejected = useMemo(() => orders.filter((o) => o.status === 'rejected').length, [orders]);

  // —— 各类型 / 全部 的"待审核"计数 ——
  const kindCounts = useMemo(() => {
    const c: Record<CertKind, number> = { pay: 0, finalPay: 0, shipFee: 0 };
    pending.forEach((o) => { c[o.kind] += 1; });
    return c;
  }, [pending]);

  // —— 审核操作 ——
  const passOne = (oid: string) => {
    setOrders((prev) => prev.map((o) => o.id === oid ? { ...o, status: 'passed' } : o));
  };
  const rejectOne = (oid: string, reason: RejectReason, detail?: string) => {
    setOrders((prev) => prev.map((o) => o.id === oid ? { ...o, status: 'rejected', rejectReason: reason, rejectDetail: detail } : o));
  };
  // 当前筛选下的待审凭证（用于"全部通过"和底部计数）
  const visiblePending = useMemo(
    () => (kindFilter ? pending.filter((o) => o.kind === kindFilter) : pending),
    [pending, kindFilter]
  );

  const passAll = () => {
    if (visiblePending.length === 0) return;
    const scope = kindFilter ? `「${KIND_CFG[kindFilter].label}」` : '';
    Alert.alert(
      '全部通过',
      `确认把 ${scope}下的 ${visiblePending.length} 张待审核凭证全部标记为已通过？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认全部通过',
          onPress: () => setOrders((prev) => prev.map((o) => {
            if (o.status !== 'pending') return o;
            if (kindFilter && o.kind !== kindFilter) return o;
            return { ...o, status: 'passed' };
          })),
        },
      ]
    );
  };

  // —— AI 一键审核 ——
  const startAi = () => {
    if (pending.length === 0) {
      Alert.alert('没有待审核凭证', '当前没有需要审核的凭证');
      return;
    }
    setAiOpen(true);
  };
  // AI 扫描完成 → 注入 mock 结果 → 弹摘要
  const onAiScanDone = () => {
    setOrders((prev) => prev.map((o) => {
      if (o.status !== 'pending') return o;
      // mock：按 id 末位数字伪随机，0~6 通过，7+ 异常
      const last = parseInt(o.id.replace(/\D/g, '').slice(-1) || '0', 10);
      if (last <= 6) {
        return { ...o, aiTag: { ok: true } as const };
      }
      const reasons = ['金额不符（差 ¥1.25）', '凭证模糊（无法识别金额）', '疑似重复（与 r3 相同流水号）'];
      return { ...o, aiTag: { ok: false, reason: reasons[last % reasons.length] } as const };
    }));
    setAiOpen(false);
    setAiSummaryOpen(true);
  };
  // 应用全部 AI 建议 → 通过的标记 passed，异常的保留 pending 但置顶
  const applyAi = () => {
    setOrders((prev) => prev.map((o) => {
      if (!o.aiTag) return o;
      if (o.aiTag.ok) return { ...o, status: 'passed' as ReviewStatus };
      return o;
    }));
    setAiSummaryOpen(false);
  };
  // 只把 AI 当辅助 → 仅保留 aiTag，状态不动
  const aiAsHint = () => {
    setAiSummaryOpen(false);
  };

  // —— 排序：异常 > pending > passed > rejected ——
  const sortedOrders = useMemo(() => {
    const score = (o: PendingOrder) => {
      if (o.aiTag && !o.aiTag.ok) return 0;
      if (o.status === 'pending') return 1;
      if (o.status === 'rejected') return 2;
      return 3;
    };
    const list = kindFilter ? orders.filter((o) => o.kind === kindFilter) : orders;
    return [...list].sort((a, b) => score(a) - score(b));
  }, [orders, kindFilter]);

  const aiCounts = useMemo(() => {
    const ok = orders.filter((o) => o.aiTag?.ok).length;
    const bad = orders.filter((o) => o.aiTag && !o.aiTag.ok).length;
    return { ok, bad, total: ok + bad };
  }, [orders]);

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
          <Text style={s.title}>审核凭证</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* 审核进度 */}
        <View style={s.progressCard}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={s.progressNum}>{done}</Text>
            <Text style={s.progressDivider}>/</Text>
            <Text style={s.progressTotal}>{total}</Text>
            <Text style={s.progressLabel}>已审核</Text>
          </View>
          <View style={s.progressBar}>
            <View style={[s.progressBarFill, { width: `${total > 0 ? (done / total) * 100 : 0}%` }]} />
          </View>
          <View style={s.progressMeta}>
            <View style={s.progressMetaItem}>
              <View style={[s.dot, { backgroundColor: '#10B981' }]} />
              <Text style={s.progressMetaText}>已通过 {passed}</Text>
            </View>
            <View style={s.progressMetaItem}>
              <View style={[s.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={s.progressMetaText}>已驳回 {rejected}</Text>
            </View>
            <View style={s.progressMetaItem}>
              <View style={[s.dot, { backgroundColor: '#F59E0B' }]} />
              <Text style={s.progressMetaText}>待审 {pending.length}</Text>
            </View>
          </View>
        </View>

        {/* 凭证类型 chip（全部 / 💳 待支付 / 💰 补尾款 / 📦 补邮） */}
        <View style={s.kindChipRow}>
          <Pressable
            style={[s.kindChip, kindFilter === null && s.kindChipActive]}
            onPress={() => setKindFilter(null)}
          >
            <Text style={[s.kindChipText, kindFilter === null && s.kindChipTextActive]}>
              全部 {pending.length}
            </Text>
          </Pressable>
          {KIND_TABS.map((k) => {
            const cfg = KIND_CFG[k];
            const active = kindFilter === k;
            return (
              <Pressable
                key={k}
                style={[s.kindChip, active && s.kindChipActive]}
                onPress={() => setKindFilter(active ? null : k)}
              >
                <Text style={[s.kindChipText, active && s.kindChipTextActive]}>
                  {cfg.emoji} {cfg.label} {kindCounts[k]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* AI 一键审核 按钮（橙紫渐变） */}
        <Pressable onPress={startAi} style={s.aiBtnWrap}>
          <LinearGradient
            colors={['#FB923C', PURPLE]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.aiBtn}
          >
            <Text style={s.aiBtnEmoji}>🤖</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.aiBtnTitle}>AI 一键审核</Text>
              <Text style={s.aiBtnSub}>批量比对金额 / 收款方 / 付款时间 · V1 模拟</Text>
            </View>
            <Ionicons name="sparkles" size={20} color="#FFF" />
          </LinearGradient>
        </Pressable>
      </LinearGradient>

      {/* —— 凭证列表 —— */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {sortedOrders.map((o) => (
          <CertCard
            key={o.id}
            order={o}
            onPreview={() => setPreviewOrder(o)}
            onPass={() => passOne(o.id)}
            onReject={() => setRejectFor(o)}
          />
        ))}

        {sortedOrders.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={40} color="#10B981" />
            <Text style={s.emptyText}>
              {kindFilter
                ? `「${KIND_CFG[kindFilter].label}」下暂无凭证`
                : '暂无待审核凭证'}
            </Text>
            {kindFilter && (
              <Pressable onPress={() => setKindFilter(null)} style={s.emptyBtn}>
                <Text style={s.emptyBtnText}>查看全部</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* —— 底部 [全部通过] —— */}
      {visiblePending.length > 0 && (
        <View style={[s.bottomBar, { paddingBottom: 10 + insets.bottom }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.bottomLabel}>
              {kindFilter ? `「${KIND_CFG[kindFilter].label}」` : ''}剩余待审 <Text style={{ color: PINK, fontWeight: '800' }}>{visiblePending.length}</Text> 张
            </Text>
            <Text style={s.bottomSub}>仅当全部凭证看起来无异常时建议使用</Text>
          </View>
          <Pressable style={s.passAllBtn} onPress={passAll}>
            <Ionicons name="checkmark-done" size={16} color="#FFF" />
            <Text style={s.passAllText}>全部通过</Text>
          </Pressable>
        </View>
      )}

      {/* ============ AI 扫描动画 ============ */}
      <AiScanModal
        visible={aiOpen}
        orders={orders.filter((o) => o.status === 'pending')}
        onClose={() => setAiOpen(false)}
        onDone={onAiScanDone}
      />

      {/* ============ AI 结果摘要 ============ */}
      <Modal visible={aiSummaryOpen} transparent animationType="fade" onRequestClose={() => setAiSummaryOpen(false)}>
        <Pressable style={sumS.overlay} onPress={() => setAiSummaryOpen(false)}>
          <Pressable style={sumS.card} onPress={(e) => e.stopPropagation()}>
            <LinearGradient
              colors={['#FB923C', PURPLE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={sumS.headerGradient}
            >
              <Text style={{ fontSize: 30 }}>🤖</Text>
              <Text style={sumS.headerTitle}>AI 审核完成</Text>
              <Text style={sumS.headerSub}>共扫描 {aiCounts.total} 张凭证</Text>
            </LinearGradient>

            <View style={sumS.body}>
              <View style={sumS.row}>
                <View style={[sumS.rowIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="checkmark" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={sumS.rowTitle}>通过 <Text style={{ color: '#10B981' }}>{aiCounts.ok}</Text> 张</Text>
                  <Text style={sumS.rowSub}>金额、收款方、付款时间均匹配</Text>
                </View>
              </View>
              <View style={sumS.row}>
                <View style={[sumS.rowIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="warning" size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={sumS.rowTitle}>异常 <Text style={{ color: '#EF4444' }}>{aiCounts.bad}</Text> 张</Text>
                  <Text style={sumS.rowSub}>金额不符 / 凭证模糊 / 重复使用</Text>
                </View>
              </View>

              <View style={sumS.tipBox}>
                <Ionicons name="information-circle-outline" size={14} color={PURPLE} />
                <Text style={sumS.tipText}>
                  <Text style={{ fontWeight: '700', color: PURPLE }}>V1 模拟：</Text>
                  V2 接入真实 OCR + 金额匹配模型（候选：阿里 OCR / GPT-4V）
                </Text>
              </View>

              <View style={sumS.btnRow}>
                <Pressable style={sumS.btnSecondary} onPress={aiAsHint}>
                  <Text style={sumS.btnSecondaryText}>我自己看</Text>
                </Pressable>
                <Pressable style={sumS.btnPrimary} onPress={applyAi}>
                  <Ionicons name="sparkles" size={14} color="#FFF" />
                  <Text style={sumS.btnPrimaryText}>应用全部 AI 建议</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============ 凭证大图预览 ============ */}
      <Modal visible={!!previewOrder} transparent animationType="fade" onRequestClose={() => setPreviewOrder(null)}>
        <Pressable style={previewS.overlay} onPress={() => setPreviewOrder(null)}>
          {previewOrder && (
            <Pressable onPress={(e) => e.stopPropagation()}>
              <CertReceipt order={previewOrder} large />
              <View style={previewS.tipRow}>
                <Ionicons name="finger-print-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={previewS.tipText}>点击空白处关闭 · 长按可保存到相册</Text>
              </View>
            </Pressable>
          )}
        </Pressable>
      </Modal>

      {/* ============ 驳回原因 ActionSheet ============ */}
      <Modal visible={!!rejectFor} transparent animationType="slide" onRequestClose={() => setRejectFor(null)}>
        <Pressable style={rejectS.overlay} onPress={() => setRejectFor(null)}>
          <Pressable style={rejectS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={rejectS.handle} />
            <Text style={rejectS.title}>驳回原因</Text>
            <Text style={rejectS.sub}>选择原因后，团员将收到通知并可限时重传凭证</Text>

            <View style={{ marginTop: 14, gap: 6 }}>
              {REJECT_REASONS.map((r) => (
                <Pressable
                  key={r}
                  style={rejectS.row}
                  onPress={() => {
                    const target = rejectFor;
                    setRejectFor(null);
                    if (!target) return;
                    if (r === '其他') {
                      setOtherReasonText('');
                      setOtherReasonFor(target);
                    } else {
                      rejectOne(target.id, r);
                    }
                  }}
                >
                  <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                  <Text style={rejectS.rowText}>{r}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#C4C4D4" />
                </Pressable>
              ))}
            </View>

            <Pressable style={rejectS.cancelBtn} onPress={() => setRejectFor(null)}>
              <Text style={rejectS.cancelText}>取消</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============ 驳回「其他」原因输入 ============ */}
      <Modal visible={!!otherReasonFor} transparent animationType="fade" onRequestClose={() => setOtherReasonFor(null)}>
        <Pressable style={otherS.overlay} onPress={() => setOtherReasonFor(null)}>
          <Pressable style={otherS.card} onPress={(e) => e.stopPropagation()}>
            <View style={otherS.iconWrap}>
              <Ionicons name="document-text-outline" size={22} color="#EF4444" />
            </View>
            <Text style={otherS.title}>填写驳回原因</Text>
            <Text style={otherS.sub}>
              请具体说明驳回 <Text style={{ fontWeight: '700', color: '#1E1B4B' }}>{otherReasonFor?.userName}</Text> 凭证的原因
              {'\n'}团员将收到通知并可限时重传
            </Text>

            <TextInput
              style={otherS.input}
              value={otherReasonText}
              onChangeText={setOtherReasonText}
              placeholder="例如：付款备注名与团员昵称不一致，请重新上传带备注的凭证"
              placeholderTextColor="#C4C4D4"
              multiline
              numberOfLines={4}
              maxLength={120}
            />
            <Text style={otherS.counter}>{otherReasonText.length} / 120</Text>

            <View style={otherS.btnRow}>
              <Pressable style={otherS.cancelBtn} onPress={() => setOtherReasonFor(null)}>
                <Text style={otherS.cancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={[otherS.confirmBtn, otherReasonText.trim().length < 2 && { opacity: 0.5 }]}
                disabled={otherReasonText.trim().length < 2}
                onPress={() => {
                  if (otherReasonFor) {
                    rejectOne(otherReasonFor.id, '其他', otherReasonText.trim());
                  }
                  setOtherReasonFor(null);
                  setOtherReasonText('');
                }}
              >
                <Ionicons name="checkmark" size={14} color="#FFF" />
                <Text style={otherS.confirmText}>确认驳回</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ============ 凭证卡片 ============ */
function CertCard({ order, onPreview, onPass, onReject }: {
  order: PendingOrder; onPreview: () => void; onPass: () => void; onReject: () => void;
}) {
  const isAnomaly = order.aiTag && !order.aiTag.ok;
  const isAiOk = order.aiTag?.ok;
  const isDone = order.status !== 'pending';

  return (
    <View style={[
      cardS.card,
      isDone && cardS.cardDone,
      isAnomaly && cardS.cardAnomaly,
    ]}>
      {/* 状态/AI 角标 */}
      {order.status === 'passed' && (
        <View style={[cardS.badge, { backgroundColor: '#10B981' }]}>
          <Ionicons name="checkmark" size={11} color="#FFF" />
          <Text style={cardS.badgeText}>已通过</Text>
        </View>
      )}
      {order.status === 'rejected' && (
        <View style={[cardS.badge, { backgroundColor: '#EF4444' }]}>
          <Ionicons name="close" size={11} color="#FFF" />
          <Text style={cardS.badgeText} numberOfLines={1}>
            已驳回 · {order.rejectReason}
            {order.rejectReason === '其他' && order.rejectDetail ? `：${order.rejectDetail}` : ''}
          </Text>
        </View>
      )}
      {!isDone && isAiOk && (
        <View style={[cardS.badge, { backgroundColor: PURPLE }]}>
          <Ionicons name="sparkles" size={10} color="#FFF" />
          <Text style={cardS.badgeText}>AI 建议通过</Text>
        </View>
      )}
      {isAnomaly && (
        <View style={[cardS.badge, { backgroundColor: '#F59E0B' }]}>
          <Ionicons name="warning" size={10} color="#FFF" />
          <Text style={cardS.badgeText}>AI 标记异常</Text>
        </View>
      )}

      {/* 行 1：团员信息 */}
      <View style={cardS.line1}>
        <View style={cardS.avatar}>
          <Text style={cardS.avatarText}>{order.userAvatar}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={cardS.userRow}>
            <Text style={cardS.userName}>{order.userName}</Text>
            <View style={[cardS.kindPill, { backgroundColor: KIND_CFG[order.kind].bg }]}>
              <Text style={[cardS.kindPillText, { color: KIND_CFG[order.kind].color }]}>
                {KIND_CFG[order.kind].emoji} {KIND_CFG[order.kind].label}
              </Text>
            </View>
          </View>
          <Text style={cardS.groupName} numberOfLines={1}>{order.groupName}</Text>
        </View>
        <View style={cardS.amountWrap}>
          <Text style={cardS.amountLabel}>应付</Text>
          <Text style={cardS.amount}>¥{order.amount.toFixed(2)}</Text>
        </View>
      </View>

      {/* 行 2：凭证截图（点击放大） */}
      <Pressable style={cardS.certWrap} onPress={onPreview}>
        <CertReceipt order={order} />
        <View style={cardS.zoomHint}>
          <Ionicons name="search" size={12} color="#FFF" />
          <Text style={cardS.zoomText}>点击放大</Text>
        </View>
      </Pressable>

      {/* AI 异常说明 */}
      {isAnomaly && (
        <View style={cardS.anomalyBox}>
          <Ionicons name="alert-circle" size={14} color="#F59E0B" />
          <Text style={cardS.anomalyText}>
            <Text style={{ fontWeight: '700' }}>AI 提示：</Text>
            {(order.aiTag as any).reason}
          </Text>
        </View>
      )}

      {/* 行 3：审核按钮（已审核态不展示） */}
      {!isDone && (
        <View style={cardS.actionRow}>
          <Pressable style={cardS.rejectBtn} onPress={onReject}>
            <Ionicons name="close" size={14} color="#EF4444" />
            <Text style={cardS.rejectText}>驳回</Text>
          </Pressable>
          <Pressable style={cardS.passBtn} onPress={onPass}>
            <Ionicons name="checkmark" size={14} color="#FFF" />
            <Text style={cardS.passText}>审核通过</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/* ============ Mock 微信/支付宝转账截图 ============ */
function CertReceipt({ order, large }: { order: PendingOrder; large?: boolean }) {
  const isWechat = order.channel === 'wechat';
  return (
    <LinearGradient
      colors={order.certColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[receiptS.wrap, large && receiptS.wrapLarge]}
    >
      <View style={receiptS.headerRow}>
        <View style={receiptS.appIcon}>
          <Text style={{ fontSize: large ? 18 : 14 }}>{isWechat ? '微' : '支'}</Text>
        </View>
        <View>
          <Text style={[receiptS.appName, large && { fontSize: 14 }]}>{isWechat ? '微信支付' : '支付宝'}</Text>
          <Text style={[receiptS.appSub, large && { fontSize: 11 }]}>转账成功</Text>
        </View>
      </View>

      <View style={receiptS.center}>
        <Text style={[receiptS.label, large && { fontSize: 11 }]}>转账金额</Text>
        <Text style={[receiptS.amount, large && receiptS.amountLarge]}>¥{order.amount.toFixed(2)}</Text>
      </View>

      <View style={receiptS.footer}>
        <View style={receiptS.metaRow}>
          <Text style={[receiptS.meta, large && { fontSize: 10 }]}>收款方</Text>
          <Text style={[receiptS.meta, large && { fontSize: 10 }]}>团长大人</Text>
        </View>
        <View style={receiptS.metaRow}>
          <Text style={[receiptS.meta, large && { fontSize: 10 }]}>付款时间</Text>
          <Text style={[receiptS.meta, large && { fontSize: 10 }]}>{order.payAt}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

/* ============ AI 扫描动画 ============ */
function AiScanModal({ visible, orders, onClose, onDone }: {
  visible: boolean; orders: PendingOrder[]; onClose: () => void; onDone: () => void;
}) {
  const [scanIdx, setScanIdx] = useState(0);
  const scanLine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setScanIdx(0);
    scanLine.setValue(0);

    Animated.loop(
      Animated.timing(scanLine, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    ).start();

    const total = Math.max(1, orders.length);
    const step = setInterval(() => {
      setScanIdx((i) => {
        if (i >= total - 1) {
          clearInterval(step);
          setTimeout(() => onDone(), 600);
          return total - 1;
        }
        return i + 1;
      });
    }, 500);

    return () => clearInterval(step);
  }, [visible, orders.length, onDone, scanLine]);

  if (!visible) return null;
  const current = orders[Math.min(scanIdx, orders.length - 1)];

  const scanY = scanLine.interpolate({ inputRange: [0, 1], outputRange: [0, 180] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={aiS.overlay}>
        <View style={aiS.card}>
          <View style={aiS.titleRow}>
            <Text style={{ fontSize: 22 }}>🤖</Text>
            <Text style={aiS.title}>AI 正在审核凭证</Text>
            <Pressable hitSlop={10} onPress={onClose}>
              <Ionicons name="close" size={18} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* 凭证 + 扫描线 */}
          <View style={aiS.certWrap}>
            {current && <CertReceipt order={current} large />}
            <Animated.View style={[aiS.scanLine, { transform: [{ translateY: scanY }] }]}>
              <LinearGradient
                colors={['transparent', 'rgba(168,85,247,0.7)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </View>

          {/* 当前进度 */}
          <View style={aiS.statusRow}>
            <View style={aiS.spinnerDot} />
            <Text style={aiS.statusText}>
              正在比对 <Text style={{ fontWeight: '800', color: PURPLE }}>{current?.userName}</Text> 的凭证
            </Text>
          </View>

          <View style={aiS.progressBar}>
            <View style={[aiS.progressFill, { width: `${((scanIdx + 1) / Math.max(1, orders.length)) * 100}%` }]} />
          </View>
          <Text style={aiS.progressText}>{scanIdx + 1} / {orders.length}</Text>

          <View style={aiS.checkList}>
            <ScanItem text="识别支付金额" />
            <ScanItem text="校验收款方账户" />
            <ScanItem text="比对付款时间" />
            <ScanItem text="查重凭证流水号" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ScanItem({ text }: { text: string }) {
  return (
    <View style={aiS.scanItem}>
      <Ionicons name="checkmark-circle" size={13} color="#10B981" />
      <Text style={aiS.scanItemText}>{text}</Text>
    </View>
  );
}

/* ============ 样式 ============ */
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

  // —— 进度卡 ——
  progressCard: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16, padding: 14,
  },
  progressNum: { fontSize: 28, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  progressDivider: { fontSize: 18, color: 'rgba(255,255,255,0.6)' },
  progressTotal: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  progressLabel: { marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  progressBar: {
    height: 5, borderRadius: 3, marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden',
  },
  progressBarFill: { height: 5, backgroundColor: '#FFF' },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  progressMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.95)', fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3 },

  // —— 凭证类型 chip ——
  kindChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  kindChip: {
    paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  kindChipActive: {
    backgroundColor: '#FFF', borderColor: '#FFF',
  },
  kindChipText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  kindChipTextActive: { color: '#1E1B4B' },

  // —— AI 一键审核 按钮 ——
  aiBtnWrap: { marginTop: 12 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 16,
  },
  aiBtnEmoji: { fontSize: 22 },
  aiBtnTitle: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  aiBtnSub: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  // —— 空态 ——
  empty: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontSize: 13, color: '#6B7280' },
  emptyBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: PURPLE },
  emptyBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // —— 底部 [全部通过] ——
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
  passAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: 20, backgroundColor: '#10B981',
  },
  passAllText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});

const cardS = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12,
    marginBottom: 10,
    borderWidth: 1, borderColor: '#F3F4F6',
    position: 'relative',
  },
  cardDone: { opacity: 0.55 },
  cardAnomaly: { borderColor: '#F59E0B', borderWidth: 1.5 },

  badge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#FFF' },

  line1: { flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 110 },
  avatar: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: PURPLE },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  userName: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  kindPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  kindPillText: { fontSize: 9, fontWeight: '800' },
  groupName: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  amountWrap: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 10, color: '#9CA3AF' },
  amount: { fontSize: 16, fontWeight: '800', color: PINK, marginTop: 2 },

  certWrap: { marginTop: 12, alignSelf: 'flex-start', position: 'relative' },
  zoomHint: {
    position: 'absolute', top: 6, right: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8,
  },
  zoomText: { fontSize: 9, color: '#FFF', fontWeight: '600' },

  anomalyBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 5,
    backgroundColor: '#FFFBEB',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    marginTop: 10,
  },
  anomalyText: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 16 },

  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16, borderWidth: 1, borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  rejectText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  passBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16, backgroundColor: '#10B981',
  },
  passText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});

const receiptS = StyleSheet.create({
  wrap: {
    width: 140, height: 184, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 12,
    justifyContent: 'space-between',
  },
  wrapLarge: { width: 240, height: 320, paddingHorizontal: 16, paddingVertical: 22, borderRadius: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appIcon: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  appName: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  appSub: { fontSize: 9, color: 'rgba(255,255,255,0.85)' },
  center: { alignItems: 'center' },
  label: { fontSize: 9, color: 'rgba(255,255,255,0.85)' },
  amount: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginTop: 4 },
  amountLarge: { fontSize: 36 },
  footer: { gap: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 9, color: 'rgba(255,255,255,0.85)' },
});

const aiS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 340,
    backgroundColor: '#FFF', borderRadius: 22,
    paddingVertical: 20, paddingHorizontal: 18,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: '#1E1B4B' },

  certWrap: {
    marginTop: 14, alignItems: 'center',
    position: 'relative',
    backgroundColor: '#FAFAFE', borderRadius: 18,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute', left: 8, right: 8, height: 30, top: 60,
  },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  spinnerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PURPLE },
  statusText: { fontSize: 12, color: '#1E1B4B' },

  progressBar: { height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: 4, backgroundColor: PURPLE },
  progressText: { fontSize: 10, color: '#9CA3AF', marginTop: 4, textAlign: 'right' },

  checkList: { marginTop: 12, gap: 4 },
  scanItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  scanItemText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
});

const sumS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 340,
    backgroundColor: '#FFF', borderRadius: 24,
    overflow: 'hidden',
  },
  headerGradient: { paddingVertical: 22, alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },

  body: { padding: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  rowSub: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },

  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F5F3FF', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 10,
    marginTop: 8,
  },
  tipText: { flex: 1, fontSize: 10, color: '#6B7280', lineHeight: 16 },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnSecondary: {
    flex: 1, paddingVertical: 12, borderRadius: 20,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  btnPrimary: {
    flex: 1.4, flexDirection: 'row', gap: 5,
    paddingVertical: 12, borderRadius: 20,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
});

const previewS = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 16, alignSelf: 'center' },
  tipText: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
});

const rejectS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 12, paddingBottom: 24, paddingHorizontal: 18,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '800', color: '#1E1B4B' },
  sub: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 14,
    backgroundColor: '#FAFAFE', borderRadius: 12,
  },
  rowText: { flex: 1, fontSize: 14, color: '#1E1B4B', fontWeight: '600' },

  cancelBtn: { paddingVertical: 13, marginTop: 14, borderRadius: 20, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
});

const otherS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 340,
    backgroundColor: '#FFF', borderRadius: 22,
    paddingVertical: 20, paddingHorizontal: 20,
    alignItems: 'stretch',
  },
  iconWrap: {
    alignSelf: 'center',
    width: 52, height: 52, borderRadius: 18,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#1E1B4B', textAlign: 'center' },
  sub: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  input: {
    marginTop: 14,
    backgroundColor: '#F5F5FA', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 88,
    fontSize: 13, color: '#1E1B4B',
    textAlignVertical: 'top',
  },
  counter: { fontSize: 10, color: '#9CA3AF', marginTop: 4, textAlign: 'right' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 20, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  confirmBtn: {
    flex: 1.4, flexDirection: 'row', gap: 5,
    paddingVertical: 12, borderRadius: 20,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
});
