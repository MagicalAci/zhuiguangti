import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrefs, PREF_CATEGORIES, CategoryKey, CategoryDef } from '../../src/store/usePrefs';

const { width: W } = Dimensions.get('window');
const PURPLE = '#7C3AED';
const PURPLE_DARK = '#5B21B6';
const PINK = '#F43F5E';

type Step = 'cat' | 'tag';

export default function PreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPrefs } = usePrefs();

  const [step, setStep] = useState<Step>('cat');
  const [activeCats, setActiveCats] = useState<CategoryKey[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const visibleCats: CategoryDef[] = useMemo(
    () => PREF_CATEGORIES.filter((c) => activeCats.includes(c.key)),
    [activeCats]
  );

  const toggleCat = (k: CategoryKey) => {
    setActiveCats((cur) => cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]);
  };

  const toggleTag = (t: string) => {
    setActiveTags((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);
  };

  const handleNext = () => {
    if (step === 'cat') {
      if (activeCats.length === 0) {
        Alert.alert('提示', '至少选择 1 个属性');
        return;
      }
      setStep('tag');
      return;
    }
    if (activeTags.length === 0) {
      Alert.alert('提示', '至少选择 1 个标签');
      return;
    }
    setPrefs(activeTags, activeCats);
    router.replace('/(main)/' as any);
  };

  const handleSkip = () => {
    setPrefs([], []);
    router.replace('/(main)/' as any);
  };

  const handleBack = () => {
    if (step === 'tag') { setStep('cat'); return; }
    try { router.back(); } catch { router.replace('/login' as any); }
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={handleBack} hitSlop={16} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
        </Pressable>
        <Text style={s.headerTitle}>{step === 'cat' ? '选择你的属性' : '选择具体圈子'}</Text>
        <Pressable onPress={handleSkip} hitSlop={10} style={s.skipBtn}>
          <Text style={s.skipText}>跳过</Text>
        </Pressable>
      </View>

      {/* Step Indicator */}
      <View style={s.steps}>
        <View style={[s.stepDot, s.stepDotActive]}>
          <Text style={s.stepNumActive}>1</Text>
        </View>
        <View style={[s.stepLine, step === 'tag' && s.stepLineActive]} />
        <View style={[s.stepDot, step === 'tag' && s.stepDotActive]}>
          <Text style={step === 'tag' ? s.stepNumActive : s.stepNum}>2</Text>
        </View>
      </View>

      {/* Body */}
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* —— Hero —— */}
        <LinearGradient
          colors={[PURPLE, PURPLE_DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <Text style={s.heroEmoji}>{step === 'cat' ? '🎯' : '✨'}</Text>
          <Text style={s.heroTitle}>
            {step === 'cat' ? '你的兴趣是什么？' : '想关注哪些圈子？'}
          </Text>
          <Text style={s.heroSub}>
            {step === 'cat'
              ? '选择 1 个或多个，后续首页会优先推荐你感兴趣的拼团'
              : `已选 ${activeTags.length} 个 · 至少选 1 个，进入后还可在「谷团」首页修改`}
          </Text>
        </LinearGradient>

        {/* —— Step 1: Category —— */}
        {step === 'cat' && (
          <View style={s.catGrid}>
            {PREF_CATEGORIES.map((c) => {
              const sel = activeCats.includes(c.key);
              return (
                <Pressable
                  key={c.key}
                  style={[s.catCard, sel && { borderColor: c.color, backgroundColor: c.bg }]}
                  onPress={() => toggleCat(c.key)}
                >
                  <View style={[s.catEmojiCircle, { backgroundColor: c.bg }]}>
                    <Text style={s.catEmoji}>{c.emoji}</Text>
                  </View>
                  <Text style={[s.catLabel, sel && { color: c.color }]}>{c.label}</Text>
                  <Text style={s.catTagPreview} numberOfLines={1}>
                    {c.tags.slice(0, 3).join(' · ')}…
                  </Text>
                  {sel && (
                    <View style={[s.catChecked, { backgroundColor: c.color }]}>
                      <Ionicons name="checkmark" size={11} color="#FFF" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* —— Step 2: Tags —— */}
        {step === 'tag' && (
          <View style={{ paddingHorizontal: 14, gap: 16 }}>
            {visibleCats.map((c) => (
              <View key={c.key} style={s.tagSection}>
                <View style={s.tagSectionHead}>
                  <View style={[s.catEmojiSmall, { backgroundColor: c.bg }]}>
                    <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
                  </View>
                  <Text style={s.tagSectionTitle}>{c.label}</Text>
                  <Text style={s.tagSectionSub}>
                    已选 {c.tags.filter((t) => activeTags.includes(t)).length}/{c.tags.length}
                  </Text>
                </View>
                <View style={s.tagRow}>
                  {c.tags.map((t) => {
                    const sel = activeTags.includes(t);
                    return (
                      <Pressable
                        key={t}
                        style={[s.tagChip, sel && { backgroundColor: c.color, borderColor: c.color }]}
                        onPress={() => toggleTag(t)}
                      >
                        <Text style={[s.tagText, sel && { color: '#FFF', fontWeight: '700' }]}>{t}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={s.footerHint}>
          {step === 'cat' ? `已选 ${activeCats.length} 个属性` : `已选 ${activeTags.length} 个标签`}
        </Text>
        <Pressable
          style={[s.nextBtn,
            ((step === 'cat' && activeCats.length === 0) || (step === 'tag' && activeTags.length === 0)) && s.nextBtnDisabled,
          ]}
          onPress={handleNext}
        >
          <Text style={s.nextText}>{step === 'cat' ? '下一步' : '完成 · 进入追光体'}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10, backgroundColor: '#FFF',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B4B' },
  skipBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  skipText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },

  steps: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: PURPLE },
  stepNum: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  stepNumActive: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  stepLine: { width: 60, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 8, borderRadius: 1 },
  stepLineActive: { backgroundColor: PURPLE },

  hero: {
    margin: 14, padding: 22, borderRadius: 18,
    shadowColor: PURPLE, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
  },
  heroEmoji: { fontSize: 36 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginTop: 10, letterSpacing: 0.3 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 6, lineHeight: 18 },

  catGrid: {
    paddingHorizontal: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  catCard: {
    width: (W - 14 * 2 - 10) / 2,
    backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#F3F4F6',
    position: 'relative',
  },
  catEmojiCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  catEmoji: { fontSize: 22 },
  catLabel: { fontSize: 15, fontWeight: '700', color: '#1E1B4B', marginBottom: 4 },
  catTagPreview: { fontSize: 10, color: '#9CA3AF' },
  catChecked: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  tagSection: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14,
  },
  tagSectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  catEmojiSmall: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  tagSectionTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B4B', flex: 1 },
  tagSectionSub: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 16, backgroundColor: '#F9FAFB',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  tagText: { fontSize: 12, color: '#374151', fontWeight: '600' },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingHorizontal: 16, paddingTop: 12,
    gap: 8,
  },
  footerHint: { textAlign: 'center', fontSize: 11, color: '#9CA3AF' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: PURPLE, borderRadius: 24, paddingVertical: 14,
    shadowColor: PURPLE, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
