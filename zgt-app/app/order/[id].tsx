import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { ProgressRing } from '../../src/components/ProgressRing';
import { Colors, Radius, Shadow, FontSize } from '../../src/theme';
import { ORDER_STATUS_MAP, HEAT_MAP, formatCurrency, formatDateTime } from '../../src/utils/helpers';
import { getProductIcon } from '../../src/utils/productVisual';

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const store = useStore();

  const order = store.orders.find((o) => o.id === id);
  if (!order) return <View style={s.screen}><Text style={{ textAlign: 'center', marginTop: 100 }}>订单不存在</Text></View>;

  const group = store.groups.find((g) => g.id === order.groupId);
  const st = ORDER_STATUS_MAP[order.status];
  const totalPaid = order.depositPaid + order.finalPaid + order.shippingFeePaid;
  const totalDue = order.totalAmount + order.shippingFee;
  const pct = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

  const statusActions = (() => {
    switch (order.status) {
      case 'pending_deposit': return [
        { icon: 'checkmark-circle', label: `确认收到定金 ${formatCurrency(order.depositAmount)}`, color: Colors.success, onPress: () => { store.updateOrderStatus(order.id, 'deposit_paid'); Alert.alert('已确认'); } },
        { icon: 'close-circle', label: '标记逃单', destructive: true, onPress: () => markEscaped() },
      ];
      case 'deposit_paid': return [
        { icon: 'notifications', label: '发送尾款催付通知', color: Colors.accent, onPress: () => { store.updateOrderStatus(order.id, 'pending_final'); Alert.alert('催付已发送'); } },
      ];
      case 'pending_final': return [
        { icon: 'checkmark-circle', label: `确认收到尾款 ${formatCurrency(order.finalAmount)}`, color: Colors.success, onPress: () => { store.updateOrderStatus(order.id, 'final_paid'); Alert.alert('已确认'); } },
        { icon: 'close-circle', label: '标记逃单', destructive: true, onPress: () => markEscaped() },
      ];
      case 'final_paid': return [
        { icon: 'send', label: '发货并填写运单号', color: Colors.info, onPress: () => { store.addTrackingNumber(order.id, `SF${Date.now().toString().slice(-8)}`); Alert.alert('已发货'); } },
      ];
      case 'shipped': return [
        { icon: 'checkmark-done-circle', label: '标记为已完成', color: Colors.success, onPress: () => { store.updateOrderStatus(order.id, 'completed'); Alert.alert('已完成'); } },
      ];
      default: return [];
    }
  })();

  const markEscaped = () => {
    Alert.alert('标记逃单', `将 ${order.memberName} 标记为逃单并加入黑名单？`, [
      { text: '取消' },
      { text: '确认', style: 'destructive', onPress: () => { store.updateOrderStatus(order.id, 'escaped'); store.addToBlacklist({ memberName: order.memberName, memberId: order.memberId, reason: '逃单未付款', reportedBy: '团长' }); Alert.alert('已标记'); } },
    ]);
  };

  const paySteps = [
    { label: '定金', amount: order.depositAmount, paid: order.depositPaid, color: Colors.accent },
    { label: '尾款', amount: order.finalAmount, paid: order.finalPaid, color: Colors.success },
    { label: '邮费', amount: order.shippingFee, paid: order.shippingFeePaid, color: Colors.info },
  ];

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* 状态头 */}
        <View style={[s.statusHeader, { backgroundColor: st.color }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={s.statusCenter}>
            <View style={s.statusIconBg}>
              <Ionicons name={order.status === 'completed' ? 'checkmark-done' : order.status === 'escaped' ? 'close' : 'time'} size={28} color={st.color} />
            </View>
            <Text style={s.statusLabel}>{st.label}</Text>
            <Text style={s.statusAmount}>{formatCurrency(order.totalAmount)}</Text>
          </View>
          <View style={s.memberRow}>
            <Text style={s.memberName}>{order.memberName}</Text>
            {order.isMawei && <View style={s.maweiTag}><Text style={s.maweiText}>妈位</Text></View>}
          </View>
          <Text style={s.groupLabel}>{group?.name} · {formatDateTime(order.createdAt)}</Text>
        </View>

        {/* 付款进度 */}
        <View style={s.payCard}>
          <View style={s.payTop}>
            <Text style={s.cardTitle}>付款进度</Text>
            <ProgressRing progress={pct} size={52} strokeWidth={4} color={Colors.primary} />
          </View>
          <Text style={s.payTotal}>{formatCurrency(totalPaid)} / {formatCurrency(totalDue)}</Text>
          {paySteps.map((p, i) => {
            const done = p.paid >= p.amount;
            const pPct = p.amount > 0 ? (p.paid / p.amount) * 100 : 0;
            return (
              <View key={i} style={s.payStep}>
                <View style={s.payStepHeader}>
                  <Text style={s.payStepLabel}>{p.label}</Text>
                  <Text style={[s.payStepAmount, done && { color: Colors.success }]}>
                    {formatCurrency(p.paid)} / {formatCurrency(p.amount)}
                    {done && ' ✓'}
                  </Text>
                </View>
                <View style={s.payBar}>
                  <View style={[s.payBarFill, { width: `${pPct}%`, backgroundColor: p.color }]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* 商品明细 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>商品明细</Text>
          {order.items.map((item, i) => {
            const ht = HEAT_MAP[item.heat];
            return (
              <View key={i} style={s.itemRow}>
                <View style={s.itemLeft}>
                  <Text style={{ fontSize: 14, marginRight: 4 }}>{getProductIcon(item.productName)}</Text>
                  <Text style={s.itemName}>{item.productName}</Text>
                  <View style={[s.itemHeat, { backgroundColor: ht.bg }]}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: ht.color }}>{ht.label}</Text>
                  </View>
                </View>
                <Text style={s.itemQty}>×{item.quantity}</Text>
                <Text style={s.itemPrice}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
              </View>
            );
          })}
        </View>

        {/* 物流 */}
        {order.trackingNumbers.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>物流信息</Text>
            {order.trackingNumbers.map((tn, i) => (
              <View key={i} style={s.trackRow}>
                <View style={s.trackIcon}><Ionicons name="cube" size={16} color={Colors.info} /></View>
                <Text style={s.trackNum}>{tn}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 智能操作提示 */}
        {statusActions.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>下一步操作</Text>
            <Text style={s.nextHint}>根据当前订单状态，建议你：</Text>
            {statusActions.map((a, i) => (
              <TouchableOpacity key={i} style={[s.smartBtn, a.destructive && s.smartBtnDanger]} activeOpacity={0.7} onPress={a.onPress}>
                <Ionicons name={a.icon as any} size={20} color={a.destructive ? Colors.danger : a.color} />
                <Text style={[s.smartBtnText, a.destructive && { color: Colors.danger }]}>{a.label}</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 40 },
  statusHeader: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20, borderBottomLeftRadius: Radius.xxl, borderBottomRightRadius: Radius.xxl },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statusCenter: { alignItems: 'center' },
  statusIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statusLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  statusAmount: { fontSize: 32, fontWeight: '800', color: '#FFF', marginTop: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  memberName: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  maweiTag: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  maweiText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  groupLabel: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

  payCard: { marginHorizontal: 16, marginTop: -14, backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 18, ...Shadow.lg },
  payTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  payTotal: { fontSize: 12, color: Colors.textTertiary, marginTop: 4, marginBottom: 12 },
  payStep: { marginBottom: 10 },
  payStepHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  payStepLabel: { fontSize: 13, color: Colors.textSecondary },
  payStepAmount: { fontSize: 13, fontWeight: '600', color: Colors.text },
  payBar: { height: 4, backgroundColor: Colors.bgMuted, borderRadius: 2, overflow: 'hidden' },
  payBarFill: { height: 4, borderRadius: 2 },

  card: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 18, ...Shadow.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  itemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { fontSize: 14, color: Colors.text },
  itemHeat: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  itemQty: { fontSize: 13, color: Colors.textTertiary, marginRight: 12 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: Colors.text },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  trackIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.infoBg, alignItems: 'center', justifyContent: 'center' },
  trackNum: { fontSize: 14, fontWeight: '600', color: Colors.info },
  nextHint: { fontSize: 12, color: Colors.textTertiary, marginBottom: 12 },
  smartBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: Radius.lg, backgroundColor: Colors.bgMuted, marginBottom: 8 },
  smartBtnDanger: { backgroundColor: Colors.dangerBg },
  smartBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
});
