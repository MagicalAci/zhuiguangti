import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { Colors, Radius, Shadow, FontSize } from '../../src/theme';
import { aiGeneratePromo } from '../../src/ai/promoGen';
import * as Clipboard from 'expo-clipboard';

const PLATFORMS = [
  { key: 'xiaohongshu', label: '小红书', icon: '📕', color: '#FF2442' },
  { key: 'qqZone', label: 'QQ空间', icon: '🌟', color: '#12B7F5' },
  { key: 'wechat', label: '微信群', icon: '💬', color: '#07C160' },
  { key: 'plain', label: '纯文本', icon: '📝', color: Colors.textSecondary },
] as const;

export default function PromoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { groups } = useStore();
  const group = groups.find((g) => g.id === id);
  const [selected, setSelected] = useState<string>('xiaohongshu');
  const [generated, setGenerated] = useState<Record<string, string> | null>(null);
  const [copied, setCopied] = useState(false);

  if (!group) return <View style={s.screen}><Text style={{ textAlign: 'center', marginTop: 100 }}>团不存在</Text></View>;

  const handleGenerate = () => {
    const result = aiGeneratePromo(group);
    setGenerated(result as any);
  };

  const handleCopy = async () => {
    if (!generated) return;
    const text = generated[selected];
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('复制失败', '请手动选择文本复制');
    }
  };

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={Colors.text} /></TouchableOpacity>
          <Text style={s.topTitle}>宣传文案</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={[s.heroCard, { backgroundColor: Colors.primary }]}>
          <Text style={{ fontSize: 32 }}>🤖</Text>
          <Text style={s.heroTitle}>AI 生成宣传文案</Text>
          <Text style={s.heroSub}>一键生成适配不同平台的推广文案</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={handleGenerate}>
            <View style={s.generateBtn}>
              <Ionicons name="sparkles" size={18} color={Colors.primary} />
              <Text style={s.generateBtnText}>{generated ? '重新生成' : '生成文案'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {generated && (
          <>
            <Text style={s.sectionTitle}>选择平台</Text>
            <View style={s.platformRow}>
              {PLATFORMS.map((p) => (
                <TouchableOpacity key={p.key} style={[s.platformBtn, selected === p.key && { borderColor: p.color, backgroundColor: `${p.color}10` }]} onPress={() => setSelected(p.key)} activeOpacity={0.7}>
                  <Text style={s.platformIcon}>{p.icon}</Text>
                  <Text style={[s.platformLabel, selected === p.key && { color: p.color, fontWeight: '700' }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.previewCard}>
              <View style={s.previewHeader}>
                <Text style={s.previewTitle}>预览</Text>
                <TouchableOpacity style={[s.copyBtn, copied && s.copyBtnDone]} onPress={handleCopy} activeOpacity={0.7}>
                  <Ionicons name={copied ? 'checkmark' : 'copy'} size={14} color={copied ? Colors.success : Colors.primary} />
                  <Text style={[s.copyBtnText, copied && { color: Colors.success }]}>{copied ? '已复制' : '复制'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.previewText} selectable>{generated[selected]}</Text>
            </View>
          </>
        )}

        {!generated && (
          <View style={s.tipCard}>
            <Ionicons name="bulb" size={18} color={Colors.gold} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.tipTitle}>使用提示</Text>
              <Text style={s.tipText}>AI会根据团名、IP、商品列表、价格自动生成文案。{'\n'}支持小红书、QQ空间、微信群三种风格。{'\n'}生成后可一键复制，直接粘贴到对应平台。</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 12 },
  topTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  heroCard: { borderRadius: Radius.xxl, padding: 28, alignItems: 'center', marginBottom: 20 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 10 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.full, marginTop: 16 },
  generateBtnText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  platformRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  platformBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: Radius.xl, borderWidth: 2, borderColor: Colors.borderLight, backgroundColor: '#FFF' },
  platformIcon: { fontSize: 22 },
  platformLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4, fontWeight: '500' },
  previewCard: { backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 18, ...Shadow.md },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  previewTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.primaryBg },
  copyBtnDone: { backgroundColor: Colors.successBg },
  copyBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  previewText: { fontSize: FontSize.md, color: Colors.text, lineHeight: 24 },
  tipCard: { flexDirection: 'row', backgroundColor: Colors.goldBg, borderRadius: Radius.xl, padding: 16, marginTop: 16 },
  tipTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  tipText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },
});
