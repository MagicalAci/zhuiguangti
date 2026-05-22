import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { aiChat, getQuickReplies } from '../../src/ai/chatbot';
import { ChatMessage } from '../../src/types';
import { ProgressRing } from '../../src/components/ProgressRing';
import { Colors, Radius, Shadow, FontSize } from '../../src/theme';
import { ORDER_STATUS_MAP, formatCurrency, formatDateTime, GROUP_STAGES, getStageIndex } from '../../src/utils/helpers';

const TIMELINE_STEPS = [
  { status: 'pending_deposit', label: '待付定金', icon: 'time', desc: '等待你支付定金' },
  { status: 'deposit_paid', label: '定金已付', icon: 'checkmark-circle', desc: '定金已到账，团长已确认' },
  { status: 'pending_final', label: '待付尾款', icon: 'cash', desc: '商品准备好了，请支付尾款' },
  { status: 'final_paid', label: '尾款已付', icon: 'checkmark-done-circle', desc: '全款已到，等待团长发货' },
  { status: 'shipped', label: '已发货', icon: 'airplane', desc: '商品已发出，注意查收快递' },
  { status: 'completed', label: '已完成', icon: 'trophy', desc: '交易完成，宝贝已收到！' },
];

export default function OrderTrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { orders, groups } = useStore();
  const [showChat, setShowChat] = React.useState(false);
  const [chatMsgs, setChatMsgs] = React.useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = React.useState('');

  const order = orders.find((o) => o.id === id);
  if (!order) return <View style={s.screen}><Text style={{ textAlign: 'center', marginTop: 100 }}>订单不存在</Text></View>;

  const group = groups.find((g) => g.id === order.groupId);
  const st = ORDER_STATUS_MAP[order.status];
  const paid = order.depositPaid + order.finalPaid;
  const pct = order.totalAmount > 0 ? (paid / order.totalAmount) * 100 : 0;
  const groupStage = group ? GROUP_STAGES[getStageIndex(group.stage)] : null;

  const curStepIdx = TIMELINE_STEPS.findIndex((s) => s.status === order.status);
  const isEscaped = order.status === 'escaped';

  return (
    <>
    <ScrollView style={s.screen} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* 状态头 */}
      <View style={[s.header, { backgroundColor: isEscaped ? Colors.danger : st.color }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <View style={s.statusIcon}>
            <Ionicons name={isEscaped ? 'close' : TIMELINE_STEPS[curStepIdx]?.icon as any ?? 'time'} size={28} color={st.color} />
          </View>
          <Text style={s.statusLabel}>{st.label}</Text>
          {!isEscaped && curStepIdx >= 0 && <Text style={s.statusDesc}>{TIMELINE_STEPS[curStepIdx].desc}</Text>}
        </View>
      </View>

      {/* 团进度（团员最关心的） */}
      {group && groupStage && (
        <View style={s.groupProgressCard}>
          <Text style={s.cardTitle}>📦 团进度</Text>
          <View style={s.gpRow}>
            <View style={[s.gpDot, { backgroundColor: groupStage.color }]} />
            <Text style={[s.gpStage, { color: groupStage.color }]}>{groupStage.label}</Text>
            <Text style={s.gpName}>{group.name}</Text>
          </View>
          <Text style={s.gpHint}>团长正在处理中，有进展会及时通知你</Text>
        </View>
      )}

      {/* 付款摘要 */}
      <View style={s.payCard}>
        <View style={s.payTop}>
          <View>
            <Text style={s.payTotal}>{formatCurrency(order.totalAmount)}</Text>
            <Text style={s.payLabel}>订单总额</Text>
          </View>
          <ProgressRing progress={pct} size={64} strokeWidth={5} color={Colors.primary} />
        </View>
        <View style={s.payDetails}>
          <PayLine label="定金" paid={order.depositPaid} due={order.depositAmount} color={Colors.accent} />
          <PayLine label="尾款" paid={order.finalPaid} due={order.finalAmount} color={Colors.success} />
          <PayLine label="邮费" paid={order.shippingFeePaid} due={order.shippingFee} color={Colors.info} />
        </View>
      </View>

      {/* 进度时间线 */}
      <View style={s.timelineCard}>
        <Text style={s.cardTitle}>📍 订单进度</Text>
        {TIMELINE_STEPS.map((step, i) => {
          const done = i <= curStepIdx;
          const current = i === curStepIdx;
          return (
            <View key={i} style={s.timeNode}>
              <View style={s.timeLeft}>
                {i > 0 && <View style={[s.timeLine, done && { backgroundColor: Colors.primary }]} />}
                <View style={[s.timeDot, done ? { backgroundColor: current ? Colors.primary : Colors.primaryLight } : { backgroundColor: Colors.bgMuted }]}>
                  {done ? <Ionicons name={step.icon as any} size={14} color="#FFF" /> : <View style={s.timeDotEmpty} />}
                </View>
              </View>
              <View style={[s.timeContent, current && s.timeContentCurrent]}>
                <Text style={[s.timeTitle, done && { color: Colors.text, fontWeight: '700' }]}>{step.label}</Text>
                <Text style={s.timeDesc}>{step.desc}</Text>
                {current && <Text style={s.timeCurrent}>← 当前</Text>}
              </View>
            </View>
          );
        })}
      </View>

      {/* 商品明细 */}
      <View style={s.itemsCard}>
        <Text style={s.cardTitle}>🎁 商品明细</Text>
        {order.items.map((item, i) => (
          <View key={i} style={s.itemRow}>
            <View style={s.itemThumb}><Ionicons name="gift" size={18} color={Colors.primaryLight} /></View>
            <Text style={s.itemName}>{item.productName}</Text>
            <Text style={s.itemQty}>×{item.quantity}</Text>
            <Text style={s.itemPrice}>{formatCurrency(item.unitPrice)}</Text>
          </View>
        ))}
      </View>

      {/* 物流 */}
      {order.trackingNumbers.length > 0 && (
        <View style={s.trackCard}>
          <Text style={s.cardTitle}>🚚 物流追踪</Text>
          {order.trackingNumbers.map((tn, i) => (
            <View key={i} style={s.trackRow}>
              <Ionicons name="cube" size={18} color={Colors.info} />
              <Text style={s.trackNum}>{tn}</Text>
              <TouchableOpacity><Text style={s.trackCopy}>复制</Text></TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* AI 客服入口 */}
      <TouchableOpacity style={s.aiCard} activeOpacity={0.7} onPress={() => setShowChat(true)}>
        <View style={[s.aiCardInner, { backgroundColor: Colors.primary }]}>
          <Text style={{ fontSize: 24 }}>🤖</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.aiCardTitle}>AI 智能客服</Text>
            <Text style={s.aiCardSub}>问进度、问规则、算邮费，随时为你解答</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        </View>
      </TouchableOpacity>
    </ScrollView>

    {/* AI Chat Modal */}
    <Modal visible={showChat} animationType="slide" onRequestClose={() => setShowChat(false)}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.chatHeader}>
          <TouchableOpacity onPress={() => setShowChat(false)}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity>
          <Text style={s.chatTitle}>AI 智能客服</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {chatMsgs.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🤖</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.text }}>有什么可以帮你？</Text>
              <Text style={{ fontSize: 12, color: Colors.textTertiary, marginTop: 4 }}>点击下方快捷问题或直接输入</Text>
            </View>
          )}
          {chatMsgs.map((msg) => (
            <View key={msg.id} style={[s.chatBubble, msg.role === 'user' ? s.chatUser : s.chatAi]}>
              <Text style={[s.chatText, msg.role === 'user' && { color: '#FFF' }]}>{msg.text}</Text>
            </View>
          ))}
        </ScrollView>
        {/* Quick replies */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
          {getQuickReplies('member').map((q, i) => (
            <TouchableOpacity key={i} style={s.quickReply} onPress={() => {
              const userMsg: ChatMessage = { id: `u${Date.now()}`, role: 'user', text: q, timestamp: Date.now() };
              const aiReply = aiChat(q, { group: group ?? undefined, order, role: 'member' });
              setChatMsgs((prev) => [...prev, userMsg, aiReply]);
            }}>
              <Text style={s.quickReplyText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={s.chatInputRow}>
          <TextInput style={s.chatInputField} value={chatInput} onChangeText={setChatInput} placeholder="输入你的问题..." placeholderTextColor={Colors.textTertiary} />
          <TouchableOpacity style={s.chatSendBtn} onPress={() => {
            if (!chatInput.trim()) return;
            const userMsg: ChatMessage = { id: `u${Date.now()}`, role: 'user', text: chatInput, timestamp: Date.now() };
            const aiReply = aiChat(chatInput, { group: group ?? undefined, order, role: 'member' });
            setChatMsgs((prev) => [...prev, userMsg, aiReply]);
            setChatInput('');
          }}>
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

function PayLine({ label, paid, due, color }: { label: string; paid: number; due: number; color: string }) {
  const done = paid >= due;
  return (
    <View style={pl.row}>
      <Text style={pl.label}>{label}</Text>
      <View style={pl.bar}><View style={[pl.barFill, { width: `${due > 0 ? (paid / due) * 100 : 0}%`, backgroundColor: color }]} /></View>
      <Text style={[pl.amount, done && { color: Colors.success }]}>{formatCurrency(paid)}/{formatCurrency(due)}{done ? ' ✓' : ''}</Text>
    </View>
  );
}
const pl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  label: { width: 36, fontSize: FontSize.sm, color: Colors.textSecondary },
  bar: { flex: 1, height: 4, backgroundColor: Colors.bgMuted, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  amount: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, width: 100, textAlign: 'right' },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 40 },
  header: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20, borderBottomLeftRadius: Radius.xxl, borderBottomRightRadius: Radius.xxl },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  headerCenter: { alignItems: 'center' },
  statusIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statusLabel: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  statusDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  groupProgressCard: { marginHorizontal: 16, marginTop: -14, backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 16, ...Shadow.lg },
  gpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  gpDot: { width: 8, height: 8, borderRadius: 4 },
  gpStage: { fontWeight: '700', fontSize: FontSize.md },
  gpName: { fontSize: FontSize.sm, color: Colors.textTertiary },
  gpHint: { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 6 },

  payCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 18, ...Shadow.sm },
  payTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  payTotal: { fontSize: 26, fontWeight: '800', color: Colors.text },
  payLabel: { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2 },
  payDetails: {},
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: 4 },

  timelineCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 18, ...Shadow.sm },
  timeNode: { flexDirection: 'row', minHeight: 56 },
  timeLeft: { width: 32, alignItems: 'center' },
  timeLine: { position: 'absolute', top: -28, width: 2, height: 28, backgroundColor: Colors.bgMuted },
  timeDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  timeDotEmpty: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  timeContent: { flex: 1, marginLeft: 12, paddingBottom: 16 },
  timeContentCurrent: { backgroundColor: Colors.primaryBg, borderRadius: Radius.md, padding: 10, marginBottom: 8 },
  timeTitle: { fontSize: FontSize.md, color: Colors.textTertiary },
  timeDesc: { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2 },
  timeCurrent: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700', marginTop: 4 },

  itemsCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 18, ...Shadow.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  itemThumb: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  itemName: { flex: 1, fontSize: FontSize.md, color: Colors.text, fontWeight: '500' },
  itemQty: { fontSize: FontSize.sm, color: Colors.textTertiary },
  itemPrice: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },

  trackCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 18, ...Shadow.sm },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  trackNum: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.info },
  trackCopy: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  aiCard: { marginHorizontal: 16, marginTop: 16, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.md },
  aiCardInner: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  aiCardTitle: { fontSize: FontSize.md, fontWeight: '700', color: '#FFF' },
  aiCardSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  chatTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  chatBubble: { maxWidth: '80%', borderRadius: Radius.lg, padding: 14, marginBottom: 10 },
  chatUser: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  chatAi: { alignSelf: 'flex-start', backgroundColor: '#FFF' },
  chatText: { fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
  quickReply: { backgroundColor: '#FFF', borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.primary },
  quickReplyText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  chatInputRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 36, backgroundColor: '#FFF', gap: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  chatInputField: { flex: 1, backgroundColor: Colors.bgMuted, borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 12, fontSize: FontSize.md, color: Colors.text },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
