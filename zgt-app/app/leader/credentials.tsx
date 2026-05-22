import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput, Modal,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrefs, CredImage } from '../../src/store/usePrefs';

const PURPLE = '#7C3AED';
const PURPLE_DARK = '#5B21B6';

const TYPE_OPTS: CredImage['type'][] = ['下单证明', '官店截图', '粉籍证明', '拿货凭证', '其他'];

export default function LeaderCredentialsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    leaderCredImages, leaderCredDesc,
    addLeaderCred, removeLeaderCred, setLeaderCredDesc,
  } = usePrefs();

  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CredImage['type']>('粉籍证明');
  const [desc, setDesc] = useState(leaderCredDesc);
  const [savedHint, setSavedHint] = useState(false);

  const handleAdd = () => {
    if (!newLabel.trim()) {
      Alert.alert('提示', '请填写凭证简介');
      return;
    }
    addLeaderCred({ label: newLabel.trim(), type: newType });
    setNewLabel('');
    setNewType('粉籍证明');
    setAddOpen(false);
  };

  const handleSaveDesc = () => {
    setLeaderCredDesc(desc);
    setSavedHint(true);
    setTimeout(() => setSavedHint(false), 1600);
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={[PURPLE, PURPLE_DARK]} style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={16} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
        <Text style={s.headerTitle}>我的信誉凭证</Text>
        <View style={{ width: 34 }} />
      </LinearGradient>

      {/* —— Hero —— */}
      <View style={s.hero}>
        <View style={s.heroLeft}>
          <Text style={s.heroTitle}>团长本人信誉沉淀</Text>
          <Text style={s.heroSub}>
            上传一次 · 任何拼团都可一键引用 · 让团员一眼信你
          </Text>
        </View>
        <View style={s.heroBadge}>
          <Ionicons name="shield-checkmark" size={20} color="#FFF" />
          <Text style={s.heroBadgeText}>已认证</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* —— 凭证图区 —— */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>凭证图</Text>
            <Text style={s.cardCount}>{leaderCredImages.length}/9</Text>
          </View>
          <Text style={s.cardHint}>支持往期拼车截图 / 粉籍认证 / 官店购买记录 / 拿货凭证</Text>

          <View style={s.imgGrid}>
            {leaderCredImages.map((c) => (
              <View key={c.id} style={s.imgItem}>
                <View style={s.imgPlaceholder}>
                  <Ionicons name="document-attach" size={26} color={PURPLE} />
                  <Text style={s.imgType}>{c.type}</Text>
                </View>
                <Text style={s.imgLabel} numberOfLines={2}>{c.label}</Text>
                <Pressable
                  style={s.imgRemove}
                  onPress={() => Alert.alert('删除凭证', `确认删除「${c.label}」？`, [
                    { text: '取消', style: 'cancel' },
                    { text: '删除', style: 'destructive', onPress: () => removeLeaderCred(c.id) },
                  ])}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </Pressable>
              </View>
            ))}

            {leaderCredImages.length < 9 && (
              <Pressable style={s.imgAdd} onPress={() => setAddOpen(true)}>
                <Ionicons name="cloud-upload-outline" size={28} color={PURPLE} />
                <Text style={s.imgAddText}>上传凭证</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* —— 简介区 —— */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>本人简介</Text>
            <Text style={s.cardCount}>{desc.length}/500</Text>
          </View>
          <Text style={s.cardHint}>
            描述你的粉籍年限 / 拼车经验 / 合作店铺 · 该内容会随凭证一起展示给团员
          </Text>
          <View style={s.descBox}>
            <TextInput
              style={s.descInput}
              value={desc}
              onChangeText={(t) => t.length <= 500 && setDesc(t)}
              multiline
              textAlignVertical="top"
              placeholder="例：&#10;· 偶像梦幻祭粉籍 3 年&#10;· 累计经营拼车 23 次，0 跑单&#10;· 长期合作店铺：A 店、B 店"
              placeholderTextColor="#C4C4D4"
            />
          </View>
          <Pressable style={s.saveBtn} onPress={handleSaveDesc}>
            <Ionicons name="save" size={14} color="#FFF" />
            <Text style={s.saveBtnText}>保存简介</Text>
          </Pressable>
          {savedHint && (
            <View style={s.saveToast}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={s.saveToastText}>已保存 · 下次发团可一键引用</Text>
            </View>
          )}
        </View>

        {/* —— 引用说明 —— */}
        <View style={s.tipBox}>
          <Ionicons name="bulb" size={16} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={s.tipTitle}>如何使用？</Text>
            <Text style={s.tipText}>
              发起拼团 → 团基本信息页 → 信誉凭证 → 开启「使用我的信誉凭证」开关，本页所有内容会自动引用到拼团中。
              {'\n'}你也可以在拼团里额外上传本团专属凭证（如本次下单截图）。
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* —— 新增凭证弹窗 —— */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setAddOpen(false)} />
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>新增凭证</Text>

            <Text style={s.modalLabel}>凭证类型</Text>
            <View style={s.typeRow}>
              {TYPE_OPTS.map((t) => (
                <Pressable
                  key={t}
                  style={[s.typeChip, newType === t && s.typeChipActive]}
                  onPress={() => setNewType(t)}
                >
                  <Text style={[s.typeChipText, newType === t && s.typeChipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.modalLabel}>凭证简介</Text>
            <View style={s.modalInputBox}>
              <TextInput
                style={s.modalInput}
                value={newLabel}
                onChangeText={(t) => t.length <= 60 && setNewLabel(t)}
                placeholder="如：2024 春 · 偶像梦幻祭拼车凭证"
                placeholderTextColor="#C4C4D4"
              />
            </View>

            <Pressable style={s.uploadFake} onPress={() => Alert.alert('上传', 'V1 模拟：已生成一张占位凭证图')}>
              <Ionicons name="cloud-upload-outline" size={22} color={PURPLE} />
              <Text style={s.uploadFakeText}>点击上传图片（V1 模拟）</Text>
            </Pressable>

            <View style={s.modalActions}>
              <Pressable style={s.cancelBtn} onPress={() => setAddOpen(false)}>
                <Text style={s.cancelText}>取消</Text>
              </Pressable>
              <Pressable style={s.confirmBtn} onPress={handleAdd}>
                <Text style={s.confirmText}>添加</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
  },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },

  hero: {
    marginHorizontal: 14, marginTop: 14, padding: 16,
    borderRadius: 14, backgroundColor: '#FFF',
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#1E1B4B', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  heroLeft: { flex: 1 },
  heroTitle: { fontSize: 16, fontWeight: '800', color: '#1E1B4B' },
  heroSub: { fontSize: 11, color: '#6B7280', marginTop: 4, lineHeight: 16 },
  heroBadge: {
    backgroundColor: '#10B981', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6, gap: 3,
    alignItems: 'center',
  },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF' },

  card: {
    marginHorizontal: 14, marginTop: 12, padding: 14,
    backgroundColor: '#FFF', borderRadius: 14,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  cardCount: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  cardHint: { fontSize: 11, color: '#9CA3AF', marginBottom: 10 },

  imgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imgItem: { width: 88, position: 'relative' },
  imgPlaceholder: {
    width: 88, height: 88, borderRadius: 10,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E0D7FB', gap: 4,
  },
  imgType: { fontSize: 9, color: PURPLE, fontWeight: '800' },
  imgLabel: { fontSize: 10, color: '#374151', marginTop: 4, fontWeight: '500' },
  imgRemove: { position: 'absolute', top: -6, right: -6 },
  imgAdd: {
    width: 88, height: 88, borderRadius: 10,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FAFAFE',
  },
  imgAddText: { fontSize: 11, color: PURPLE, marginTop: 4, fontWeight: '700' },

  descBox: { backgroundColor: '#F5F5FA', borderRadius: 12, paddingHorizontal: 12 },
  descInput: { fontSize: 13, color: '#1E1B4B', minHeight: 100, paddingVertical: 12, lineHeight: 20 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: PURPLE, borderRadius: 18, paddingVertical: 9, marginTop: 10,
  },
  saveBtnText: { fontSize: 12, color: '#FFF', fontWeight: '700' },
  saveToast: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 5, marginTop: 8,
    alignSelf: 'center',
  },
  saveToastText: { fontSize: 11, color: '#10B981', fontWeight: '700' },

  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 14, marginTop: 12, padding: 12,
    backgroundColor: '#FFFBEB', borderRadius: 12,
    borderLeftWidth: 3, borderLeftColor: '#F59E0B',
  },
  tipTitle: { fontSize: 12, fontWeight: '800', color: '#92400E', marginBottom: 2 },
  tipText: { fontSize: 11, color: '#92400E', lineHeight: 16 },

  // —— Modal ——
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    padding: 16, paddingBottom: 26,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B4B', marginBottom: 12 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 6, marginBottom: 6 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  typeChip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 14, backgroundColor: '#F3F4F6',
    borderWidth: 1, borderColor: 'transparent',
  },
  typeChipActive: { backgroundColor: '#F5F3FF', borderColor: PURPLE },
  typeChipText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  typeChipTextActive: { color: PURPLE, fontWeight: '800' },
  modalInputBox: { backgroundColor: '#F5F5FA', borderRadius: 10, paddingHorizontal: 12 },
  modalInput: { fontSize: 13, color: '#1E1B4B', paddingVertical: 12 },
  uploadFake: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 10, paddingVertical: 18, borderRadius: 12,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: PURPLE,
    backgroundColor: '#FAFAFE',
  },
  uploadFakeText: { fontSize: 12, color: PURPLE, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 22,
    borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center',
  },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  confirmBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 22,
    backgroundColor: PURPLE, alignItems: 'center',
  },
  confirmText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
});
