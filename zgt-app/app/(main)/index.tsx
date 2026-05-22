import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable, Image,
  Dimensions, NativeScrollEvent, NativeSyntheticEvent, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../../src/store/useStore';
import { usePrefs, PREF_CATEGORIES, CategoryKey } from '../../src/store/usePrefs';
import { Group } from '../../src/types';

const PLACEHOLDER_IMG = require('../../assets/products/placeholder.jpg');
const { width: SCREEN_W } = Dimensions.get('window');
const BANNER_W = SCREEN_W;

// —— 卡片关系标签（左上角） ——
type Relation = 'owner' | 'ordered' | 'browse' | 'follow' | 'managed' | 'recommend';
const RELATION_TAGS: Record<Relation, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  owner:     { label: '我发起的', color: '#F43F5E', bg: '#FFF1F2', icon: 'ribbon'  },
  ordered:   { label: '我下单的', color: '#F59E0B', bg: '#FFFBEB', icon: 'cart'    },
  browse:    { label: '我浏览的', color: '#6B7280', bg: '#F3F4F6', icon: 'time'    },
  follow:    { label: '我关注的', color: '#7C3AED', bg: '#F5F3FF', icon: 'heart'   },
  managed:   { label: '我管理的', color: '#10B981', bg: '#ECFDF5', icon: 'shield-checkmark' },
  recommend: { label: '为你推荐', color: '#A78BFA', bg: '#F5F3FF', icon: 'sparkles' },
};

// 顶端关系筛选 Tab
type RelationFilter = 'all' | Relation;
const RELATION_FILTERS: { key: RelationFilter; label: string }[] = [
  { key: 'all',     label: '全部'    },
  { key: 'owner',   label: '我发起的' },
  { key: 'ordered', label: '我下单的' },
  { key: 'browse',  label: '我浏览的' },
  { key: 'follow',  label: '我关注的' },
];

// —— 圈子顶栏：先展示用户选的圈子分类，再展示选中圈子下的IP —— //

const BANNERS = [
  { id: 1, gradient: ['#7C3AED', '#A855F7'] as const, title: '夏日谷子祭', sub: '热门IP周边 · 限时拼团中', tag: '🔥 HOT',     icon: 'sparkles'  },
  { id: 2, gradient: ['#F43F5E', '#FB7185'] as const, title: '新团长招募', sub: '零门槛开团 · 享平台流量扶持', tag: '🚀 NEW',     icon: 'megaphone' },
  { id: 3, gradient: ['#6366F1', '#818CF8'] as const, title: '韩娱应援季', sub: '偶像周边拼团专场 · 全球直邮', tag: '💜 K-POP', icon: 'heart' },
];

export default function GroupsScreen() {
  const router = useRouter();
  const { groups, orders } = useStore();
  const { selectedTags, selectedCategoryKeys, prefsDone, setPrefs } = usePrefs();
  const [bannerIdx, setBannerIdx] = useState(0);
  const [activeCircle, setActiveCircle] = useState<CategoryKey | ''>('');
  const [activeIP, setActiveIP] = useState<string>('');
  const [relationFilter, setRelationFilter] = useState<RelationFilter>('all');

  const [prefModalVisible, setPrefModalVisible] = useState(false);
  const [tempCats, setTempCats] = useState<CategoryKey[]>([]);

  useEffect(() => {
    if (!prefsDone) setPrefModalVisible(true);
  }, [prefsDone]);

  const togglePrefCat = (k: CategoryKey) =>
    setTempCats((cur) => cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]);

  const handlePrefDone = () => {
    if (tempCats.length === 0) return;
    const tags = PREF_CATEGORIES
      .filter((c) => tempCats.includes(c.key))
      .flatMap((c) => c.tags.slice(0, 3));
    setPrefs(tags, tempCats);
    setPrefModalVisible(false);
  };

  const handlePrefSkip = () => {
    setPrefs([], []);
    setPrefModalVisible(false);
  };

  const userCircles = useMemo(() => {
    if (selectedCategoryKeys.length > 0) {
      return PREF_CATEGORIES.filter((c) => selectedCategoryKeys.includes(c.key));
    }
    return PREF_CATEGORIES.slice(0, 4);
  }, [selectedCategoryKeys]);

  const activeCircleDef = useMemo(
    () => userCircles.find((c) => c.key === activeCircle),
    [userCircles, activeCircle],
  );

  const activeFilter = activeIP || (activeCircleDef ? activeCircleDef.label : '');

  // —— V1 mock：给每个 group 分配关系标签 ——
  // 实际项目中应根据 group.ownerId / orders / browseHistory / followList 计算
  const groupRelations: Record<string, Relation> = useMemo(() => {
    const result: Record<string, Relation> = {};
    groups.forEach((g, idx) => {
      let rel: Relation;
      if (idx === 0 || idx === 5) rel = 'owner';        // 我发起的
      else if (idx === 1 || idx === 6) rel = 'ordered'; // 我下单的
      else if (idx === 2)              rel = 'managed'; // 我管理的
      else if (idx === 3)              rel = 'browse';  // 我浏览的
      else if (idx === 4)              rel = 'follow';  // 我关注的
      else                              rel = 'recommend';
      result[g.id] = rel;
    });
    return result;
  }, [groups]);

  // —— 全部拼团（拆成"我相关 / 为你推荐"两段） ——
  const { mineGroups, recGroups } = useMemo(() => {
    const REL_ORDER: Record<Relation, number> = {
      owner: 1, ordered: 2, managed: 3, follow: 4, browse: 5, recommend: 9,
    };
    let list = groups.filter((g) => g.stage !== 'completed');

    // 应用关系筛选
    if (relationFilter !== 'all') {
      list = list.filter((g) => groupRelations[g.id] === relationFilter);
    }

    if (activeIP) {
      const hit = list.filter((g) =>
        [g.ipName, g.name, g.description].some((v) => v?.includes(activeIP))
      );
      list = hit.length > 0 ? hit : list.slice(0, 6);
    } else if (activeCircleDef) {
      const tags = activeCircleDef.tags;
      const hit = list.filter((g) =>
        tags.some((tag) => [g.ipName, g.name, g.description].some((v) => v?.includes(tag)))
      );
      list = hit.length > 0 ? hit : list.slice(0, 6);
    }

    const hitsPref = (g: Group) =>
      selectedTags.length > 0 &&
      selectedTags.some((tag) =>
        [g.ipName, g.name, g.description].some((v) => v?.includes(tag))
      );

    const mine: Group[] = [];
    const rec: Group[] = [];
    list.forEach((g) => {
      const rel = groupRelations[g.id] || 'recommend';
      if (rel === 'recommend') rec.push(g);
      else mine.push(g);
    });
    mine.sort((a, b) => {
      const ra = REL_ORDER[groupRelations[a.id] || 'recommend'];
      const rb = REL_ORDER[groupRelations[b.id] || 'recommend'];
      return ra - rb;
    });
    // 推荐档：命中偏好的优先（"我发布的" → "为你优选" → 其他推荐）
    rec.sort((a, b) => {
      const ah = hitsPref(a) ? 0 : 1;
      const bh = hitsPref(b) ? 0 : 1;
      return ah - bh;
    });
    return { mineGroups: mine, recGroups: rec };
  }, [groups, relationFilter, activeIP, activeCircleDef, groupRelations, selectedTags]);

  const totalCount = mineGroups.length + recGroups.length;

  const bannerRef = useRef<ScrollView>(null);

  const onBannerScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_W);
    setBannerIdx(idx);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIdx((prev) => {
        const next = (prev + 1) % BANNERS.length;
        bannerRef.current?.scrollTo({ x: next * BANNER_W, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // —— 卡片点击：根据关系决定进入的"视角" ——
  // owner / managed → 团长视角；其他 → 团员视角
  const openGroup = useCallback((g: Group) => {
    const rel = groupRelations[g.id] || 'recommend';
    const view = (rel === 'owner' || rel === 'managed') ? 'leader' : 'member';
    router.push(`/group/${g.id}?view=${view}` as any);
  }, [groupRelations, router]);

  return (
    <View style={s.screen}>
      {/* —— 顶部品牌栏（去角色切换） —— */}
      <View style={s.topBar}>
        <View style={s.brandRow}>
          <View style={s.brandIcon}>
            <Text style={s.brandIconText}>追</Text>
          </View>
          <Text style={s.brandText}>追光体</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }} />
      </View>

      {/* —— 圈子顶栏 —— */}
      <View style={s.circleBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.circleBar}>
          <Pressable style={s.circleItem} onPress={() => { setActiveCircle(''); setActiveIP(''); }}>
            <View style={[s.circleAvaWrap, activeCircle === '' && s.circleAvaWrapActive]}>
              <LinearGradient
                colors={['#F472B6', '#F43F5E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.circleAva}
              >
                <Text style={s.circleAllText}>ALL</Text>
              </LinearGradient>
            </View>
            <Text style={[s.circleLabel, activeCircle === '' && s.circleLabelActive]}>全部</Text>
          </Pressable>

          {userCircles.map((cat) => {
            const active = activeCircle === cat.key;
            return (
              <Pressable key={cat.key} style={s.circleItem} onPress={() => { setActiveCircle(cat.key); setActiveIP(''); }}>
                <View style={[s.circleAvaWrap, active && { borderColor: cat.color }]}>
                  <View style={[s.circleAva, { backgroundColor: cat.bg }]}>
                    <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
                  </View>
                </View>
                <Text style={[s.circleLabel, active && { color: cat.color, fontWeight: '700' }]} numberOfLines={1}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}

          <Pressable style={s.circleItem} onPress={() => { setTempCats([]); setPrefModalVisible(true); }}>
            <View style={[s.circleAvaWrap, { borderStyle: 'dashed', borderColor: '#A78BFA' }]}>
              <View style={[s.circleAva, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="add" size={26} color="#7C3AED" />
              </View>
            </View>
            <Text style={s.circleLabel}>添加</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* —— IP 筛选：和圈子一样的圆形排列 —— */}
      {activeCircleDef && (
        <View style={s.ipBarWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.circleBar}>
            <Pressable style={s.circleItem} onPress={() => setActiveIP('')}>
              <View style={[s.ipAvaWrap, activeIP === '' && { borderColor: activeCircleDef.color }]}>
                <View style={[s.ipAva, { backgroundColor: activeIP === '' ? activeCircleDef.color : '#F3F4F6' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: activeIP === '' ? '#FFF' : '#6B7280' }}>ALL</Text>
                </View>
              </View>
              <Text style={[s.circleLabel, activeIP === '' && { color: activeCircleDef.color, fontWeight: '700' }]}>全部</Text>
            </Pressable>

            {activeCircleDef.tags.map((ip) => {
              const on = activeIP === ip;
              const initial = ip.slice(0, 2);
              return (
                <Pressable key={ip} style={s.circleItem} onPress={() => setActiveIP(on ? '' : ip)}>
                  <View style={[s.ipAvaWrap, on && { borderColor: activeCircleDef.color }]}>
                    <View style={[s.ipAva, { backgroundColor: on ? activeCircleDef.bg : '#F5F3FF' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: on ? activeCircleDef.color : '#9CA3AF' }} numberOfLines={1}>{initial}</Text>
                    </View>
                  </View>
                  <Text style={[s.circleLabel, on && { color: activeCircleDef.color, fontWeight: '700' }]} numberOfLines={1}>{ip}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* —— 统一紧凑网格：我相关在前，推荐紧随其后，无分隔标题 —— */}
        <View style={s.gridWrap}>
          <View style={s.gridRow}>
            {[...mineGroups, ...recGroups].map((g, idx) => {
              const rel = groupRelations[g.id] || 'recommend';
              const meta = RELATION_TAGS[rel];
              const matchedCircle = userCircles.find((cat) =>
                cat.tags.some((t) => [g.ipName, g.name, g.description].some((v) => v?.includes(t)))
              );
              const tag = activeIP || g.ipName || (matchedCircle?.label ?? '');
              const selfTag = rel === 'recommend'
                ? (matchedCircle
                    ? { label: '为你优选', color: '#F43F5E', bg: '#FFF1F2' }
                    : { label: '为你推荐', color: '#A78BFA', bg: '#F5F3FF' })
                : { label: meta.label, color: meta.color, bg: meta.bg };
              return (
                <MiniGridCard
                  key={g.id}
                  group={g}
                  tag={tag}
                  selfTag={selfTag}
                  onPress={() => openGroup(g)}
                />
              );
            })}
          </View>

          {totalCount === 0 && (
            <EmptyState
              icon="people-outline"
              title="暂无符合条件的拼团"
              sub={activeIP
                ? `换个IP试试 · 当前：${activeIP}`
                : activeCircleDef
                  ? `「${activeCircleDef.label}」暂无拼团，试试其他圈子`
                  : '换个筛选试试，或去添加更多圈子'}
            />
          )}
        </View>
      </ScrollView>

      {/* —— 圈子选择弹窗（首次进入时弹出） —— */}
      <Modal visible={prefModalVisible} transparent animationType="slide" onRequestClose={handlePrefSkip}>
        <View style={prefS.overlay}>
          <TouchableWithoutFeedback onPress={handlePrefSkip}>
            <View style={prefS.backdrop} />
          </TouchableWithoutFeedback>
          <View style={prefS.sheet}>
            <View style={prefS.handle} />
            <View style={prefS.sheetHeader}>
              <Text style={prefS.sheetTitle}>🎯 选择你的圈子</Text>
              <Pressable onPress={handlePrefSkip} hitSlop={12}>
                <Text style={prefS.skipText}>跳过</Text>
              </Pressable>
            </View>
            <Text style={prefS.sheetSub}>选择感兴趣的圈子，首页将优先推荐相关拼团</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={prefS.scrollBody} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={prefS.catGrid}>
                {PREF_CATEGORIES.map((c) => {
                  const sel = tempCats.includes(c.key);
                  return (
                    <Pressable
                      key={c.key}
                      style={[prefS.catCard, sel && { borderColor: c.color, backgroundColor: c.bg }]}
                      onPress={() => togglePrefCat(c.key)}
                    >
                      <Text style={prefS.catEmoji}>{c.emoji}</Text>
                      <Text style={[prefS.catLabel, sel && { color: c.color }]}>{c.label}</Text>
                      <Text style={prefS.catPreview} numberOfLines={1}>
                        {c.tags.slice(0, 3).join(' · ')}
                      </Text>
                      {sel && (
                        <View style={[prefS.catCheck, { backgroundColor: c.color }]}>
                          <Ionicons name="checkmark" size={11} color="#FFF" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={prefS.footer}>
              <Pressable
                style={[prefS.nextBtn, tempCats.length === 0 && { opacity: 0.4 }]}
                onPress={handlePrefDone}
              >
                <Text style={prefS.nextBtnText}>完成 · 进入追光体 ({tempCats.length})</Text>
                <Ionicons name="arrow-forward" size={15} color="#FFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function EmptyState({ icon, title, sub }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={44} color="#E5E7EB" />
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

/* ============================================================ */
/*  首页开团卡片 — 四宫格 + 倒计时条                               */
/* ============================================================ */

function MiniGridCard({
  group, onPress,
}: {
  group: Group;
  tag?: string;
  selfTag?: { label: string; color: string; bg: string };
  onPress?: () => void;
}) {
  const priceMin = group.products.length > 0 ? Math.min(...group.products.map((p) => p.price)) : 0;
  const isCustom = group.type === 'custom';
  const stageLabel = stageShort(group.stage);
  const typeBadge = isCustom
    ? { text: '自制开团', color: '#7C3AED', bg: 'rgba(124,58,237,0.85)' }
    : { text: '拼车代购', color: '#3B82F6', bg: 'rgba(59,130,246,0.85)' };

  const diff = (group.endDate ?? 0) - Date.now();
  const totalMs = (group.endDate ?? 0) - group.startDate;
  const progress = totalMs > 0 ? Math.max(0, Math.min(1, 1 - diff / totalMs)) : 0;
  const days = Math.max(0, Math.floor(diff / 86400000));
  const hrs = Math.max(0, Math.floor((diff % 86400000) / 3600000));
  const mins = Math.max(0, Math.floor((diff % 3600000) / 60000));

  const products = group.products;
  const showProducts = products.slice(0, 4);
  const extraCount = products.length - 3;

  return (
    <Pressable style={miniS.card} onPress={onPress}>
      {/* 四宫格商品图 */}
      <View style={miniS.gridImg}>
        {showProducts.length <= 1 ? (
          <Image source={PLACEHOLDER_IMG} style={miniS.gridSingle} resizeMode="cover" />
        ) : (
          showProducts.map((p, i) => {
            const isLast = i === 3 && extraCount > 1;
            return (
              <View key={p.id} style={miniS.gridCell}>
                <Image source={PLACEHOLDER_IMG} style={miniS.gridCellImg} resizeMode="cover" />
                {isLast && (
                  <View style={miniS.gridOverlay}>
                    <Text style={miniS.gridOverlayText}>+{extraCount}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
        {/* 左上角类型角标 */}
        <View style={[miniS.typeBadge, { backgroundColor: typeBadge.bg }]}>
          <Text style={miniS.typeBadgeText}>{typeBadge.text}</Text>
        </View>
      </View>

      {/* 下半区 */}
      <View style={miniS.body}>
        {/* 状态标签 + 标题 */}
        <View style={miniS.titleRow}>
          <View style={[miniS.stageBadge, { backgroundColor: stageLabel.bg }]}>
            <Text style={[miniS.stageBadgeText, { color: stageLabel.color }]}>{stageLabel.text}</Text>
          </View>
          <Text style={miniS.name} numberOfLines={1}>{group.name}</Text>
        </View>

        {/* 倒计时条 */}
        {diff > 0 ? (
          <View style={miniS.countdownWrap}>
            <View style={miniS.countdownBar}>
              <View style={[miniS.countdownFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={miniS.countdownTextRow}>
              <Ionicons name="time-outline" size={10} color="#F43F5E" />
              <Text style={miniS.countdownText}>还剩{days}天 {String(hrs).padStart(2, '0')}:{String(mins).padStart(2, '0')}</Text>
            </View>
          </View>
        ) : (
          <View style={miniS.countdownWrap}>
            <View style={miniS.countdownBar}>
              <View style={[miniS.countdownFill, { width: '100%', backgroundColor: '#D1D5DB' }]} />
            </View>
            <Text style={[miniS.countdownText, { color: '#9CA3AF' }]}>已截止</Text>
          </View>
        )}

        {/* 价格 + 已拼人数 */}
        <View style={miniS.bottomRow}>
          <Text style={miniS.price}>
            <Text style={miniS.priceUnit}>¥</Text>{priceMin.toFixed(priceMin < 10 ? 1 : 0)}
          </Text>
          <Text style={miniS.soldText}>已拼 {group.memberCount} 人</Text>
        </View>
      </View>
    </Pressable>
  );
}

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

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 10,
    backgroundColor: '#FFF',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
  },
  brandIconText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  brandText: { fontSize: 17, fontWeight: '800', color: '#1E1B4B', letterSpacing: 0.5 },

  // Banner
  bannerWrap: { paddingTop: 0, paddingBottom: 6 },
  bannerCard: {
    width: BANNER_W, height: 120, borderRadius: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, overflow: 'hidden', position: 'relative',
  },
  bannerDeco1: { position: 'absolute', top: -30, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' },
  bannerDeco2: { position: 'absolute', bottom: -40, right: 40, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)' },
  bannerBody: { flex: 1, zIndex: 1 },
  bannerTagWrap: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 6 },
  bannerTag: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 5, fontWeight: '500' },
  bannerIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginLeft: 12, zIndex: 1 },
  dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB' },
  dotActive: { width: 20, borderRadius: 3, backgroundColor: '#7C3AED' },

  // —— 圈子顶栏 ——
  circleBarWrap: { backgroundColor: '#FFF', paddingTop: 8, paddingBottom: 4 },
  circleBar: { paddingHorizontal: 10, gap: 12, alignItems: 'center' },
  circleItem: { alignItems: 'center', width: 64 },
  circleAvaWrap: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'transparent', padding: 1.5,
  },
  circleAvaWrapActive: { borderColor: '#F43F5E' },
  circleAva: {
    width: '100%', height: '100%', borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  circleAllText: { fontSize: 13, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  circleLabel: { fontSize: 11, color: '#374151', marginTop: 5, fontWeight: '600' },
  circleLabelActive: { color: '#F43F5E', fontWeight: '800' },

  // —— IP 筛选条 ——
  ipBarWrap: { backgroundColor: '#FFF', paddingBottom: 4 },
  ipAvaWrap: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  ipAva: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  // —— 顶部品牌右侧图标 ——
  topIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#F5F5FA',
    alignItems: 'center', justifyContent: 'center',
  },

  // —— 关系筛选条 ——
  relationBarWrap: {
    backgroundColor: '#FFF', paddingTop: 6, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  relationBar: { paddingHorizontal: 10, gap: 6 },
  relationChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#F5F5FA', borderRadius: 16,
    borderWidth: 1, borderColor: 'transparent',
  },
  relationChipActive: {
    backgroundColor: '#F5F3FF', borderColor: '#7C3AED',
  },
  relationChipText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  relationChipTextActive: { color: '#7C3AED', fontWeight: '800' },

  // —— 双列网格（紧凑） ——
  gridWrap: { paddingHorizontal: 10, paddingTop: 8 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});

const CARD_W = (SCREEN_W - 10 * 2 - 10) / 2;
const GRID_GAP = 2;
const CELL_SIZE = (CARD_W - GRID_GAP) / 2;

const miniS = StyleSheet.create({
  card: {
    width: CARD_W, backgroundColor: '#FFF', borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1E1B4B', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  gridImg: {
    width: CARD_W, height: CARD_W, position: 'relative',
    flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, backgroundColor: '#F3F4F6',
  },
  gridSingle: { width: '100%', height: '100%' },
  gridCell: { width: CELL_SIZE, height: CELL_SIZE, position: 'relative' },
  gridCellImg: { width: '100%', height: '100%' },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  gridOverlayText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  typeBadge: {
    position: 'absolute', top: 0, left: 0,
    paddingHorizontal: 8, paddingVertical: 4,
    borderBottomRightRadius: 10,
  },
  typeBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF' },

  body: { padding: 10, gap: 6 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stageBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  stageBadgeText: { fontSize: 9, fontWeight: '800' },
  name: { fontSize: 12, fontWeight: '700', color: '#1E1B4B', flex: 1 },

  countdownWrap: { gap: 3 },
  countdownBar: {
    height: 4, borderRadius: 2, backgroundColor: '#F3F4F6', overflow: 'hidden',
  },
  countdownFill: {
    height: '100%', borderRadius: 2,
    backgroundColor: '#F43F5E',
  },
  countdownTextRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countdownText: { fontSize: 10, fontWeight: '700', color: '#F43F5E' },

  bottomRow: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
  },
  price: { fontSize: 16, fontWeight: '800', color: '#F43F5E' },
  priceUnit: { fontSize: 10, fontWeight: '700' },
  soldText: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
});

const prefS = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(30,27,75,0.35)' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '82%', paddingTop: 10, paddingHorizontal: 16,
  },
  handle: {
    alignSelf: 'center', width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#1E1B4B' },
  skipText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  sheetSub: { fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 14 },
  scrollBody: { flexGrow: 0 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: (SCREEN_W - 16 * 2 - 10) / 2,
    backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#F3F4F6', position: 'relative',
  },
  catEmoji: { fontSize: 26, marginBottom: 6 },
  catLabel: { fontSize: 14, fontWeight: '700', color: '#1E1B4B', marginBottom: 3 },
  catPreview: { fontSize: 10, color: '#9CA3AF' },
  catCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 12, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#7C3AED', borderRadius: 20, paddingVertical: 13,
  },
  nextBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

