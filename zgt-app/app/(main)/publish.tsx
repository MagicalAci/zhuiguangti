import React from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');
const PINK = '#F43F5E';

type OptionItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  emoji: string;
  label: string;
  desc: string;
  color: string;
  route?: string;
  params?: Record<string, string>;
};

const OPTIONS: OptionItem[] = [
  {
    key: 'expert',
    icon: 'calendar-outline',
    emoji: '📅',
    label: '达人开团',
    desc: '站姐/画师等达人发起开团活动',
    color: '#F43F5E',
    route: '/create-group',
    params: { type: 'expert' },
  },
  {
    key: 'idle',
    icon: 'folder-open-outline',
    emoji: '📦',
    label: '闲置交易',
    desc: '商品、自用品、二手品，随时发、随时出',
    color: '#F59E0B',
    route: '/create-group',
    params: { type: 'idle' },
  },
  {
    key: 'carpool',
    icon: 'car-outline',
    emoji: '🚗',
    label: '拼车开团',
    desc: '代购/官方套装周边/整盒拆售拼车',
    color: '#3B82F6',
    route: '/create-group',
    params: { type: 'carpool' },
  },
  {
    key: 'custom',
    icon: 'color-palette-outline',
    emoji: '🎨',
    label: '自制开团',
    desc: '同人本/痛包/自制谷子等灵活场景',
    color: '#7C3AED',
    route: '/create-group',
    params: { type: 'custom' },
  },
];

export default function PublishScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleOption = (opt: OptionItem) => {
    if (opt.route) {
      router.push({ pathname: opt.route as any, params: opt.params });
    }
  };

  const handleClose = () => {
    router.replace('/(main)/' as any);
  };

  return (
    <View style={s.screen}>
      <LinearGradient
        colors={['#F43F5E', '#FB7185', '#FECDD3']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[s.headerGrad, { paddingTop: insets.top + 12 }]}
      >
        <View style={s.headerDecor}>
          <Text style={s.decorStar}>⭐</Text>
          <Text style={s.decorCat}>🐱</Text>
          <Text style={s.decorGift}>🎁</Text>
          <Text style={s.decorHeart}>💖</Text>
        </View>
      </LinearGradient>

      <View style={s.plusWrap}>
        <LinearGradient
          colors={['#F43F5E', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.plusBtn}
        >
          <Ionicons name="add" size={36} color="#FFF" />
        </LinearGradient>
      </View>

      <ScrollView
        style={s.body}
        contentContainerStyle={[s.bodyContent, { paddingBottom: insets.bottom + 70 }]}
        showsVerticalScrollIndicator={false}
      >
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={({ pressed }) => [s.optCard, pressed && s.optCardPressed]}
            onPress={() => handleOption(opt)}
          >
            <View style={[s.optIcon, { backgroundColor: opt.color + '15' }]}>
              <Text style={s.optEmoji}>{opt.emoji}</Text>
            </View>
            <View style={s.optText}>
              <Text style={s.optLabel}>{opt.label}</Text>
              <Text style={s.optDesc}>{opt.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        style={[s.closeBtn, { bottom: insets.bottom + 16 }]}
        onPress={handleClose}
        hitSlop={12}
      >
        <Ionicons name="close" size={22} color="#9CA3AF" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF' },

  headerGrad: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerDecor: {
    width: W,
    height: 160,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorStar: { position: 'absolute', fontSize: 48, top: 10, left: W * 0.12, opacity: 0.9 },
  decorCat: { position: 'absolute', fontSize: 56, top: 20, right: W * 0.08, opacity: 0.9 },
  decorGift: { position: 'absolute', fontSize: 44, bottom: 10, left: W * 0.3 },
  decorHeart: { position: 'absolute', fontSize: 28, bottom: 30, right: W * 0.25, opacity: 0.8 },

  plusWrap: {
    alignSelf: 'center',
    marginTop: -32,
    zIndex: 10,
  },
  plusBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F43F5E',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  body: { flex: 1 },
  bodyContent: { paddingTop: 28, paddingHorizontal: 16, gap: 12 },

  optCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 14,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  optCardPressed: { backgroundColor: '#FFF5F7', borderColor: '#FECDD3' },

  optIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optEmoji: { fontSize: 24 },
  optText: { flex: 1 },
  optLabel: { fontSize: 16, fontWeight: '700', color: '#1E1B4B' },
  optDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },

  closeBtn: {
    position: 'absolute',
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
