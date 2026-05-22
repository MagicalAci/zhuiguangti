import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { ProductCard } from '../../src/components/ProductCard';
import { Colors, Radius, Shadow, FontSize } from '../../src/theme';
import { formatCurrency, HEAT_MAP } from '../../src/utils/helpers';
import { HeatLevel } from '../../src/types';
import { aiPredictHeat } from '../../src/ai/heatPredict';

const HEAT_CYCLE: HeatLevel[] = ['normal', 'hot', 'cold'];

export default function ProductManagement() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const store = useStore();
  const group = store.groups.find((g) => g.id === id);

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', price: '', heat: 'normal' as HeatLevel, stock: '50', weight: '0.1' });
  const [batchText, setBatchText] = useState('');

  if (!group) return <View style={s.screen}><Text style={{ textAlign: 'center', marginTop: 100 }}>团不存在</Text></View>;

  const openAdd = () => { setEditId(null); setForm({ name: '', price: '', heat: 'normal', stock: '50', weight: '0.1' }); setShowAdd(true); };
  const openEdit = (pid: string) => {
    const p = group.products.find((x) => x.id === pid);
    if (!p) return;
    setEditId(pid);
    setForm({ name: p.name, price: p.price.toString(), heat: p.heat, stock: p.stock.toString(), weight: (p.weight ?? 0.1).toString() });
    setShowAdd(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { Alert.alert('请填写商品名'); return; }
    if (editId) {
      store.updateProductPrice(group.id, editId, parseFloat(form.price) || 0);
      store.updateProductStock(group.id, editId, parseInt(form.stock) || 50);
      setShowAdd(false);
      Alert.alert('已保存');
    } else {
      store.addProduct(group.id, { name: form.name, price: parseFloat(form.price) || 0, heat: form.heat, stock: parseInt(form.stock) || 50, weight: parseFloat(form.weight) || 0.1 });
      setShowAdd(false);
      Alert.alert('已添加', form.name);
    }
  };

  const handleBatchImport = () => {
    if (!batchText.trim()) return;
    const lines = batchText.trim().split('\n');
    let count = 0;
    lines.forEach((line) => {
      const parts = line.split(/[,，\t]+/);
      const name = parts[0]?.trim();
      if (!name) return;
      store.addProduct(group.id, {
        name,
        price: parseFloat(parts[1]?.trim() ?? '0') || 0,
        heat: (parts[2]?.trim() === '热' ? 'hot' : parts[2]?.trim() === '冷' ? 'cold' : 'normal') as HeatLevel,
        stock: parseInt(parts[3]?.trim() ?? '50') || 50,
        weight: parseFloat(parts[4]?.trim() ?? '0.1') || 0.1,
      });
      count++;
    });
    setBatchText('');
    Alert.alert('批量导入完成', `成功添加 ${count} 个商品`);
  };

  const handleRestock = (pid: string) => {
    Alert.alert('补货', '增加多少库存？', [
      { text: '取消' },
      { text: '+10', onPress: () => { const p = group.products.find((x) => x.id === pid); if (p) store.updateProductStock(group.id, pid, p.stock + 10); } },
      { text: '+50', onPress: () => { const p = group.products.find((x) => x.id === pid); if (p) store.updateProductStock(group.id, pid, p.stock + 50); } },
    ]);
  };

  const handleDelete = (pid: string) => {
    const p = group.products.find((x) => x.id === pid);
    Alert.alert('删除商品', `确认删除「${p?.name}」？`, [
      { text: '取消' },
      { text: '删除', style: 'destructive', onPress: () => store.removeProduct(group.id, pid) },
    ]);
  };

  const handleAIHeat = () => {
    const analysis = aiPredictHeat(group.products);
    analysis.predictions.forEach((pred) => {
      const p = group.products.find((x) => x.id === pred.productId);
      if (p && p.heat !== pred.recommendedHeat) {
        store.removeProduct(group.id, pred.productId);
        store.addProduct(group.id, { ...p, heat: pred.recommendedHeat });
      }
    });
    Alert.alert('AI 热度分析', analysis.summary + '\n\n' + analysis.warnings.join('\n'));
  };

  const handleBatchPrice = (multiplier: number) => {
    const label = multiplier < 1 ? `降价${((1 - multiplier) * 100).toFixed(0)}%` : `涨价${((multiplier - 1) * 100).toFixed(0)}%`;
    Alert.alert('全员调价', `确认所有商品${label}？`, [
      { text: '取消' },
      { text: '确认', onPress: () => { store.batchUpdateProductPrice(group.id, multiplier); Alert.alert('调价完成'); } },
    ]);
  };

  const hot = group.products.filter((p) => p.heat === 'hot');
  const cold = group.products.filter((p) => p.heat === 'cold');
  const normal = group.products.filter((p) => p.heat === 'normal');
  const totalStock = group.products.reduce((s, p) => s + p.stock, 0);
  const totalSold = group.products.reduce((s, p) => s + p.sold, 0);

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* 顶栏 */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={Colors.text} /></TouchableOpacity>
          <Text style={s.topTitle}>商品管理</Text>
          <TouchableOpacity onPress={openAdd}><Ionicons name="add-circle" size={26} color={Colors.primary} /></TouchableOpacity>
        </View>

        {/* 统计 */}
        <View style={s.statsRow}>
          <StatBox label="总商品" value={group.products.length.toString()} color={Colors.primary} />
          <StatBox label="总库存" value={totalStock.toString()} color={Colors.info} />
          <StatBox label="已售出" value={totalSold.toString()} color={Colors.success} />
          <StatBox label="售罄" value={group.products.filter((p) => p.sold >= p.stock).length.toString()} color={Colors.danger} />
        </View>

        {/* 冷热概览 */}
        <View style={s.poolOverview}>
          <View style={[s.poolItem, { backgroundColor: Colors.accentBg }]}>
            <Text style={s.poolEmoji}>🔥</Text>
            <Text style={[s.poolCount, { color: Colors.accent }]}>{hot.length}</Text>
            <Text style={s.poolLabel}>热门</Text>
          </View>
          <View style={[s.poolItem, { backgroundColor: Colors.bgMuted }]}>
            <Text style={s.poolEmoji}>⭐</Text>
            <Text style={s.poolCount}>{normal.length}</Text>
            <Text style={s.poolLabel}>普通</Text>
          </View>
          <View style={[s.poolItem, { backgroundColor: Colors.infoBg }]}>
            <Text style={s.poolEmoji}>❄️</Text>
            <Text style={[s.poolCount, { color: Colors.info }]}>{cold.length}</Text>
            <Text style={s.poolLabel}>冷门</Text>
          </View>
        </View>

        {/* 操作按钮 */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionChip} onPress={handleAIHeat}>
            <Text style={s.actionIcon}>🤖</Text>
            <Text style={s.actionText}>AI分析</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionChip} onPress={() => handleBatchPrice(0.95)}>
            <Ionicons name="trending-down" size={14} color={Colors.success} />
            <Text style={s.actionText}>降5%</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionChip} onPress={() => handleBatchPrice(1.05)}>
            <Ionicons name="trending-up" size={14} color={Colors.accent} />
            <Text style={s.actionText}>涨5%</Text>
          </TouchableOpacity>
        </View>

        {/* 批量导入 */}
        <View style={s.batchCard}>
          <Text style={s.batchTitle}>📋 批量导入</Text>
          <TextInput style={s.batchInput} value={batchText} onChangeText={setBatchText} placeholder={'每行一个：名称,价格,热/冷/普,库存,重量\n例：朔间零 吧唧,35,热,50,0.05'} multiline placeholderTextColor={Colors.textTertiary} />
          {batchText.trim().length > 0 && (
            <TouchableOpacity activeOpacity={0.8} onPress={handleBatchImport} style={[s.batchBtn, { backgroundColor: Colors.primary }]}>
              <Ionicons name="cloud-upload" size={16} color="#FFF" /><Text style={s.batchBtnText}>导入</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 商品列表 */}
        <Text style={s.sectionTitle}>全部商品 ({group.products.length})</Text>
        {group.products.map((p) => (
          <ProductCard key={p.id} product={p} mode="manage" onEdit={() => openEdit(p.id)} onDelete={() => handleDelete(p.id)} onRestock={() => handleRestock(p.id)} />
        ))}
      </ScrollView>

      {/* 添加/编辑弹窗 */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowAdd(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>{editId ? '编辑商品' : '添加商品'}</Text>

              <Text style={s.fieldLabel}>商品名称</Text>
              <TextInput style={s.fieldInput} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="例：朔间零 吧唧" placeholderTextColor={Colors.textTertiary} editable={!editId} />

              <View style={s.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>价格 (¥)</Text>
                  <TextInput style={s.fieldInput} value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textTertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>库存</Text>
                  <TextInput style={s.fieldInput} value={form.stock} onChangeText={(v) => setForm({ ...form, stock: v })} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>重量(kg)</Text>
                  <TextInput style={s.fieldInput} value={form.weight} onChangeText={(v) => setForm({ ...form, weight: v })} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
                </View>
              </View>

              <Text style={s.fieldLabel}>冷热标签</Text>
              <View style={s.heatRow}>
                {HEAT_CYCLE.map((h) => {
                  const hm = HEAT_MAP[h];
                  const active = form.heat === h;
                  return (
                    <TouchableOpacity key={h} style={[s.heatOption, active && { borderColor: hm.color, backgroundColor: hm.bg }]} onPress={() => setForm({ ...form, heat: h })}>
                      <Text style={{ fontSize: 16 }}>{h === 'hot' ? '🔥' : h === 'cold' ? '❄️' : '⭐'}</Text>
                      <Text style={[s.heatOptionText, active && { color: hm.color }]}>{hm.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity activeOpacity={0.8} onPress={handleSave} style={[s.saveBtn, { marginTop: 20, backgroundColor: Colors.primary }]}>
                <Text style={s.saveBtnText}>{editId ? '保存修改' : '添加商品'}</Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={sb.box}>
      <Text style={[sb.value, { color }]}>{value}</Text>
      <Text style={sb.label}>{label}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', backgroundColor: '#FFF', borderRadius: Radius.lg, paddingVertical: 14, marginHorizontal: 3, ...Shadow.sm },
  value: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 12 },
  topTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  statsRow: { flexDirection: 'row', marginBottom: 12 },
  poolOverview: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  poolItem: { flex: 1, alignItems: 'center', padding: 12, borderRadius: Radius.lg },
  poolEmoji: { fontSize: 18 },
  poolCount: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 2 },
  poolLabel: { fontSize: 10, color: Colors.textTertiary },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.borderLight, ...Shadow.sm },
  actionIcon: { fontSize: 14 },
  actionText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  batchCard: { backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 14, marginBottom: 16, ...Shadow.sm },
  batchTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  batchInput: { backgroundColor: Colors.bgMuted, borderRadius: Radius.md, padding: 10, fontSize: FontSize.sm, color: Colors.text, height: 70, textAlignVertical: 'top' },
  batchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, paddingVertical: 10, marginTop: 8 },
  batchBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 10 },
  fieldInput: { backgroundColor: Colors.bgMuted, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.md, color: Colors.text },
  fieldRow: { flexDirection: 'row', gap: 10 },
  heatRow: { flexDirection: 'row', gap: 10 },
  heatOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.borderLight, backgroundColor: '#FFF' },
  heatOptionText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: { borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: FontSize.lg },
});
