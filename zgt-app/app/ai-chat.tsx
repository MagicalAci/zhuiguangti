import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';
import { useRole } from '../src/store/useRole';
import { Colors, Radius, FontSize } from '../src/theme';
import { aiChat, getQuickReplies } from '../src/ai/chatbot';
import { ChatMessage } from '../src/types';

export default function AIChatScreen() {
  const params = useLocalSearchParams<{ groupId?: string; orderId?: string }>();
  const router = useRouter();
  const { role } = useRole();
  const { groups, orders } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const group = params.groupId ? groups.find((g) => g.id === params.groupId) : undefined;
  const order = params.orderId ? orders.find((o) => o.id === params.orderId) : undefined;
  const quickReplies = getQuickReplies(role);

  useEffect(() => {
    const welcome = aiChat('', { group, order, role });
    setMessages([welcome]);
  }, []);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', text: text.trim(), timestamp: Date.now() };
    const aiReply = aiChat(text.trim(), { group, order, role });
    setMessages((prev) => [...prev, userMsg, aiReply]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* 头部 */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>AI 智能客服</Text>
          <Text style={s.headerSub}>{role === 'leader' ? '帮你自动回复团员问题' : '随时为你解答'}</Text>
        </View>
        <View style={s.headerAvatar}><Text style={{ fontSize: 18 }}>🤖</Text></View>
      </View>

      {/* 消息列表 */}
      <ScrollView ref={scrollRef} style={s.chatArea} contentContainerStyle={s.chatContent} showsVerticalScrollIndicator={false}>
        {messages.map((msg) => (
          <View key={msg.id} style={msg.role === 'user' ? s.rowUser : s.rowAi}>
            {msg.role === 'ai' && <View style={s.aiIcon}><Text style={{ fontSize: 14 }}>🤖</Text></View>}
            <View style={msg.role === 'user' ? s.bubbleUser : s.bubbleAi}>
              <Text style={msg.role === 'user' ? s.textUser : s.textAi}>{msg.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 快捷回复 */}
      <View style={s.quickWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRow}>
          {quickReplies.map((q, i) => (
            <TouchableOpacity key={i} style={s.quickChip} onPress={() => send(q)} activeOpacity={0.7}>
              <Text style={s.quickText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 输入区 */}
      <View style={s.inputBar}>
        <TextInput
          style={s.inputField}
          value={input}
          onChangeText={setInput}
          placeholder="输入你的问题..."
          placeholderTextColor={Colors.textTertiary}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[s.sendBtn, !input.trim() && { opacity: 0.35 }]}
          onPress={() => send(input)}
          activeOpacity={0.7}
          disabled={!input.trim()}
        >
          <View style={s.sendBtnInner}>
            <Ionicons name="send" size={18} color="#FFF" />
          </View>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },

  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  chatArea: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 8 },

  rowUser: { flexDirection: 'row-reverse', marginBottom: 14 },
  rowAi: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start' },
  aiIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 2 },

  bubbleUser: { maxWidth: '75%', backgroundColor: Colors.primary, borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleAi: { maxWidth: '75%', backgroundColor: '#FFF', borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  textUser: { fontSize: 15, color: '#FFF', lineHeight: 22 },
  textAi: { fontSize: 15, color: Colors.text, lineHeight: 22 },

  quickWrap: { borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: '#FFF' },
  quickRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  quickChip: { height: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryBg },
  quickText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  inputBar: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 34 : 14, backgroundColor: '#FFF', gap: 10, alignItems: 'center' },
  inputField: { flex: 1, backgroundColor: Colors.bgMuted, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: Colors.text, height: 44 },
  sendBtn: {},
  sendBtnInner: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
