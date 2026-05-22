import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { ProgressRing } from '../../src/components/ProgressRing';
import { Colors, Radius, Shadow, FontSize } from '../../src/theme';
import { formatCurrency } from '../../src/utils/helpers';
import { aiReconcile } from '../../src/ai/reconcile';
import { ReconcileResult } from '../../src/types';

export default function FinanceOverview() {
  const store = useStore();
  const router = useRouter();
  const { groups, getGroupFinance } = store;
  const [report, setReport] = useState<{ results: ReconcileResult[]; summary: string } | null>(null);

  const totalCollected = groups.reduce((s, g) => s + getGroupFinance(g.id).totalCollected, 0);
  const totalPending = groups.reduce((s, g) => s + getGroupFinance(g.id).totalPending, 0);
  const totalAll = totalCollected + totalPending;
  const rate = totalAll > 0 ? (totalCollected / totalAll) * 100 : 0;

  const handleReconcile = () => {
    const allOrders = groups.flatMap((g) => store.getGroupOrders(g.id));
    const r = aiReconcile({ orders: allOrders, payments: store.payments });
    setReport({ results: r.results, summary: r.summary });
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* 总览卡 */}
      <View style={[s.heroCard, { backgroundColor: Colors.primaryDark }]}>
        <View style={s.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroLabel}>已收总额</Text>
            <Text style={s.heroAmount}>{formatCurrency(totalCollected)}</Text>
            <Text style={s.heroPending}>待收 {formatCurrency(totalPending)}</Text>
          </View>
          <ProgressRing progress={rate} size={80} strokeWidth={6} color="#A78BFA" label="收款率" />
        </View>
      </View>

      {/* AI 对账 */}
      <TouchableOpacity activeOpacity={0.8} onPress={handleReconcile} style={s.aiCard}>
        <View style={[s.aiCardInner, { backgroundColor: Colors.primary }]}>
          <Text style={{ fontSize: 20 }}>🤖</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.aiTitle}>AI 智能对账</Text>
            <Text style={s.aiSub}>自动匹配应收与实收，标记异常</Text>
          </View>
          <Ionicons name="sparkles" size={20} color="#FFF" />
        </View>
      </TouchableOpacity>

      {/* 对账报告 */}
      {report && (
        <View style={s.reportCard}>
          <Text style={s.cardTitle}>对账结果</Text>
          <View style={s.reportStats}>
            <View style={s.rStatBox}><Text style={[s.rStatVal, { color: Colors.success }]}>{report.results.filter((r) => r.status === 'matched').length}</Text><Text style={s.rStatLabel}>匹配</Text></View>
            <View style={s.rStatBox}><Text style={[s.rStatVal, { color: Colors.danger }]}>{report.results.filter((r) => r.status !== 'matched').length}</Text><Text style={s.rStatLabel}>异常</Text></View>
            <View style={s.rStatBox}><Text style={[s.rStatVal, { color: Colors.primary }]}>{formatCurrency(report.results.reduce((s, r) => s + Math.abs(r.received - r.expected), 0))}</Text><Text style={s.rStatLabel}>总差额</Text></View>
          </View>
          <Text style={s.reportSummary}>{report.summary}</Text>
          {report.results.slice(0, 15).map((r) => {
            const color = r.status === 'matched' ? Colors.success : r.status === 'missing' ? Colors.danger : Colors.warning;
            const label = r.status === 'matched' ? '✓ 匹配' : r.status === 'missing' ? '✗ 未收' : r.status === 'overpaid' ? '↑ 多付' : r.status === 'underpaid' ? '↓ 少付' : '⚠ 重复';
            return (
              <View key={r.orderId} style={s.reportRow}>
                <Text style={s.reportName}>{r.memberName}</Text>
                <Text style={s.reportAmount}>{formatCurrency(r.received)}/{formatCurrency(r.expected)}</Text>
                <View style={[s.reportTag, { backgroundColor: `${color}12` }]}>
                  <Text style={[s.reportTagText, { color }]}>{label}</Text>
                </View>
                {(r.status === 'missing' || r.status === 'underpaid') && (
                  <TouchableOpacity style={s.remindBtn} onPress={() => store.sendPaymentReminder(r.orderId, 'deposit')} activeOpacity={0.7}>
                    <Text style={s.remindBtnText}>催付</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* 各团财务 */}
      {groups.map((g) => {
        const f = getGroupFinance(g.id);
        const gRate = (f.totalAmount + f.collectedShipping + f.pendingShipping) > 0
          ? (f.totalCollected / (f.totalAmount + f.collectedShipping + f.pendingShipping)) * 100 : 0;
        return (
          <View key={g.id} style={s.groupCard}>
            <View style={s.groupHeader}>
              <Text style={s.groupName}>{g.name}</Text>
              <Text style={[s.groupRate, { color: gRate > 80 ? Colors.success : gRate > 50 ? Colors.warning : Colors.danger }]}>{gRate.toFixed(0)}%</Text>
            </View>
            <View style={s.finRow}>
              <FinBlock label="已收定金" value={f.collectedDeposit} total={f.collectedDeposit + f.pendingDeposit} color={Colors.accent} />
              <FinBlock label="已收尾款" value={f.collectedFinal} total={f.collectedFinal + f.pendingFinal} color={Colors.success} />
              <FinBlock label="已收邮费" value={f.collectedShipping} total={f.collectedShipping + f.pendingShipping} color={Colors.info} />
            </View>
            <View style={s.finBar}>
              <View style={[s.finBarFill, { width: `${gRate}%`, backgroundColor: gRate > 80 ? Colors.success : Colors.primary }]} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function FinBlock({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return (
    <View style={fb.block}>
      <Text style={fb.label}>{label}</Text>
      <Text style={[fb.value, { color }]}>{formatCurrency(value)}</Text>
      <Text style={fb.total}>/ {formatCurrency(total)}</Text>
    </View>
  );
}
const fb = StyleSheet.create({
  block: { flex: 1, alignItems: 'center' },
  label: { fontSize: 10, color: Colors.textTertiary },
  value: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  total: { fontSize: 10, color: Colors.textTertiary },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  heroCard: { borderRadius: Radius.xxl, padding: 24, marginBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.5)' },
  heroAmount: { fontSize: 32, fontWeight: '800', color: '#FFF', marginTop: 4 },
  heroPending: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.5)', marginTop: 6 },
  aiCard: { marginBottom: 16, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.md },
  aiCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18 },
  aiTitle: { fontSize: FontSize.md, fontWeight: '700', color: '#FFF' },
  aiSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  reportStats: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  rStatBox: { flex: 1, backgroundColor: Colors.bgMuted, borderRadius: Radius.md, padding: 10, alignItems: 'center' },
  rStatVal: { fontSize: 16, fontWeight: '800' },
  rStatLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  remindBtn: { marginLeft: 6, backgroundColor: Colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  remindBtnText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  reportCard: { backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 18, marginBottom: 16, ...Shadow.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  reportSummary: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  reportRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  reportName: { flex: 1, fontSize: FontSize.sm, fontWeight: '500', color: Colors.text },
  reportAmount: { fontSize: FontSize.xs, color: Colors.textSecondary, marginRight: 8 },
  reportTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  reportTagText: { fontSize: 10, fontWeight: '700' },
  groupCard: { backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 18, marginBottom: 12, ...Shadow.sm },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  groupName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  groupRate: { fontSize: FontSize.lg, fontWeight: '800' },
  finRow: { flexDirection: 'row', marginBottom: 10 },
  finBar: { height: 4, backgroundColor: Colors.bgMuted, borderRadius: 2, overflow: 'hidden' },
  finBarFill: { height: 4, borderRadius: 2 },
});
