import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView, Alert, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PURPLE = '#7C3AED';
const PINK = '#F43F5E';

export default function CreateSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { name, groupId } = useLocalSearchParams<{ name?: string; groupId?: string }>();
  const gid = groupId || 'g1';

  // —— 模拟数据 ——
  const shortLink = `https://zgt.app/g/${gid}`;
  const qrSeed = gid + (name || 'g');

  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [savedTip, setSavedTip] = useState(false);

  // 庆祝插画动画
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [float]);
  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  // —— 操作 ——
  const handleShareToGroup = () => {
    setShareSheetOpen(true);
  };

  const handleShareTo = (channel: string) => {
    setShareSheetOpen(false);
    Alert.alert('已复制链接', `链接已复制到剪贴板，已唤起${channel}（V1 演示形式）\n\n${shortLink}`);
  };

  const handleSaveQR = () => {
    setSavedTip(true);
    setTimeout(() => setSavedTip(false), 2200);
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top + 4 }]}>
      {/* 顶部返回 */}
      <View style={s.topBar}>
        <Pressable hitSlop={10} onPress={() => router.replace('/(main)/' as any)}>
          <Ionicons name="close" size={22} color="#1E1B4B" />
        </Pressable>
        <Text style={s.topTitle}>发布成功</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* —— 庆祝插画 —— */}
        <View style={s.celebrateWrap}>
          <Animated.View style={[s.celebrateBubble, { transform: [{ translateY: floatY }] }]}>
            <LinearGradient
              colors={[PURPLE, PINK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.celebrateGradient}
            >
              <Text style={s.celebrateEmoji}>🎉</Text>
            </LinearGradient>
          </Animated.View>
          <Text style={s.h1}>你的拼团已发布！</Text>
          <Text style={s.h1Sub}>已自动添加到「我发起的」</Text>
        </View>

        {/* —— 二维码 —— */}
        <View style={s.qrCard}>
          <View style={s.qrImgWrap}>
            <FakeQR seed={qrSeed} />
            <View style={s.qrLogo}>
              <Text style={s.qrLogoText}>追</Text>
            </View>
          </View>
          <Text style={s.qrHint}>用微信/QQ 扫一扫，把团分享给好友</Text>
        </View>

        {/* —— 操作按钮 —— */}
        <View style={s.actions}>
          <Pressable style={[s.primaryBtn]} onPress={handleShareToGroup}>
            <LinearGradient
              colors={[PURPLE, '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.primaryBtnGradient}
            >
              <Ionicons name="paper-plane" size={16} color="#FFF" />
              <Text style={s.primaryBtnText}>转发到群</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={s.secondaryBtn} onPress={handleSaveQR}>
            <Ionicons name="download-outline" size={16} color={PURPLE} />
            <Text style={s.secondaryBtnText}>一键保存二维码</Text>
          </Pressable>

          <View style={s.bottomLinks}>
            <Pressable style={s.linkBtn} onPress={() => router.replace(`/group/${gid}` as any)}>
              <Text style={s.linkBtnText}>查看拼团</Text>
              <Ionicons name="chevron-forward" size={12} color={PURPLE} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* —— 转发到群弹层 —— */}
      <Modal visible={shareSheetOpen} transparent animationType="fade" onRequestClose={() => setShareSheetOpen(false)}>
        <Pressable style={modalS.overlay} onPress={() => setShareSheetOpen(false)}>
          <Pressable style={modalS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={modalS.handle} />
            <Text style={modalS.title}>转发到哪？</Text>
            <Text style={modalS.sub}>已自动复制短链到剪贴板</Text>

            <View style={modalS.channelRow}>
              <ChannelItem icon="people-circle" color={PURPLE} bg="#F5F3FF" label="追光小群" onPress={() => handleShareTo('追光小群')} />
              <ChannelItem icon="logo-wechat" color="#07C160" bg="#ECFDF5" label="微信群" onPress={() => handleShareTo('微信群')} />
              <ChannelItem icon="chatbubbles" color="#3B82F6" bg="#EFF6FF" label="QQ 群" onPress={() => handleShareTo('QQ 群')} />
            </View>

            <Pressable style={modalS.cancelBtn} onPress={() => setShareSheetOpen(false)}>
              <Text style={modalS.cancelText}>取消</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 保存提示 Toast */}
      {savedTip && (
        <View style={s.toast} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={s.toastText}>二维码已保存到相册</Text>
        </View>
      )}
    </View>
  );
}

function ChannelItem({ icon, color, bg, label, onPress }: { icon: any; color: string; bg: string; label: string; onPress: () => void }) {
  return (
    <Pressable style={modalS.channelItem} onPress={onPress}>
      <View style={[modalS.channelIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={modalS.channelLabel}>{label}</Text>
    </Pressable>
  );
}

// —— 用一个伪 QR 码（V1 演示用，基于 seed 的网格） ——
function FakeQR({ seed }: { seed: string }) {
  // 用 seed 字符串的 charCode 累积出一个稳定的 11x11 阵列
  const N = 11;
  const cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const idx = r * N + c;
      const v = ((seed.charCodeAt(idx % seed.length) + r * 7 + c * 13) % 7);
      const filled = v >= 3;
      // 四角加大方块（QR finder pattern）
      const corner = (r < 3 && c < 3) || (r < 3 && c >= N - 3) || (r >= N - 3 && c < 3);
      cells.push(
        <View
          key={idx}
          style={{
            width: 14, height: 14, margin: 0,
            backgroundColor: corner || filled ? '#1E1B4B' : 'transparent',
          }}
        />
      );
    }
  }
  return <View style={{ width: 154, height: 154, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#FFF' }}>{cells}</View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  topTitle: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },

  celebrateWrap: { alignItems: 'center', paddingTop: 20, paddingBottom: 16 },
  celebrateBubble: {
    width: 104, height: 104, marginBottom: 18,
    shadowColor: PURPLE, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  celebrateGradient: {
    width: 104, height: 104, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  celebrateEmoji: { fontSize: 50 },
  h1: { fontSize: 22, fontWeight: '800', color: '#1E1B4B', letterSpacing: -0.3 },
  h1Sub: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },

  qrCard: {
    marginHorizontal: 24, marginTop: 16,
    backgroundColor: '#FFF', borderRadius: 20,
    paddingVertical: 24, paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#1E1B4B', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  qrImgWrap: {
    width: 168, height: 168, borderRadius: 18, padding: 7,
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  qrLogo: {
    position: 'absolute', width: 30, height: 30, borderRadius: 8,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF',
  },
  qrLogoText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  qrHint: { fontSize: 11, color: '#9CA3AF', marginTop: 12 },

  actions: { paddingHorizontal: 24, marginTop: 18, gap: 10 },
  primaryBtn: { borderRadius: 24, overflow: 'hidden' },
  primaryBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13,
    borderRadius: 24, backgroundColor: '#FFF',
    borderWidth: 1.5, borderColor: PURPLE,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: PURPLE },

  bottomLinks: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 16, paddingVertical: 10 },
  linkBtnText: { fontSize: 13, fontWeight: '600', color: PURPLE },
  toast: {
    position: 'absolute', top: '45%', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(30,27,75,0.92)', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  toastText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
});

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 14, paddingBottom: 28, paddingHorizontal: 20 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '700', color: '#1E1B4B' },
  sub: { fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 18 },

  channelRow: { flexDirection: 'row', justifyContent: 'space-around' },
  channelItem: { alignItems: 'center', gap: 6 },
  channelIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  channelLabel: { fontSize: 12, fontWeight: '600', color: '#1E1B4B' },

  cancelBtn: { paddingVertical: 14, marginTop: 18, borderRadius: 14, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },

  authSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 14, paddingBottom: 28, paddingHorizontal: 20, maxHeight: '90%' },
  authHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  authIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center' },
  authTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B4B' },
  authSub: { fontSize: 11, color: '#9CA3AF', marginTop: 4, lineHeight: 16 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#1E1B4B', marginTop: 12, marginBottom: 8 },
  fieldInput: {
    backgroundColor: '#F5F5FA', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1E1B4B',
  },

  photoBox: {
    height: 100, borderRadius: 12, backgroundColor: '#F5F5FA',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  photoBoxDone: { backgroundColor: '#ECFDF5', borderColor: '#10B981', borderStyle: 'solid' },
  photoText: { fontSize: 12, fontWeight: '600', color: '#1E1B4B', marginTop: 2 },
  photoSub: { fontSize: 10, color: '#9CA3AF' },

  cancelBtn2: { flex: 1, paddingVertical: 13, borderRadius: 22, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelText2: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  confirmBtn: { flex: 1.5, paddingVertical: 13, borderRadius: 22, alignItems: 'center', backgroundColor: PURPLE },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
