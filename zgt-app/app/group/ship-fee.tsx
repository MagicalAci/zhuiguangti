import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../src/store/useStore';

const PURPLE = '#7C3AED';

const MOCK_MEMBERS = [
  { id: 'm1', name: '小圆', avatar: '🐱', paid: true,  amount: 35 },
  { id: 'm2', name: '阿杰', avatar: '🐶', paid: true,  amount: 42 },
  { id: 'm3', name: '糖糖', avatar: '🐰', paid: false, amount: 28 },
  { id: 'm4', name: '小鱼', avatar: '🐠', paid: true,  amount: 19 },
  { id: 'm5', name: '星星', avatar: '⭐', paid: false, amount: 53 },
  { id: 'm6', name: '大毛', avatar: '🐻', paid: true,  amount: 66 },
  { id: 'm7', name: '可乐', avatar: '🥤', paid: false, amount: 15 },
  { id: 'm8', name: '米粒', avatar: '🍚', paid: true,  amount: 38 },
];

export default function ShipFeePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useStore((s) => s.groups.find((g) => g.id === id));

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [feeInput, setFeeInput] = useState('8');

  // Toast
  const [toastText, setToastText] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTmr = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    if (toastTmr.current) clearTimeout(toastTmr.current);
    setToastText(msg);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTmr.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToastText(''));
    }, 2000);
  };

  const allSelected = selected.size === MOCK_MEMBERS.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(MOCK_MEMBERS.map((m) => m.id)));
    }
  }

  function toggle(mid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(mid) ? next.delete(mid) : next.add(mid);
      return next;
    });
  }

  function handleSend() {
    if (selected.size === 0) {
      showToast('请至少选择一位团员');
      return;
    }
    const fee = parseFloat(feeInput) || 0;
    if (fee <= 0) {
      showToast('请输入邮费金额');
      return;
    }
    Alert.alert(
      '确认发送',
      `向 ${selected.size} 位团员发送补邮费 ¥${fee} 的通知？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认发送',
          onPress: () => {
            showToast(`已向 ${selected.size} 位团员推送补邮费通知`);
            setTimeout(() => router.back(), 1200);
          },
        },
      ],
    );
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* 导航栏 */}
      <View style={s.nav}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
        </Pressable>
        <Text style={s.navTitle}>通知补邮费</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 邮费金额输入 */}
      <View style={s.feeCard}>
        <Text style={s.feeLabel}>补邮费金额（元）</Text>
        <View style={s.feeInputRow}>
          <Text style={s.feePrefix}>¥</Text>
          <TextInput
            style={s.feeInput}
            value={feeInput}
            onChangeText={setFeeInput}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#D1D5DB"
          />
        </View>
        <Text style={s.feeSub}>货物过大 / 实际邮费超出下单预算时，补差额发起一笔「待支付 · 补邮费」</Text>
      </View>

      {/* 全选栏 */}
      <View style={s.selectBar}>
        <Pressable style={s.selectAllBtn} onPress={toggleAll}>
          <Ionicons
            name={allSelected ? 'checkbox' : 'square-outline'}
            size={20}
            color={allSelected ? PURPLE : '#9CA3AF'}
          />
          <Text style={s.selectAllText}>全选</Text>
        </Pressable>
        <Text style={s.selectCount}>已选 {selected.size}/{MOCK_MEMBERS.length} 人</Text>
      </View>

      {/* 团员列表 */}
      <ScrollView style={s.list} contentContainerStyle={{ paddingBottom: 100 }}>
        {MOCK_MEMBERS.map((m) => {
          const checked = selected.has(m.id);
          return (
            <Pressable key={m.id} style={s.memberRow} onPress={() => toggle(m.id)}>
              <Ionicons
                name={checked ? 'checkbox' : 'square-outline'}
                size={20}
                color={checked ? PURPLE : '#D1D5DB'}
              />
              <View style={s.memberAvatar}>
                <Text style={s.memberAvatarText}>{m.avatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.memberName}>{m.name}</Text>
                <Text style={s.memberSub}>下单 ¥{m.amount}</Text>
              </View>
              <View style={[s.paidBadge, { backgroundColor: m.paid ? '#ECFDF5' : '#FEF2F2' }]}>
                <Text style={[s.paidText, { color: m.paid ? '#059669' : '#EF4444' }]}>
                  {m.paid ? '已付款' : '未付款'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 底部操作栏 */}
      <View style={[s.bottomBar, { paddingBottom: 12 + insets.bottom }]}>
        <Pressable style={s.sendBtn} onPress={handleSend}>
          <Ionicons name="send-outline" size={16} color="#FFF" />
          <Text style={s.sendText}>发送通知（{selected.size}人）</Text>
        </Pressable>
      </View>

      {/* Toast */}
      {!!toastText && (
        <Animated.View
          pointerEvents="none"
          style={[
            s.toast,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
              bottom: 80 + insets.bottom,
            },
          ]}
        >
          <Ionicons name="information-circle" size={16} color="#FFF" />
          <Text style={s.toastText}>{toastText}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 16, fontWeight: '800', color: '#1E1B4B' },

  feeCard: {
    marginHorizontal: 14, marginTop: 8, padding: 16,
    backgroundColor: '#FFF', borderRadius: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  feeLabel: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  feeInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  feePrefix: { fontSize: 22, fontWeight: '800', color: '#F43F5E' },
  feeInput: {
    flex: 1, fontSize: 28, fontWeight: '800', color: '#1E1B4B',
    borderBottomWidth: 2, borderBottomColor: '#E5E7EB', paddingBottom: 4,
  },
  feeSub: { fontSize: 11, color: '#9CA3AF', marginTop: 8, lineHeight: 16 },

  selectBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 14, marginTop: 16, marginBottom: 4,
  },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectAllText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  selectCount: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },

  list: { flex: 1, marginHorizontal: 14 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginTop: 8,
  },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 18 },
  memberName: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  memberSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  paidBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  paidText: { fontSize: 10, fontWeight: '700' },

  bottomBar: {
    paddingHorizontal: 14, paddingTop: 10,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 14,
  },
  sendText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  toast: {
    position: 'absolute', left: 24, right: 24,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 27, 75, 0.92)',
    shadowColor: '#1E1B4B', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 8, zIndex: 999,
  },
  toastText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
});
