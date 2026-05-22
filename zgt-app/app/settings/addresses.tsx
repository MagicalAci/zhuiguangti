import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, Alert, Modal, TextInput, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PURPLE = '#7C3AED';

interface Address {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault?: boolean;
  tag?: '家' | '公司' | '学校';
}

function emptyAddress(): Address {
  return { id: '', name: '', phone: '', province: '', city: '', district: '', detail: '' };
}

const INIT: Address[] = [
  {
    id: 'a1', name: '追光的小七', phone: '138****5566',
    province: '浙江省', city: '杭州市', district: '余杭区',
    detail: '梦想小镇 4 号楼 502 室',
    isDefault: true, tag: '家',
  },
  {
    id: 'a2', name: '小七', phone: '138****5566',
    province: '浙江省', city: '杭州市', district: '西湖区',
    detail: '黄龙商务中心 A 座 18 层',
    tag: '公司',
  },
];

export default function AddressManagePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<Address[]>(INIT);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Address>(emptyAddress());

  const openAdd = () => {
    setEditId(null);
    setDraft({ ...emptyAddress(), id: `a_${Date.now().toString(36)}` });
    setSheetOpen(true);
  };
  const openEdit = (a: Address) => {
    setEditId(a.id);
    setDraft({ ...a });
    setSheetOpen(true);
  };
  const save = () => {
    if (!draft.name.trim() || !draft.phone.trim() || !draft.detail.trim()) {
      Alert.alert('请补全信息', '收件人 / 手机号 / 详细地址必填');
      return;
    }
    setList((prev) => {
      let next: Address[];
      if (editId) {
        next = prev.map((a) => a.id === editId ? { ...draft } : a);
      } else {
        next = [...prev, { ...draft }];
      }
      if (draft.isDefault) {
        next = next.map((a) => ({ ...a, isDefault: a.id === draft.id }));
      }
      return next;
    });
    setSheetOpen(false);
  };
  const remove = (aid: string) => {
    Alert.alert('删除地址', '确认删除该地址？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确认删除', style: 'destructive',
        onPress: () => setList((prev) => prev.filter((a) => a.id !== aid)),
      },
    ]);
  };
  const setDefault = (aid: string) => {
    setList((prev) => prev.map((a) => ({ ...a, isDefault: a.id === aid })));
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
          <Text style={s.title}>收货地址</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={s.headerSub}>
          可保存多个收货地址 · 每次下单时自动带出默认地址
        </Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 140 + insets.bottom, gap: 10 }}>
        {list.map((a) => (
          <Pressable key={a.id} style={s.card} onPress={() => openEdit(a)}>
            <View style={s.cardTopRow}>
              <Text style={s.name}>{a.name}</Text>
              <Text style={s.phone}>{a.phone}</Text>
              {a.tag && <View style={s.tagPill}><Text style={s.tagText}>{a.tag}</Text></View>}
              {a.isDefault && <View style={s.defaultPill}><Text style={s.defaultText}>默认</Text></View>}
            </View>
            <Text style={s.detail} numberOfLines={2}>
              {a.province} {a.city} {a.district} {a.detail}
            </Text>
            <View style={s.cardActionRow}>
              {!a.isDefault && (
                <Pressable style={s.smallBtn} onPress={() => setDefault(a.id)}>
                  <Ionicons name="star-outline" size={11} color="#6B7280" />
                  <Text style={s.smallBtnText}>设为默认</Text>
                </Pressable>
              )}
              <Pressable style={s.smallBtn} onPress={() => openEdit(a)}>
                <Ionicons name="create-outline" size={11} color="#6B7280" />
                <Text style={s.smallBtnText}>编辑</Text>
              </Pressable>
              <Pressable style={[s.smallBtn, s.danger]} onPress={() => remove(a.id)}>
                <Ionicons name="trash-outline" size={11} color="#EF4444" />
                <Text style={[s.smallBtnText, { color: '#EF4444' }]}>删除</Text>
              </Pressable>
            </View>
          </Pressable>
        ))}

        {list.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="location-outline" size={36} color="#E5E7EB" />
            <Text style={s.emptyText}>暂无收货地址</Text>
            <Text style={s.emptySub}>点击下方「新增地址」添加第一个</Text>
          </View>
        )}
      </ScrollView>

      {/* —— 底部新增按钮 —— */}
      <View style={[s.bottomBar, { paddingBottom: 10 + insets.bottom }]}>
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <LinearGradient
            colors={[PURPLE, '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.addBtnInner}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={s.addBtnText}>新增地址</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* —— 编辑弹层 —— */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={mS.overlay} onPress={() => setSheetOpen(false)}>
          <Pressable style={mS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={mS.handle} />
            <Text style={mS.title}>{editId ? '编辑地址' : '新增地址'}</Text>

            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
              <Text style={mS.label}>收件人</Text>
              <View style={mS.fieldRow}>
                <Ionicons name="person-outline" size={14} color="#9CA3AF" />
                <TextInput
                  style={mS.input}
                  placeholder="请输入姓名"
                  placeholderTextColor="#C4C4D4"
                  value={draft.name}
                  onChangeText={(v) => setDraft({ ...draft, name: v })}
                />
              </View>

              <Text style={mS.label}>手机号</Text>
              <View style={mS.fieldRow}>
                <Ionicons name="call-outline" size={14} color="#9CA3AF" />
                <TextInput
                  style={mS.input}
                  placeholder="11 位手机号"
                  placeholderTextColor="#C4C4D4"
                  value={draft.phone}
                  onChangeText={(v) => setDraft({ ...draft, phone: v.replace(/[^\d*]/g, '') })}
                  keyboardType="number-pad"
                  maxLength={15}
                />
              </View>

              <Text style={mS.label}>所在地区</Text>
              <Pressable
                style={mS.fieldRow}
                onPress={() => setDraft({ ...draft, province: '浙江省', city: '杭州市', district: '余杭区' })}
              >
                <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                <Text style={[mS.input, !draft.province && { color: '#C4C4D4' }]}>
                  {draft.province ? `${draft.province} · ${draft.city} · ${draft.district}` : '点击选择 省 / 市 / 区'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#C4C4D4" />
              </Pressable>

              <Text style={mS.label}>详细地址</Text>
              <View style={[mS.fieldRow, { alignItems: 'flex-start' }]}>
                <Ionicons name="home-outline" size={14} color="#9CA3AF" style={{ marginTop: 4 }} />
                <TextInput
                  style={[mS.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="街道 / 小区 / 楼栋 / 门牌"
                  placeholderTextColor="#C4C4D4"
                  multiline
                  value={draft.detail}
                  onChangeText={(v) => setDraft({ ...draft, detail: v })}
                />
              </View>

              <Text style={mS.label}>标签（可选）</Text>
              <View style={mS.tagRow}>
                {(['家', '公司', '学校'] as const).map((t) => (
                  <Pressable
                    key={t}
                    style={[mS.tagBtn, draft.tag === t && mS.tagBtnActive]}
                    onPress={() => setDraft({ ...draft, tag: draft.tag === t ? undefined : t })}
                  >
                    <Text style={[mS.tagBtnText, draft.tag === t && mS.tagBtnTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={mS.switchRow}>
                <Text style={mS.switchLabel}>设为默认地址</Text>
                <Switch
                  value={!!draft.isDefault}
                  onValueChange={(v) => setDraft({ ...draft, isDefault: v })}
                  trackColor={{ true: PURPLE, false: '#E5E7EB' }}
                  thumbColor="#FFF"
                />
              </View>

              {editId && (
                <Pressable style={mS.dangerBtn} onPress={() => { setSheetOpen(false); remove(editId); }}>
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  <Text style={mS.dangerText}>删除该地址</Text>
                </Pressable>
              )}
            </ScrollView>

            <View style={mS.btnRow}>
              <Pressable style={mS.cancelBtn} onPress={() => setSheetOpen(false)}>
                <Text style={mS.cancelText}>取消</Text>
              </Pressable>
              <Pressable style={mS.saveBtn} onPress={save}>
                <LinearGradient
                  colors={[PURPLE, '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={mS.saveInner}
                >
                  <Ionicons name="save-outline" size={14} color="#FFF" />
                  <Text style={mS.saveText}>{editId ? '保存修改' : '保存地址'}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  header: {
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 10 },

  card: {
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, gap: 6,
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  phone: { fontSize: 13, color: '#6B7280' },
  tagPill: { backgroundColor: '#F5F3FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 9, color: PURPLE, fontWeight: '700' },
  defaultPill: { backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  defaultText: { fontSize: 9, color: '#EF4444', fontWeight: '700' },
  detail: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  cardActionRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  smallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, backgroundColor: '#F3F4F6',
  },
  smallBtnText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  danger: { backgroundColor: '#FEF2F2' },

  empty: { alignItems: 'center', padding: 48 },
  emptyText: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginTop: 10 },
  emptySub: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: 14,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  addBtn: { borderRadius: 22, overflow: 'hidden' },
  addBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14,
  },
  addBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});

const mS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 14, paddingBottom: 22, paddingHorizontal: 18,
    maxHeight: '92%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: '#1E1B4B', marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '700', color: '#1E1B4B', marginTop: 12, marginBottom: 6 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F5FA', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 14, color: '#1E1B4B', padding: 0 },
  tagRow: { flexDirection: 'row', gap: 8 },
  tagBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  tagBtnActive: { backgroundColor: PURPLE },
  tagBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  tagBtnTextActive: { color: '#FFF', fontWeight: '700' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 18,
  },
  switchLabel: { fontSize: 14, color: '#1E1B4B', fontWeight: '600' },
  dangerBtn: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, borderRadius: 14,
    backgroundColor: '#FEF2F2',
  },
  dangerText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 22, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  saveBtn: { flex: 1.4, borderRadius: 22, overflow: 'hidden' },
  saveInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 13,
  },
  saveText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});
