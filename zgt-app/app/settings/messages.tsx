import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRole } from '../../src/store/useRole';

const PURPLE = '#7C3AED';
const PINK = '#F43F5E';

// —— 团员可收消息类型 ——
type MemberMsgType = 'pay' | 'final' | 'matrix' | 'ship' | 'review' | 'chat' | 'system';
// —— 团长可收消息类型（来自团员行为 + 群聊） ——
type LeaderMsgType = 'review' | 'urgeShip' | 'leaveReq' | 'newMember' | 'paid' | 'chat' | 'system';

type MsgType = MemberMsgType | LeaderMsgType;

interface Msg {
  id: string;
  type: MsgType;
  title: string;
  content: string;
  groupName?: string;
  fromMember?: string;     // 团长视角下显示来自哪个团员
  fromMemberAvatar?: string;
  time: number;
  unread?: boolean;
  cta?: { label: string; route?: string };
  pushed?: boolean;
}

const MEMBER_TYPE_CFG: Record<MemberMsgType, { label: string; color: string; bg: string; icon: any }> = {
  pay:    { label: '催付款',   color: PINK,     bg: '#FFF1F2', icon: 'megaphone' },
  final:  { label: '补尾款',   color: '#F59E0B', bg: '#FFFBEB', icon: 'cash' },
  matrix: { label: '拼团进度', color: PURPLE,   bg: '#F5F3FF', icon: 'grid' },
  ship:   { label: '物流',     color: '#10B981', bg: '#ECFDF5', icon: 'cube' },
  review: { label: '凭证审核', color: '#3B82F6', bg: '#EFF6FF', icon: 'checkmark-done' },
  chat:   { label: '群聊',     color: '#0EA5E9', bg: '#E0F2FE', icon: 'chatbubbles' },
  system: { label: '系统通知', color: '#6B7280', bg: '#F3F4F6', icon: 'information-circle' },
};

const LEADER_TYPE_CFG: Record<LeaderMsgType, { label: string; color: string; bg: string; icon: any }> = {
  review:    { label: '凭证待审',   color: '#3B82F6', bg: '#EFF6FF', icon: 'document-text' },
  urgeShip:  { label: '催发货',     color: PINK,     bg: '#FFF1F2', icon: 'megaphone' },
  leaveReq:  { label: '退团申请',   color: '#F59E0B', bg: '#FFFBEB', icon: 'exit' },
  newMember: { label: '新成员上车', color: PURPLE,   bg: '#F5F3FF', icon: 'people' },
  paid:      { label: '完成付款',   color: '#10B981', bg: '#ECFDF5', icon: 'checkmark-circle' },
  chat:      { label: '群聊',       color: '#0EA5E9', bg: '#E0F2FE', icon: 'chatbubbles' },
  system:    { label: '系统通知',   color: '#6B7280', bg: '#F3F4F6', icon: 'information-circle' },
};

// —— 团员视角 mock 消息 ——
const MEMBER_INIT: Msg[] = [
  {
    id: 'm1', type: 'pay',
    title: '团长催你付款啦',
    content: '「偶像梦幻祭 6月新谷代购团」已成团，请在 24h 内完成支付 ¥56',
    groupName: '偶像梦幻祭 6月新谷代购团',
    time: Date.now() - 12 * 60_000,
    unread: true, pushed: true,
    cta: { label: '去支付', route: '/order/pay' },
  },
  {
    id: 'm2', type: 'matrix',
    title: '你所在的拼团已凑齐一行',
    content: '系统已通知付款 · 请尽快支付以免影响出团',
    groupName: '恋与深空 角色香薰蜡烛团',
    time: Date.now() - 2 * 3600_000,
    unread: true, pushed: true,
    cta: { label: '查看拼团情况', route: '/group/matrix?id=g1' },
  },
  {
    id: 'm3', type: 'final',
    title: '尾款催付提醒',
    content: '「原神 4.5 卡池代抽」尾款 ¥36 即将在明天 23:59 截止',
    groupName: '原神 4.5 卡池代抽',
    time: Date.now() - 6 * 3600_000,
    unread: true, pushed: true,
    cta: { label: '补尾款', route: '/order/pay' },
  },
  {
    id: 'm4', type: 'ship',
    title: '团长已发货',
    content: '顺丰速运 SF1001234567 · 已揽收，请关注物流',
    groupName: '原神 4.5 卡池代抽',
    time: Date.now() - 1 * 86400_000,
    cta: { label: '查看物流', route: '/member/orders-to-receive' },
  },
  {
    id: 'm5', type: 'ship',
    title: '你的款项已平台托管',
    content: '哈啰平台代收 · 团长发货后自动结算 · 资金安全无忧',
    groupName: '偶像梦幻祭 6月新谷代购团',
    time: Date.now() - 2 * 86400_000,
  },
  {
    id: 'm-chat-1', type: 'chat',
    title: '【群聊·恋与深空 角色香薰团】拼成自动建群',
    content: '团长：欢迎本行 5 位团员入群 · 请尽快支付，48h 内统一寄出',
    groupName: '恋与深空 角色香薰蜡烛团',
    time: Date.now() - 18 * 60_000,
    unread: true,
    pushed: true,
    cta: { label: '查看群聊', route: '/group/chat?id=g_chat_1' },
  },
  {
    id: 'm-chat-2', type: 'chat',
    title: '【群聊·偶像梦幻祭 6月新谷代购团】',
    content: '七七：尾款到账了 · 团长：收到，明天发货',
    groupName: '偶像梦幻祭 6月新谷代购团',
    time: Date.now() - 3 * 3600_000,
    cta: { label: '查看群聊', route: '/group/chat?id=g_chat_2' },
  },
  {
    id: 'm6', type: 'system',
    title: '系统升级公告',
    content: 'V1.0.1 更新：新增手动分配 / 收货地址管理 / 成团自动建群',
    time: Date.now() - 3 * 86400_000,
  },
];

// —— 团长视角 mock 消息（全部来自团员行为） ——
const LEADER_INIT: Msg[] = [
  {
    id: 'l1', type: 'paid',
    title: '星月 已完成平台支付',
    content: '订单金额 ¥56 · 哈啰平台已托管 · 等你发货',
    fromMember: '星月', fromMemberAvatar: '星',
    groupName: '偶像梦幻祭 6月新谷代购团',
    time: Date.now() - 8 * 60_000,
    unread: true, pushed: true,
    cta: { label: '去发货', route: '/group/shipping' },
  },
  {
    id: 'l2', type: 'paid',
    title: '七七 已完成补邮费',
    content: '补邮金额 ¥8 · 平台托管 · 自动累计到该团应发款项',
    fromMember: '七七', fromMemberAvatar: '七',
    groupName: '恋与深空 角色香薰蜡烛团',
    time: Date.now() - 25 * 60_000,
    unread: true, pushed: true,
    cta: { label: '查看订单', route: '/orders/in-progress' },
  },
  {
    id: 'l3', type: 'urgeShip',
    title: '小鹿 催你发货',
    content: '「她已在 #3 行等待 2 天」请尽快安排发货',
    fromMember: '小鹿', fromMemberAvatar: '鹿',
    groupName: '原神 4.5 卡池代抽',
    time: Date.now() - 1 * 3600_000,
    unread: true, pushed: true,
    cta: { label: '去发货', route: '/group/shipping' },
  },
  {
    id: 'l4', type: 'newMember',
    title: '柚子 加入拼团',
    content: '选择「秦彻 香薰蜡烛 ×1」· 已占 #4 行',
    fromMember: '柚子', fromMemberAvatar: '柚',
    groupName: '恋与深空 角色香薰蜡烛团',
    time: Date.now() - 2 * 3600_000,
    cta: { label: '查看拼团情况', route: '/group/matrix?id=g1' },
  },
  {
    id: 'l5', type: 'paid',
    title: '棉花糖 完成付款',
    content: '已支付 ¥120 · 等待你发货',
    fromMember: '棉花糖', fromMemberAvatar: '棉',
    groupName: '原神 4.5 卡池代抽',
    time: Date.now() - 5 * 3600_000,
    cta: { label: '查看订单', route: '/orders/in-progress' },
  },
  {
    id: 'l6', type: 'leaveReq',
    title: '阿澈 申请退团',
    content: '理由：「找到更便宜的渠道」· 拼团尚未成团，可同意退团',
    fromMember: '阿澈', fromMemberAvatar: '阿',
    groupName: '偶像梦幻祭 6月新谷代购团',
    time: Date.now() - 1 * 86400_000,
    cta: { label: '去处理', route: '/group/matrix?id=g1' },
  },
  {
    id: 'l-chat-1', type: 'chat',
    title: '【群聊·恋与深空 角色香薰团】行 #3 拼成自动建群',
    content: '系统：已自动创建群「恋与深空 · 第 3 行」· 你（团长）+ 5 位团员已入群',
    groupName: '恋与深空 角色香薰蜡烛团',
    time: Date.now() - 18 * 60_000,
    unread: true,
    pushed: true,
    cta: { label: '查看群聊', route: '/group/chat?id=g_chat_1' },
  },
  {
    id: 'l-chat-2', type: 'chat',
    title: '【群聊·偶像梦幻祭 6月新谷代购团】',
    content: '七七：尾款到账了 · 你：收到，明天发货',
    groupName: '偶像梦幻祭 6月新谷代购团',
    time: Date.now() - 2 * 3600_000,
    cta: { label: '查看群聊', route: '/group/chat?id=g_chat_2' },
  },
  {
    id: 'l-chat-3', type: 'chat',
    title: '【群聊·原神 4.5 卡池代抽】小鹿 @你',
    content: '小鹿：@团长 我的物流不动了 · 你回复一下',
    groupName: '原神 4.5 卡池代抽',
    time: Date.now() - 6 * 3600_000,
    unread: true,
    cta: { label: '查看群聊', route: '/group/chat?id=g_chat_3' },
  },
  {
    id: 'l7', type: 'system',
    title: '系统升级公告',
    content: 'V1.0.1 更新：新增手动分配 / 凭证审核 AI 比对 / 成团自动建群',
    time: Date.now() - 3 * 86400_000,
  },
];

function fmtTime(t: number) {
  const diff = Date.now() - t;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}小时前`;
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)}天前`;
  return new Date(t).toLocaleDateString();
}

export default function MessageCenterPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useRole();
  const isLeader = role === 'leader';

  const TYPE_CFG = isLeader ? (LEADER_TYPE_CFG as any) : (MEMBER_TYPE_CFG as any);
  const TYPE_KEYS: MsgType[] = isLeader
    ? (['review', 'urgeShip', 'leaveReq', 'newMember', 'paid', 'chat', 'system'] as LeaderMsgType[])
    : (['pay', 'final', 'matrix', 'ship', 'review', 'chat', 'system'] as MemberMsgType[]);

  const [list, setList] = useState<Msg[]>(isLeader ? LEADER_INIT : MEMBER_INIT);
  const [filter, setFilter] = useState<'all' | MsgType>('all');
  const [pushOpen, setPushOpen] = useState(false);

  // 切角色时重置数据
  React.useEffect(() => {
    setList(isLeader ? LEADER_INIT : MEMBER_INIT);
    setFilter('all');
  }, [isLeader]);

  const filtered = useMemo(
    () => filter === 'all' ? list : list.filter((m) => m.type === filter),
    [filter, list],
  );
  const unreadCount = list.filter((m) => m.unread).length;
  const pushedCount = list.filter((m) => m.pushed).length;

  const markAllRead = () => setList((prev) => prev.map((m) => ({ ...m, unread: false })));
  const openMsg = (m: Msg) => {
    setList((prev) => prev.map((x) => x.id === m.id ? { ...x, unread: false } : x));
    if (m.cta?.route) router.push(m.cta.route as any);
  };

  // 推送开关：按 role 动态生成
  const [pushSettings, setPushSettings] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    TYPE_KEYS.forEach((k) => { init[k] = k !== 'system'; });
    return init;
  });
  React.useEffect(() => {
    const init: Record<string, boolean> = {};
    TYPE_KEYS.forEach((k) => { init[k] = k !== 'system'; });
    setPushSettings(init);
  }, [isLeader]);

  return (
    <View style={s.screen}>
      {/* —— 顶栏 —— */}
      <LinearGradient
        colors={isLeader ? [PINK, '#FB7185'] : [PURPLE, '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.topRow}>
          <Pressable style={s.iconBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.title}>消息中心</Text>
            <View style={s.roleTag}>
              <Ionicons name={isLeader ? 'ribbon' : 'people'} size={9} color="#FFF" />
              <Text style={s.roleTagText}>{isLeader ? '团长视角' : '团员视角'}</Text>
            </View>
          </View>
          <Pressable style={s.iconBtn} onPress={() => setPushOpen((v) => !v)} hitSlop={10}>
            <Ionicons name="settings-outline" size={18} color="#FFF" />
          </Pressable>
        </View>
        <View style={s.headerStats}>
          <Text style={s.headerStatNum}>{unreadCount}</Text>
          <Text style={s.headerStatLabel}>
            条未读 · {isLeader
              ? `团员动态全收纳 · 已推送至微信 ${pushedCount} 条`
              : `已自动推送至微信 ${pushedCount} 条`}
          </Text>
        </View>
        <View style={s.wechatRow}>
          <Ionicons name="logo-wechat" size={11} color="#FFF" />
          <Text style={s.wechatText}>
            {isLeader
              ? '已绑定微信「追光的小七」· 团员有动作时立即微信通知你'
              : '已绑定微信「追光的小七」· 重要消息会自动推送到微信'}
          </Text>
        </View>
      </LinearGradient>

      {/* —— 微信推送设置展开 —— */}
      {pushOpen && (
        <View style={s.pushCard}>
          <Text style={s.pushTitle}>微信推送设置</Text>
          {TYPE_KEYS.map((k) => (
            <View key={k} style={s.pushRow}>
              <View style={[s.pushIcon, { backgroundColor: TYPE_CFG[k].bg }]}>
                <Ionicons name={TYPE_CFG[k].icon} size={14} color={TYPE_CFG[k].color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.pushLabel}>{TYPE_CFG[k].label}</Text>
                <Text style={s.pushSub}>
                  {!isLeader && k === 'pay'    && '团长催付款时立即推送'}
                  {!isLeader && k === 'final'  && '尾款截止前 24h 推送'}
                  {!isLeader && k === 'matrix' && '拼团满行 / 凑齐时推送'}
                  {!isLeader && k === 'ship'   && '团长发货 / 派送中推送'}
                  {!isLeader && k === 'review' && '凭证审核结果推送'}
                  {!isLeader && k === 'chat'   && '成团自动建群 · 群内有 @ 你时推送'}
                  {!isLeader && k === 'system' && '系统升级 / 公告'}
                  {isLeader && k === 'review'    && '团员上传凭证立即推送'}
                  {isLeader && k === 'urgeShip'  && '团员催发货时立即推送'}
                  {isLeader && k === 'leaveReq'  && '团员申请退团时立即推送'}
                  {isLeader && k === 'newMember' && '有新团员上车时推送'}
                  {isLeader && k === 'paid'      && '团员完成付款时推送'}
                  {isLeader && k === 'chat'      && '群内有 @ 你 / 关键词时推送'}
                  {isLeader && k === 'system'    && '系统升级 / 公告'}
                </Text>
              </View>
              <Switch
                value={!!pushSettings[k]}
                onValueChange={(v) => setPushSettings((p) => ({ ...p, [k]: v }))}
                trackColor={{ true: PURPLE, false: '#E5E7EB' }}
                thumbColor="#FFF"
              />
            </View>
          ))}
        </View>
      )}

      {/* —— 顶部筛选 —— */}
      <View style={s.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 6 }}>
          <FilterPill label={`全部 ${list.length}`} active={filter === 'all'} onPress={() => setFilter('all')} />
          {TYPE_KEYS.map((k) => {
            const cnt = list.filter((m) => m.type === k).length;
            if (cnt === 0) return null;
            return (
              <FilterPill
                key={k}
                label={`${TYPE_CFG[k].label} ${cnt}`}
                active={filter === k}
                onPress={() => setFilter(k)}
              />
            );
          })}
        </ScrollView>

        {unreadCount > 0 && (
          <TouchableOpacity style={s.readAllBtn} onPress={markAllRead}>
            <Ionicons name="checkmark-done" size={12} color={PURPLE} />
            <Text style={s.readAllText}>全部已读</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 30 + insets.bottom, gap: 10 }}>
        {filtered.map((m) => {
          const cfg = TYPE_CFG[m.type];
          return (
            <Pressable key={m.id} style={[s.msgCard, m.unread && s.msgCardUnread]} onPress={() => openMsg(m)}>
              {/* 团长视角下若该消息来自具体团员，左侧展示团员头像；否则展示类型图标 */}
              {isLeader && m.fromMember ? (
                <View style={s.memberAvatarWrap}>
                  <View style={[s.memberAvatar, { backgroundColor: cfg.color }]}>
                    <Text style={s.memberAvatarText}>{m.fromMemberAvatar}</Text>
                  </View>
                  <View style={[s.subTypeIcon, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={9} color={cfg.color} />
                  </View>
                </View>
              ) : (
                <View style={[s.msgIcon, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                </View>
              )}

              <View style={{ flex: 1, gap: 4 }}>
                <View style={s.msgHead}>
                  <Text style={s.msgTitle} numberOfLines={1}>{m.title}</Text>
                  {m.unread && <View style={s.unreadDot} />}
                </View>
                <Text style={s.msgContent} numberOfLines={2}>{m.content}</Text>
                {m.groupName && (
                  <View style={s.groupRow}>
                    <Ionicons name="cube-outline" size={10} color="#9CA3AF" />
                    <Text style={s.groupText} numberOfLines={1}>{m.groupName}</Text>
                  </View>
                )}
                <View style={s.msgFoot}>
                  <Text style={s.time}>{fmtTime(m.time)}</Text>
                  {m.pushed && (
                    <View style={s.pushTag}>
                      <Ionicons name="logo-wechat" size={9} color="#10B981" />
                      <Text style={s.pushTagText}>已推送至微信</Text>
                    </View>
                  )}
                  {m.cta && (
                    <View style={s.ctaPill}>
                      <Text style={s.ctaText}>{m.cta.label}</Text>
                      <Ionicons name="chevron-forward" size={10} color={PURPLE} />
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}

        {filtered.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={36} color="#E5E7EB" />
            <Text style={s.emptyText}>暂无消息</Text>
            <Text style={s.emptySub}>
              {isLeader ? '团员有动作时会自动汇集在这里' : '团长通知 / 物流动态会显示在这里'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[fp.pill, active && fp.pillActive]} onPress={onPress}>
      <Text style={[fp.pillText, active && fp.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const fp = StyleSheet.create({
  pill: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 14, backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  pillActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  pillText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  pillTextActive: { color: '#FFF', fontWeight: '700' },
});

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
  roleTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.22)', marginTop: 4,
  },
  roleTagText: { fontSize: 9, color: '#FFF', fontWeight: '700' },
  headerStats: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 },
  headerStatNum: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  headerStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  wechatRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  wechatText: { fontSize: 10, color: 'rgba(255,255,255,0.88)' },

  pushCard: {
    margin: 14, marginBottom: 0,
    backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    shadowColor: '#1E1B4B', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  pushTitle: { fontSize: 13, fontWeight: '800', color: '#1E1B4B', marginBottom: 10 },
  pushRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  pushIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pushLabel: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  pushSub: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },

  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FAFAFE',
  },
  readAllBtn: {
    marginRight: 14, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, backgroundColor: '#F5F3FF',
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  readAllText: { fontSize: 10, color: PURPLE, fontWeight: '700' },

  msgCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF', borderRadius: 14,
    padding: 12,
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  msgCardUnread: { backgroundColor: '#FFFBFC' },
  msgIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // 团长视角：团员头像 + 类型小角标
  memberAvatarWrap: { width: 36, height: 36, position: 'relative' },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  subTypeIcon: {
    position: 'absolute', right: -3, bottom: -3,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FFF',
  },

  msgHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  msgTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: PINK },
  msgContent: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  groupText: { fontSize: 10, color: '#9CA3AF' },
  msgFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  time: { fontSize: 10, color: '#9CA3AF' },
  pushTag: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6,
    backgroundColor: '#ECFDF5',
  },
  pushTagText: { fontSize: 9, color: '#10B981', fontWeight: '700' },
  ctaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: '#F5F3FF', marginLeft: 'auto',
  },
  ctaText: { fontSize: 10, color: PURPLE, fontWeight: '700' },

  empty: { alignItems: 'center', padding: 36 },
  emptyText: { fontSize: 13, color: '#6B7280', marginTop: 10, fontWeight: '600' },
  emptySub: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
});
