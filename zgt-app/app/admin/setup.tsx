import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Modal, Alert, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../src/store/useStore';

const PURPLE = '#7C3AED';
const PINK = '#F43F5E';

// 单团已邀请管理员（mock）
interface AdminMember {
  id: string;
  name: string;
  avatar: string;
  invitedAt: number;
  accepted: boolean;
}
const MOCK_ADMINS: Record<string, AdminMember[]> = {
  g1: [
    { id: 'u1', name: '夏目', avatar: '夏', invitedAt: Date.now() - 86400_000, accepted: true },
    { id: 'u2', name: '阿澈', avatar: '阿', invitedAt: Date.now() - 3600_000, accepted: false },
  ],
};

export default function AdminSetupPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groups } = useStore();

  // 假设当前列表全部为"我发起的团"（与首页保持一致）
  const myGroups = useMemo(
    () => groups.filter((g) => g.stage !== 'completed').slice(0, 12),
    [groups]
  );

  // —— 邀请二维码 Modal ——
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
  const inviteGroup = inviteGroupId ? myGroups.find((g) => g.id === inviteGroupId) : null;

  // —— 管理员名单 Modal ——
  const [listGroupId, setListGroupId] = useState<string | null>(null);
  const listGroup = listGroupId ? myGroups.find((g) => g.id === listGroupId) : null;
  const listAdmins = (listGroupId && MOCK_ADMINS[listGroupId]) || [];

  return (
    <View style={s.screen}>
      {/* —— 顶部 —— */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
        </Pressable>
        <Text style={s.topTitle}>管理员设置</Text>
        <Pressable hitSlop={12} onPress={() => Alert.alert('帮助',
          '为你发起的拼团添加管理员。\n\n管理员可以：\n• 审核团员上传的付款凭证\n• 催款 / 撤排 / 手动分配\n• 发货管理 / 物流跟踪\n\n管理员不能：\n• 解散拼团\n• 修改收款码 / 提现\n• 移除你（团长）')}>
          <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}>
        {/* 说明卡 */}
        <LinearGradient
          colors={[PURPLE, '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.intro}
        >
          <View style={s.introIcon}>
            <Ionicons name="people-circle-outline" size={26} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.introTitle}>请管理员搭把手</Text>
            <Text style={s.introSub}>
              邀请你信任的小伙伴成为管理员 · 帮你审核凭证、催款、发货
              {'\n'}邀请采用「转发到微信」 → 对方扫码加入 → 默认与团长权限一致（解散 / 收款除外）
            </Text>
          </View>
        </LinearGradient>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>选择拼团添加管理员</Text>
          <Text style={s.sectionSub}>当前共 {myGroups.length} 个进行中的团</Text>
        </View>

        {/* 拼团列表 */}
        <View style={s.list}>
          {myGroups.map((g) => {
            const admins = MOCK_ADMINS[g.id] || [];
            const accepted = admins.filter((a) => a.accepted).length;
            return (
              <View key={g.id} style={s.row}>
                <View style={s.rowIcon}>
                  <Ionicons name="car" size={20} color={PURPLE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowName} numberOfLines={1}>{g.name}</Text>
                  <View style={s.rowMetaRow}>
                    <Pressable
                      style={[s.rowMetaBadge, admins.length > 0 ? s.rowMetaBadgeOn : null]}
                      onPress={() => setListGroupId(g.id)}
                      hitSlop={4}
                    >
                      <Ionicons name="people" size={11} color={admins.length > 0 ? PURPLE : '#9CA3AF'} />
                      <Text style={[s.rowMetaText, admins.length > 0 && { color: PURPLE }]}>
                        已邀请 {admins.length} 人{admins.length > 0 ? ` · 接受 ${accepted}` : ''}
                      </Text>
                      {admins.length > 0 && <Ionicons name="chevron-forward" size={10} color={PURPLE} />}
                    </Pressable>
                  </View>
                </View>
                <Pressable style={s.inviteBtn} onPress={() => setInviteGroupId(g.id)}>
                  <Ionicons name="share-social" size={13} color="#FFF" />
                  <Text style={s.inviteBtnText}>去邀请</Text>
                </Pressable>
              </View>
            );
          })}

          {myGroups.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="rocket-outline" size={36} color="#E5E7EB" />
              <Text style={s.emptyText}>暂无进行中的团</Text>
              <Text style={s.emptySub}>请先发起一个拼团再来设置管理员</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* —— 邀请 Modal —— */}
      <Modal visible={!!inviteGroupId} transparent animationType="fade" onRequestClose={() => setInviteGroupId(null)}>
        <Pressable style={mS.overlay} onPress={() => setInviteGroupId(null)}>
          <Pressable style={mS.card} onPress={(e) => e.stopPropagation()}>
            <View style={mS.iconWrap}>
              <Ionicons name="share-social" size={28} color="#FFF" />
            </View>
            <Text style={mS.title}>邀请管理员</Text>
            <Text style={mS.sub} numberOfLines={2}>
              拼团：<Text style={{ color: PURPLE, fontWeight: '700' }}>{inviteGroup?.name ?? ''}</Text>
            </Text>

            {/* 小程序码 */}
            <View style={mS.qrFrame}>
              <FakeMiniprogramQR seed={inviteGroupId ?? ''} />
              <View style={mS.qrLogoWrap}>
                <View style={mS.qrLogo}>
                  <Text style={mS.qrLogoText}>追</Text>
                </View>
              </View>
            </View>
            <Text style={mS.qrHint}>对方微信扫码 → 跳转「追光体」小程序 → 加入管理</Text>

            {/* 邀请文案 */}
            <View style={mS.tplCard}>
              <Text style={mS.tplLabel}>邀请文案（可一键复制）</Text>
              <Text style={mS.tplText}>
                @管理员 我新开了《{inviteGroup?.name ?? '拼团'}》，邀请你帮我打理审核凭证 / 排单 / 催款，长按二维码或点链接进入「追光体」小程序即可加入～
              </Text>
            </View>

            {/* 权限对照 */}
            <View style={mS.permRow}>
              <View style={[mS.permPill, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="checkmark" size={11} color="#10B981" />
                <Text style={[mS.permText, { color: '#065F46' }]}>审核凭证</Text>
              </View>
              <View style={[mS.permPill, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="checkmark" size={11} color="#10B981" />
                <Text style={[mS.permText, { color: '#065F46' }]}>撤排 / 催款</Text>
              </View>
              <View style={[mS.permPill, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="checkmark" size={11} color="#10B981" />
                <Text style={[mS.permText, { color: '#065F46' }]}>发货管理</Text>
              </View>
              <View style={[mS.permPill, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="close" size={11} color="#EF4444" />
                <Text style={[mS.permText, { color: '#7F1D1D' }]}>解散团</Text>
              </View>
              <View style={[mS.permPill, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="close" size={11} color="#EF4444" />
                <Text style={[mS.permText, { color: '#7F1D1D' }]}>改收款码</Text>
              </View>
            </View>

            <View style={mS.btnRow}>
              <Pressable style={mS.cancelBtn} onPress={() => setInviteGroupId(null)}>
                <Text style={mS.cancelText}>关闭</Text>
              </Pressable>
              <Pressable
                style={mS.copyBtn}
                onPress={() => Alert.alert('已复制', '邀请文案已复制到剪贴板，可直接粘贴到微信')}
              >
                <Ionicons name="copy-outline" size={14} color={PURPLE} />
                <Text style={mS.copyBtnText}>复制文案</Text>
              </Pressable>
              <Pressable
                style={mS.shareBtn}
                onPress={() => Alert.alert(
                  '转发到微信',
                  'V1 演示：已唤起微信分享面板，可选择「发送给朋友」或「分享到群聊」'
                )}
              >
                <LinearGradient
                  colors={['#07C160', '#34D399']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={mS.shareInner}
                >
                  <Ionicons name="logo-wechat" size={14} color="#FFF" />
                  <Text style={mS.shareText}>转发到微信</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 已有管理员名单 Modal —— */}
      <Modal visible={!!listGroupId} transparent animationType="slide" onRequestClose={() => setListGroupId(null)}>
        <Pressable style={mS.overlay} onPress={() => setListGroupId(null)}>
          <Pressable style={lS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={lS.handle} />
            <Text style={lS.title}>已邀请的管理员</Text>
            <Text style={lS.sub} numberOfLines={1}>{listGroup?.name ?? ''}</Text>
            <ScrollView style={{ maxHeight: 360, marginTop: 12 }}>
              {listAdmins.length === 0 ? (
                <View style={s.empty}>
                  <Ionicons name="people-outline" size={32} color="#E5E7EB" />
                  <Text style={s.emptyText}>暂未邀请管理员</Text>
                </View>
              ) : listAdmins.map((a) => (
                <View key={a.id} style={lS.row}>
                  <View style={lS.avatar}><Text style={lS.avatarText}>{a.avatar}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={lS.name}>{a.name}</Text>
                    <Text style={lS.meta}>
                      {a.accepted ? '已接受 · ' : '邀请待回应 · '}
                      {formatTime(a.invitedAt)}
                    </Text>
                  </View>
                  {a.accepted ? (
                    <View style={lS.statusOk}><Text style={lS.statusOkText}>在岗</Text></View>
                  ) : (
                    <View style={lS.statusPending}><Text style={lS.statusPendingText}>待回应</Text></View>
                  )}
                  <Pressable
                    style={lS.removeBtn}
                    onPress={() => Alert.alert('移除管理员', `确认移除 ${a.name}？`, [
                      { text: '取消', style: 'cancel' },
                      { text: '确认移除', style: 'destructive' },
                    ])}
                    hitSlop={6}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#9CA3AF" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Pressable
              style={lS.addBtn}
              onPress={() => { setInviteGroupId(listGroupId); setListGroupId(null); }}
            >
              <Ionicons name="add" size={14} color="#FFF" />
              <Text style={lS.addBtnText}>继续邀请</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return `${Math.floor(diff / 86400_000)} 天前`;
}

/* ============ 小程序码 mock ============ */
function FakeMiniprogramQR({ seed }: { seed: string }) {
  const N = 21;
  const s = seed || 'zgt';
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const idx = r * N + c;
      const v = ((s.charCodeAt(idx % s.length) + r * 7 + c * 13) % 7);
      const filled = v >= 3;
      const corner = (r < 3 && c < 3) || (r < 3 && c >= N - 3) || (r >= N - 3 && c < 3);
      cells.push(
        <View
          key={idx}
          style={{
            width: 8, height: 8,
            backgroundColor: corner || filled ? '#1E1B4B' : 'transparent',
          }}
        />
      );
    }
  }
  return <View style={{ width: 168, height: 168, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#FFF' }}>{cells}</View>;
}

/* ============ Styles ============ */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#FFF',
  },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B4B' },

  intro: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 14, marginTop: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 18,
  },
  introIcon: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  introTitle: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  introSub: { color: 'rgba(255,255,255,0.9)', fontSize: 11, marginTop: 4, lineHeight: 16 },

  sectionHeader: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E1B4B' },
  sectionSub: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },

  list: { paddingHorizontal: 14, gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  rowName: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  rowMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rowMetaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  rowMetaBadgeOn: { backgroundColor: '#F5F3FF' },
  rowMetaText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
    backgroundColor: PURPLE,
  },
  inviteBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 4 },
  emptyText: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginTop: 8 },
  emptySub: { fontSize: 11, color: '#9CA3AF' },
});

const mS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 360,
    backgroundColor: '#FFF', borderRadius: 22,
    paddingTop: 14, paddingBottom: 18, paddingHorizontal: 18,
    alignItems: 'stretch',
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 17, fontWeight: '800', color: '#1E1B4B', textAlign: 'center' },
  sub: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 6 },

  qrFrame: {
    alignSelf: 'center',
    marginTop: 12, padding: 10,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    position: 'relative',
  },
  qrLogoWrap: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  qrLogo: { width: 32, height: 32, borderRadius: 10, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF' },
  qrLogoText: { fontSize: 14, fontWeight: '800', color: '#FFF' },

  qrHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },

  tplCard: {
    backgroundColor: '#FAFAFE', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  tplLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '700' },
  tplText: { fontSize: 12, color: '#1E1B4B', marginTop: 6, lineHeight: 18 },

  permRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  permPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 4,
    borderRadius: 8,
  },
  permText: { fontSize: 10, fontWeight: '700' },

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, backgroundColor: '#F3F4F6' },
  cancelText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18,
    backgroundColor: '#F5F3FF',
  },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: PURPLE },
  shareBtn: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  shareInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 11,
  },
  shareText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
});

const lS = StyleSheet.create({
  sheet: {
    width: '100%', maxWidth: 460,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    paddingTop: 14, paddingBottom: 18, paddingHorizontal: 18,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800', color: '#1E1B4B' },
  sub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  avatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800', color: PURPLE },
  name: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  meta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  statusOk: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#ECFDF5', borderRadius: 8 },
  statusOkText: { fontSize: 10, color: '#10B981', fontWeight: '700' },
  statusPending: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#FFFBEB', borderRadius: 8 },
  statusPendingText: { fontSize: 10, color: '#F59E0B', fontWeight: '700' },
  removeBtn: { padding: 4 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    marginTop: 14, paddingVertical: 12, borderRadius: 22,
    backgroundColor: PURPLE,
  },
  addBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
});
