import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRole } from '../../src/store/useRole';

const PURPLE = '#7C3AED';
const PINK = '#F43F5E';

interface ChatMsg {
  id: string;
  fromName: string;
  fromAvatar: string;
  isMine?: boolean;
  isLeader?: boolean;
  isSystem?: boolean;
  text: string;
  time: number;
}

const MEMBER_AVATARS: Record<string, string> = {
  '星月': '星', '七七': '七', '小鹿': '鹿', '柚子': '柚', '棉花糖': '棉',
};

function buildMockChat(myRoleIsLeader: boolean): { groupName: string; rowIdx: number; messages: ChatMsg[]; members: string[] } {
  const now = Date.now();
  const messages: ChatMsg[] = [
    {
      id: 'c0', isSystem: true, fromName: '系统', fromAvatar: '系',
      text: '本群由「行 #3 凑齐拼团」自动创建 · 成员：团长 + 5 位团员',
      time: now - 60 * 60_000,
    },
    {
      id: 'c1', fromName: '团长', fromAvatar: '团', isLeader: true, isMine: myRoleIsLeader,
      text: '欢迎各位入群～本团已凑齐，请大家在 24h 内完成支付，付完款我会统一审核~',
      time: now - 55 * 60_000,
    },
    {
      id: 'c2', fromName: '星月', fromAvatar: '星', isMine: !myRoleIsLeader,
      text: '收到团长！我马上去支付',
      time: now - 54 * 60_000,
    },
    {
      id: 'c3', fromName: '七七', fromAvatar: '七',
      text: '请问邮费是江浙沪 7 元还是 8 元？我在杭州~',
      time: now - 40 * 60_000,
    },
    {
      id: 'c4', fromName: '团长', fromAvatar: '团', isLeader: true, isMine: myRoleIsLeader,
      text: '@七七 江浙沪是 ¥7，下单时会自动判断哒',
      time: now - 38 * 60_000,
    },
    {
      id: 'c5', fromName: '柚子', fromAvatar: '柚',
      text: '已付！👏👏',
      time: now - 20 * 60_000,
    },
    {
      id: 'c6', fromName: '小鹿', fromAvatar: '鹿',
      text: '请问大概什么时候发货呀？',
      time: now - 12 * 60_000,
    },
    {
      id: 'c7', fromName: '团长', fromAvatar: '团', isLeader: true, isMine: myRoleIsLeader,
      text: '@小鹿 货预计 3 天后到我手里，到货当天就分拣发出 ~',
      time: now - 10 * 60_000,
    },
    {
      id: 'c8', fromName: '棉花糖', fromAvatar: '棉',
      text: '辛苦团长～',
      time: now - 5 * 60_000,
    },
  ];
  return {
    groupName: '恋与深空 角色香薰蜡烛团',
    rowIdx: 3,
    messages,
    members: ['团长', '星月', '七七', '小鹿', '柚子', '棉花糖'],
  };
}

function fmtTime(t: number) {
  const diff = Date.now() - t;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}小时前`;
  return new Date(t).toLocaleString();
}

export default function GroupChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { role } = useRole();
  const myRoleIsLeader = role === 'leader';
  const meta = buildMockChat(myRoleIsLeader);

  const [messages, setMessages] = useState<ChatMsg[]>(meta.messages);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
  }, []);

  const send = () => {
    if (!input.trim()) return;
    const next: ChatMsg = {
      id: `me_${Date.now()}`,
      fromName: myRoleIsLeader ? '团长' : '我',
      fromAvatar: myRoleIsLeader ? '团' : '我',
      isLeader: myRoleIsLeader,
      isMine: true,
      text: input.trim(),
      time: Date.now(),
    };
    setMessages((m) => [...m, next]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.screen}
    >
      {/* —— 顶栏 —— */}
      <LinearGradient
        colors={['#0EA5E9', '#38BDF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.topRow}>
          <Pressable style={s.iconBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={s.title} numberOfLines={1}>群聊 · {meta.groupName}</Text>
            <Text style={s.subTitle}>第 {meta.rowIdx} 行 · {meta.members.length} 位成员</Text>
          </View>
          <Pressable
            style={s.iconBtn}
            onPress={() => Alert.alert('群成员', meta.members.map((m, i) => `${i + 1}. ${m}`).join('\n'))}
            hitSlop={10}
          >
            <Ionicons name="people" size={18} color="#FFF" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* —— 系统提示 —— */}
      <View style={s.sysBanner}>
        <Ionicons name="information-circle-outline" size={11} color="#0369A1" />
        <Text style={s.sysBannerText}>
          成团自动建群 · 群消息会自动同步到「设置 → 消息」中
        </Text>
      </View>

      {/* —— 消息列表 —— */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 24 }}
      >
        {messages.map((m) => {
          if (m.isSystem) {
            return (
              <View key={m.id} style={s.systemBubble}>
                <Text style={s.systemText}>{m.text}</Text>
                <Text style={s.systemTime}>{fmtTime(m.time)}</Text>
              </View>
            );
          }
          return (
            <View key={m.id} style={[s.msgRow, m.isMine && s.msgRowMine]}>
              {!m.isMine && (
                <View style={[s.avatar, m.isLeader && s.avatarLeader]}>
                  <Text style={[s.avatarText, m.isLeader && { color: '#FFF' }]}>{m.fromAvatar}</Text>
                </View>
              )}
              <View style={[s.msgBubbleWrap, m.isMine && { alignItems: 'flex-end' }]}>
                <View style={s.msgNameRow}>
                  {m.isLeader && (
                    <View style={s.leaderTag}>
                      <Ionicons name="ribbon" size={9} color="#FFF" />
                      <Text style={s.leaderTagText}>团长</Text>
                    </View>
                  )}
                  <Text style={s.msgName}>{m.fromName}</Text>
                  <Text style={s.msgTime}>{fmtTime(m.time)}</Text>
                </View>
                <View style={[s.bubble, m.isMine ? s.bubbleMine : s.bubbleOther, m.isLeader && !m.isMine && s.bubbleLeader]}>
                  <Text style={[s.bubbleText, m.isMine && s.bubbleTextMine]}>
                    {renderWithMention(m.text)}
                  </Text>
                </View>
              </View>
              {m.isMine && (
                <View style={[s.avatar, m.isLeader && s.avatarLeader]}>
                  <Text style={[s.avatarText, m.isLeader && { color: '#FFF' }]}>{m.fromAvatar}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* —— 输入栏 —— */}
      <View style={[s.inputBar, { paddingBottom: 10 + insets.bottom }]}>
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            placeholder="发条消息…"
            placeholderTextColor="#C4C4D4"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
          />
        </View>
        <TouchableOpacity
          style={[s.sendBtn, !input.trim() && { opacity: 0.4 }]}
          activeOpacity={0.85}
          disabled={!input.trim()}
          onPress={send}
        >
          <Ionicons name="send" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// —— @人 着色 ——
function renderWithMention(text: string): React.ReactNode {
  const parts = text.split(/(@[\u4e00-\u9fa5\w]+)/g);
  return parts.map((seg, i) => {
    if (seg.startsWith('@')) {
      return <Text key={i} style={{ color: PURPLE, fontWeight: '700' }}>{seg}</Text>;
    }
    return <Text key={i}>{seg}</Text>;
  });
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0F9FF' },
  header: {
    paddingHorizontal: 16, paddingBottom: 14,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  subTitle: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  sysBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 14, paddingVertical: 6,
  },
  sysBannerText: { fontSize: 10.5, color: '#0369A1', fontWeight: '600' },

  msgRow: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-end',
  },
  msgRowMine: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0F2FE',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLeader: { backgroundColor: PINK, borderColor: PINK },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#0EA5E9' },

  msgBubbleWrap: { flex: 1, gap: 3 },
  msgNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  msgName: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  msgTime: { fontSize: 10, color: '#9CA3AF' },
  leaderTag: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6,
    backgroundColor: PINK,
  },
  leaderTagText: { fontSize: 9, color: '#FFF', fontWeight: '700' },

  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 14,
  },
  bubbleOther: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 4,
  },
  bubbleLeader: {
    backgroundColor: '#FFF1F2',
  },
  bubbleMine: {
    backgroundColor: '#0EA5E9',
    borderTopRightRadius: 4,
  },
  bubbleText: { fontSize: 13, color: '#1E1B4B', lineHeight: 19 },
  bubbleTextMine: { color: '#FFF' },

  systemBubble: {
    alignSelf: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, backgroundColor: '#E0E7FF',
    maxWidth: '90%', alignItems: 'center',
  },
  systemText: { fontSize: 11, color: '#3730A3', fontWeight: '600', textAlign: 'center' },
  systemTime: { fontSize: 9, color: '#6366F1', marginTop: 2 },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingTop: 8,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  inputWrap: {
    flex: 1,
    backgroundColor: '#F5F5FA', borderRadius: 18,
    paddingHorizontal: 14,
  },
  input: { fontSize: 13, color: '#1E1B4B', paddingVertical: 10 },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#0EA5E9',
    alignItems: 'center', justifyContent: 'center',
  },
});
