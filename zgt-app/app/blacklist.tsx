import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';
import { EmptyState } from '../src/components/EmptyState';
import { Colors, Radius, Shadow, FontSize } from '../src/theme';
import { formatDate } from '../src/utils/helpers';

export default function BlacklistScreen() {
  const { blacklist, addToBlacklist, removeFromBlacklist } = useStore();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newReason, setNewReason] = useState('');

  const filtered = blacklist.filter((b) => b.memberName.includes(search) || b.reason.includes(search));

  const handleAdd = () => {
    if (!newName.trim() || !newReason.trim()) { Alert.alert('请填写完整'); return; }
    addToBlacklist({ memberName: newName, memberId: `m_${Date.now()}`, reason: newReason, reportedBy: '手动添加' });
    setNewName(''); setNewReason(''); setShowAdd(false);
    Alert.alert('已添加', `${newName} 已加入黑名单`);
  };

  return (
    <View style={s.screen}>
      {/* 头部 */}
      <View style={[s.header, { backgroundColor: '#DC2626' }]}>
        <Ionicons name="shield-checkmark" size={28} color="#FFF" />
        <Text style={s.headerTitle}>黑名单共享池</Text>
        <Text style={s.headerSub}>跨团共享 · 保护每位团长权益</Text>
        <View style={s.headerStats}>
          <View style={s.hStat}><Text style={s.hStatVal}>{blacklist.length}</Text><Text style={s.hStatLabel}>黑名单</Text></View>
          <View style={s.hStatDivider} />
          <View style={s.hStat}><Text style={s.hStatVal}>{blacklist.reduce((s, b) => s + b.reportCount, 0)}</Text><Text style={s.hStatLabel}>总举报</Text></View>
        </View>
      </View>

      {/* 搜索 + 添加 */}
      <View style={s.toolbar}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={16} color={Colors.textTertiary} />
          <TextInput style={s.searchInput} placeholder="搜索用户名 / 原因" value={search} onChangeText={setSearch} placeholderTextColor={Colors.textTertiary} />
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(!showAdd)} activeOpacity={0.8}>
          <Ionicons name={showAdd ? 'close' : 'add'} size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {showAdd && (
        <View style={s.addForm}>
          <TextInput style={s.addInput} placeholder="用户名" value={newName} onChangeText={setNewName} placeholderTextColor={Colors.textTertiary} />
          <TextInput style={s.addInput} placeholder="拉黑原因（详细描述）" value={newReason} onChangeText={setNewReason} placeholderTextColor={Colors.textTertiary} />
          <TouchableOpacity activeOpacity={0.8} onPress={handleAdd} style={[s.addSubmit, { backgroundColor: Colors.danger }]}>
            <Text style={s.addSubmitText}>添加到黑名单</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.map((b) => (
          <View key={b.id} style={s.card}>
            <View style={s.cardTop}>
              <View style={s.cardAvatar}><Ionicons name="person" size={18} color={Colors.danger} /></View>
              <View style={s.cardInfo}>
                <Text style={s.cardName}>{b.memberName}</Text>
                <Text style={s.cardMeta}>{formatDate(b.createdAt)} · 被举报 {b.reportCount} 次</Text>
              </View>
              <TouchableOpacity onPress={() => Alert.alert('移出', `移出 ${b.memberName}？`, [{ text: '取消' }, { text: '确认', onPress: () => removeFromBlacklist(b.id) }])}>
                <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <View style={s.cardReason}>
              <Ionicons name="alert-circle" size={14} color={Colors.danger} />
              <Text style={s.cardReasonText}>{b.reason}</Text>
            </View>
            <Text style={s.cardSource}>来源：{b.reportedBy}</Text>
          </View>
        ))}
        {filtered.length === 0 && <EmptyState icon="happy" title="黑名单为空" subtitle="暂无逃单记录" />}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center', borderBottomLeftRadius: Radius.xxl, borderBottomRightRadius: Radius.xxl },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginTop: 8 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  headerStats: { flexDirection: 'row', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.lg, paddingVertical: 12, paddingHorizontal: 24 },
  hStat: { flex: 1, alignItems: 'center' },
  hStatVal: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  hStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  hStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  toolbar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: Radius.lg, paddingHorizontal: 14, height: 44, gap: 8, ...Shadow.sm },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  addBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center' },
  addForm: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 16, gap: 10, ...Shadow.md },
  addInput: { backgroundColor: Colors.bgMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text },
  addSubmit: { borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center' },
  addSubmitText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 16, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: Colors.danger, ...Shadow.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAvatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  cardReason: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10, backgroundColor: Colors.dangerBg, borderRadius: Radius.md, padding: 10 },
  cardReasonText: { flex: 1, fontSize: 13, color: Colors.danger, lineHeight: 18 },
  cardSource: { fontSize: 11, color: Colors.textTertiary, marginTop: 8 },
});
