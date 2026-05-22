import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Pressable,
  Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import type { Group } from '../../src/types';
const { width: W } = Dimensions.get('window');
const PURPLE = '#7C3AED';
const PINK = '#F43F5E';
const PLACEHOLDER_IMG = require('../../assets/products/placeholder.jpg');
const CARD_W = (W - 14 * 2 - 8) / 2;

function stageShort(stage: Group['stage']) {
  switch (stage) {
    case 'preparing':            return { text: '准备中', color: '#6B7280', bg: '#F3F4F6' };
    case 'gathering':            return { text: '凑车中', color: '#10B981', bg: '#ECFDF5' };
    case 'gathered':             return { text: '已成团', color: '#059669', bg: '#D1FAE5' };
    case 'recruiting':           return { text: '招募中', color: '#10B981', bg: '#ECFDF5' };
    case 'deposit_collecting':   return { text: '收定金', color: '#F59E0B', bg: '#FFFBEB' };
    case 'full_collecting':      return { text: '收全款', color: '#F59E0B', bg: '#FFFBEB' };
    case 'closed':               return { text: '已截团', color: '#EF4444', bg: '#FEF2F2' };
    case 'final_collecting':     return { text: '收尾款', color: '#F97316', bg: '#FFF7ED' };
    case 'purchasing':           return { text: '采购中', color: '#7C3AED', bg: '#F5F3FF' };
    case 'producing':            return { text: '制作中', color: '#7C3AED', bg: '#F5F3FF' };
    case 'sampling':             return { text: '打样中', color: '#8B5CF6', bg: '#F5F3FF' };
    case 'manufacturing':        return { text: '生产中', color: '#7C3AED', bg: '#F5F3FF' };
    case 'arrived':              return { text: '已到货', color: '#3B82F6', bg: '#EFF6FF' };
    case 'shipping':             return { text: '发货中', color: '#3B82F6', bg: '#EFF6FF' };
    case 'completed':            return { text: '已完成', color: '#6B7280', bg: '#F1F5F9' };
    default:                     return { text: '进行中', color: '#7C3AED', bg: '#F5F3FF' };
  }
}

function typeBadge(type: Group['type']) {
  if (type === 'proxy') return { text: '拼车代购', bg: '#EF4444' };
  if (type === 'custom') return { text: '自制开团', bg: '#7C3AED' };
  return { text: '达人开团', bg: '#3B82F6' };
}

export default function ProfileScreen() {
  const router = useRouter();
  const store = useStore();
  const [settingOpen, setSettingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'idle' | 'group' | 'history'>('activity');

  const myGroups = useMemo(() =>
    store.groups.filter((g) => g.id.startsWith('leader_')).slice(0, 8),
    [store.groups],
  );
  const joinedGroups = useMemo(() =>
    store.groups.filter((g) => g.id.startsWith('member_')).slice(0, 8),
    [store.groups],
  );

  const tabContent = useMemo(() => {
    if (activeTab === 'group') {
      return (
        <View style={s.tabContent}>
          <View style={s.draftCard}>
            <View style={s.draftImgGrid}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={s.draftImgSlot}>
                  <Ionicons name="image-outline" size={20} color="#E5E7EB" />
                </View>
              ))}
            </View>
            <View style={s.draftInfo}>
              <View style={s.draftBadge}><Text style={s.draftBadgeText}>草稿</Text></View>
              <Text style={s.draftTitle} numberOfLines={1}>未命名拼团</Text>
              <Text style={s.draftSub}>尚未发布 · 点击继续编辑</Text>
            </View>
            <View style={s.draftOverlay}>
              <Pressable style={s.draftEditBtn} onPress={() => router.push('/create-group' as any)}>
                <Ionicons name="create-outline" size={16} color="#FFF" />
                <Text style={s.draftEditText}>编辑</Text>
              </Pressable>
            </View>
          </View>
          {myGroups.length > 0 && (
            <View style={s.gridWrap}>
              {myGroups.map((g) => (
                <MiniCard key={g.id} group={g} onPress={() => router.push({ pathname: '/group/[id]' as any, params: { id: g.id, view: 'leader' } })} />
              ))}
            </View>
          )}
        </View>
      );
    }
    if (activeTab === 'history') {
      return (
        <View style={s.tabContent}>
          {joinedGroups.length > 0 ? (
            <View style={s.gridWrap}>
              {joinedGroups.map((g) => (
                <MiniCard key={g.id} group={g} onPress={() => router.push({ pathname: '/group/[id]' as any, params: { id: g.id, view: 'member' } })} />
              ))}
            </View>
          ) : (
            <View style={s.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#E5E7EB" />
              <Text style={s.emptyText}>暂无参团记录</Text>
            </View>
          )}
        </View>
      );
    }
    return (
      <View style={s.tabContent}>
        <View style={s.emptyState}>
          <Ionicons name={activeTab === 'activity' ? 'calendar-outline' : 'cube-outline'} size={48} color="#E5E7EB" />
          <Text style={s.emptyText}>{activeTab === 'activity' ? '暂无活动记录' : '暂无闲置物品'}</Text>
        </View>
      </View>
    );
  }, [activeTab, myGroups, joinedGroups, router]);

  return (
    <View style={s.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        stickyHeaderIndices={[1]}
      >
        {/* [0] —— 可折叠头部区域 —— */}
        <View>
          <LinearGradient
            colors={['#E9D5FF', '#F5F3FF', '#FAFAFE']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={s.header}
          >
            <View style={s.profileRow}>
              <View style={s.avatarWrap}>
                <View style={[s.avatar, { backgroundColor: '#F5F3FF' }]}>
                  <Text style={[s.avatarEmoji, { color: PURPLE }]}>🐱</Text>
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.userName}>去登录</Text>
              </View>
              <Pressable style={s.settingBtn} onPress={() => setSettingOpen(true)} hitSlop={10}>
                <Ionicons name="settings-outline" size={20} color="#6B7280" />
              </Pressable>
            </View>
          </LinearGradient>

          <View style={s.funcCard}>
            <FuncItem icon="logo-yen" label="我的卖出" sub="0" color={PINK} onPress={() => Alert.alert('我的卖出')} />
            <FuncItem icon="download-outline" label="我的买入" sub="0" color="#3B82F6" onPress={() => Alert.alert('我的买入')} />
            <FuncItem icon="wallet-outline" label="我的钱包" color="#F59E0B" onPress={() => Alert.alert('我的钱包')} />
            <FuncItem icon="search-outline" label="我的鉴定" color={PURPLE} onPress={() => Alert.alert('我的鉴定')} />
          </View>

          <Pressable style={s.bannerWrap} onPress={() => Alert.alert('AI 鉴定', '中检、海关互认的 AI 鉴定团体标准')}>
            <LinearGradient colors={[PINK, '#FB7185']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.banner}>
              <View>
                <Text style={s.bannerTitle}>去鉴定</Text>
                <Text style={s.bannerSub}>中检、海关互认的AI鉴定团体标准</Text>
              </View>
              <Text style={{ fontSize: 36 }}>🔍</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* [1] —— Tab 栏（sticky 置顶） —— */}
        <View style={s.tabBarSticky}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
            {(['activity', 'idle', 'group', 'history'] as const).map((t) => {
              const labels = { activity: '我的活动', idle: '我的闲置', group: '我的拼团', history: '参团记录' };
              const active = activeTab === t;
              return (
                <Pressable key={t} style={[s.tab, active && s.tabActive]} onPress={() => setActiveTab(t)}>
                  <Text style={[s.tabText, active && s.tabTextActive]}>{labels[t]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* [2] —— Tab 内容（瀑布流） —— */}
        {tabContent}
      </ScrollView>

      {/* —— 设置弹窗 —— */}
      <Modal visible={settingOpen} transparent animationType="slide" onRequestClose={() => setSettingOpen(false)}>
        <Pressable style={modalS.overlay} onPress={() => setSettingOpen(false)}>
          <Pressable style={settingS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={settingS.handle} />
            <Text style={settingS.title}>设置</Text>
            <SettingRow icon="location" color={PURPLE} bg="#F5F3FF" title="收货地址" sub="管理常用收货地址" onPress={() => { setSettingOpen(false); router.push('/settings/addresses' as any); }} />
            <SettingRow icon="notifications" color={PINK} bg="#FFF1F2" title="消息通知" sub="拼团动态 / 物流通知" badge={3} onPress={() => { setSettingOpen(false); router.push('/settings/messages' as any); }} />
            <View style={{ height: 8 }} />
            <SettingRow icon="shield-checkmark" color="#10B981" bg="#ECFDF5" title="实名认证" sub="用于拉群 / 合规" extra="已认证" onPress={() => Alert.alert('实名认证', '已认证')} />
            <SettingRow icon="help-circle" color="#3B82F6" bg="#EFF6FF" title="帮助中心" sub="常见问题 / 操作指南" onPress={() => Alert.alert('帮助中心')} />
            <SettingRow icon="chatbubble-ellipses" color={PURPLE} bg="#F5F3FF" title="意见反馈" sub="把建议告诉我们" onPress={() => Alert.alert('意见反馈')} />
            <View style={{ height: 8 }} />
            <SettingRow icon="information-circle" color="#3B82F6" bg="#EFF6FF" title="关于追光体" sub="版本 V1.0.0" onPress={() => Alert.alert('关于追光体', 'V1 · 2026.05')} />
            <Pressable style={settingS.logout} onPress={() => { setSettingOpen(false); router.replace('/login' as any); }}>
              <Text style={settingS.logoutText}>退出登录</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MiniCard({ group: g, onPress }: { group: Group; onPress: () => void }) {
  const imgs = (g.products || []).slice(0, 4);
  const extra = (g.products || []).length - 4;
  const st = stageShort(g.stage);
  const tb = typeBadge(g.type);
  const deadline = g.cutoffDate ? new Date(g.cutoffDate) : null;
  const now = new Date();
  const diffMs = deadline ? deadline.getTime() - now.getTime() : 0;
  const daysLeft = diffMs > 0 ? Math.floor(diffMs / 86400000) : 0;
  const hoursLeft = diffMs > 0 ? Math.floor((diffMs % 86400000) / 3600000) : 0;

  return (
    <Pressable style={mc.card} onPress={onPress}>
      <View style={mc.imgGrid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={mc.imgSlot}>
            {i === 3 && extra > 0 ? (
              <View style={mc.imgSlotInner}>
                <Image source={imgs[i]?.image ?? PLACEHOLDER_IMG} style={mc.img} />
                <View style={mc.extraOverlay}>
                  <Text style={mc.extraText}>+{extra}</Text>
                </View>
              </View>
            ) : (
              <Image source={imgs[i]?.image ?? PLACEHOLDER_IMG} style={mc.img} />
            )}
          </View>
        ))}
        <View style={[mc.typeBadge, { backgroundColor: tb.bg }]}>
          <Text style={mc.typeBadgeText}>{tb.text}</Text>
        </View>
      </View>
      <View style={mc.info}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <View style={[mc.stageBadge, { backgroundColor: st.bg }]}>
            <Text style={[mc.stageBadgeText, { color: st.color }]}>{st.text}</Text>
          </View>
          <Text style={mc.title} numberOfLines={1}>{g.name}</Text>
        </View>
        {daysLeft > 0 || hoursLeft > 0 ? (
          <View style={mc.countdownRow}>
            <Ionicons name="time-outline" size={11} color="#F97316" />
            <Text style={mc.countdownText}>还剩{daysLeft}天 {hoursLeft}:{String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, '0')}</Text>
          </View>
        ) : null}
        <View style={mc.bottomRow}>
          <Text style={mc.price}>¥{g.depositAmount ?? g.price ?? 0}</Text>
          <Text style={mc.members}>已拼 {g.memberCount ?? 0} 人</Text>
        </View>
      </View>
    </Pressable>
  );
}

function FuncItem({ icon, label, sub, color, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; color: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.funcItem} activeOpacity={0.7} onPress={onPress}>
      <Ionicons name={icon} size={26} color={color} />
      <Text style={s.funcLabel}>{label}{sub ? ` ${sub}` : ''}</Text>
    </TouchableOpacity>
  );
}

function SettingRow({ icon, color, bg, title, sub, badge, extra, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; color: string; bg: string;
  title: string; sub: string; badge?: number; extra?: string; onPress?: () => void;
}) {
  return (
    <Pressable style={settingS.row} onPress={onPress}>
      <View style={[settingS.icon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={settingS.rowTitle}>{title}</Text>
        <Text style={settingS.rowSub}>{sub}</Text>
      </View>
      {badge ? (
        <View style={settingS.badge}><Text style={settingS.badgeText}>{badge}</Text></View>
      ) : null}
      {extra ? <Text style={[settingS.extra, { color }]}>{extra}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color="#C4C4D4" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },

  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16 },
  settingBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { alignItems: 'center' },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF',
  },
  avatarEmoji: { fontSize: 30 },
  userName: { fontSize: 18, fontWeight: '800', color: '#1E1B4B' },
  userSub: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },

  funcCard: {
    flexDirection: 'row', marginHorizontal: 14, marginTop: 10,
    backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 16,
    shadowColor: '#1E1B4B', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  funcItem: { flex: 1, alignItems: 'center', gap: 6 },
  funcLabel: { fontSize: 11, fontWeight: '600', color: '#374151' },

  bannerWrap: { marginHorizontal: 14, marginTop: 12 },
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16,
  },
  bannerTitle: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  bannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 4 },

  tabBarSticky: {
    backgroundColor: '#FAFAFE',
    paddingTop: 10, paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  tabRow: {
    flexDirection: 'row', paddingHorizontal: 14, gap: 8,
  },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 18, borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  tabActive: { borderColor: PINK, backgroundColor: '#FFF1F2' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: PINK, fontWeight: '800' },

  tabContent: { marginHorizontal: 14, marginTop: 10 },
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, backgroundColor: '#FFF', borderRadius: 16,
  },
  emptyText: { fontSize: 13, color: '#C4C4D4', marginTop: 10, fontWeight: '600' },

  draftCard: {
    width: CARD_W, backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#F3F4F6', borderStyle: 'dashed',
    position: 'relative',
  },
  draftImgGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  draftImgSlot: {
    width: '50%', aspectRatio: 1,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  draftInfo: {
    padding: 8, gap: 2,
  },
  draftBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  draftBadgeText: { fontSize: 10, fontWeight: '700', color: '#F97316' },
  draftTitle: { fontSize: 12, fontWeight: '700', color: '#1E1B4B' },
  draftSub: { fontSize: 10, color: '#9CA3AF' },
  draftOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 14,
  },
  draftEditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: PURPLE, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
  },
  draftEditText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});

const mc = StyleSheet.create({
  card: { width: CARD_W, backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', marginBottom: 2 },
  imgGrid: { flexDirection: 'row', flexWrap: 'wrap', position: 'relative' },
  imgSlot: { width: '50%', aspectRatio: 1 },
  imgSlotInner: { flex: 1, position: 'relative' },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  extraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  extraText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  typeBadge: {
    position: 'absolute', top: 6, left: 6,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  typeBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFF' },
  info: { padding: 8, gap: 2 },
  stageBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  stageBadgeText: { fontSize: 10, fontWeight: '700' },
  title: { fontSize: 12, fontWeight: '700', color: '#1E1B4B', flex: 1 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countdownText: { fontSize: 10, color: '#F97316', fontWeight: '600' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  price: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
  members: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
});

const modalS = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(30,27,75,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
});

const settingS = StyleSheet.create({
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 14, paddingBottom: 28, paddingHorizontal: 16,
    maxHeight: '80%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800', color: '#1E1B4B', marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 6, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  rowSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  badge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#F43F5E', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  extra: { fontSize: 12, fontWeight: '700', marginRight: 4 },
  logout: {
    marginTop: 14, paddingVertical: 12, borderRadius: 16,
    backgroundColor: '#FEF2F2', alignItems: 'center',
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});
