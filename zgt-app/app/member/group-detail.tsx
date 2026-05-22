import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { ProductCard } from '../../src/components/ProductCard';
import { Colors, Radius, Shadow, FontSize } from '../../src/theme';
import { formatCurrency, GROUP_STAGES, getStageIndex, validateBundle } from '../../src/utils/helpers';

type ViewMode = 'grid' | 'list';
type SortBy = 'default' | 'price_asc' | 'price_desc' | 'hot_first' | 'stock';

export default function MemberGroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { groups } = useStore();
  const group = groups.find((g) => g.id === id);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('default');
  const [filterHeat, setFilterHeat] = useState<string>('all');

  if (!group) return <View style={s.screen}><Text style={{ textAlign: 'center', marginTop: 100, color: Colors.textTertiary }}>团不存在</Text></View>;

  const stage = GROUP_STAGES[getStageIndex(group.stage)];
  const bundleRule = group.bundleRules[0];
  const coldRequired = bundleRule?.coldCount ?? 0;

  const addToCart = (pid: string) => setCart({ ...cart, [pid]: (cart[pid] || 0) + 1 });
  const removeFromCart = (pid: string) => setCart({ ...cart, [pid]: Math.max((cart[pid] || 0) - 1, 0) });

  let products = [...group.products];
  if (filterHeat !== 'all') products = products.filter((p) => p.heat === filterHeat);
  if (sortBy === 'price_asc') products.sort((a, b) => a.price - b.price);
  else if (sortBy === 'price_desc') products.sort((a, b) => b.price - a.price);
  else if (sortBy === 'hot_first') products.sort((a, b) => (a.heat === 'hot' ? -1 : 1) - (b.heat === 'hot' ? -1 : 1));
  else if (sortBy === 'stock') products.sort((a, b) => (a.stock - a.sold) - (b.stock - b.sold));

  const cartItems = Object.entries(cart).filter(([_, q]) => q > 0).map(([pid, qty]) => {
    const prod = group.products.find((p) => p.id === pid);
    return prod ? { productId: pid, heat: prod.heat, name: prod.name, price: prod.price, qty } : null;
  }).filter(Boolean) as { productId: string; heat: any; name: string; price: number; qty: number }[];

  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const deposit = Math.round(cartTotal * group.depositRate);
  const bundleCheck = coldRequired > 0 ? validateBundle(cartItems.map((i) => ({ productId: i.productId, heat: i.heat })), coldRequired) : { valid: true, message: '' };

  const handleOrder = () => {
    if (cartCount === 0) { Alert.alert('请先选择商品'); return; }
    if (!bundleCheck.valid) { Alert.alert('冷热捆绑不满足', bundleCheck.message); return; }
    router.push({ pathname: '/member/place-order', params: { groupId: group.id, cart: JSON.stringify(cart) } });
  };

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* 头部 */}
        <View style={[s.header, { backgroundColor: group.type === 'proxy' ? '#3B82F6' : Colors.accent }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.headerType}>{group.type === 'proxy' ? '代购团' : '自制团'}</Text>
          <Text style={s.headerTitle}>{group.name}</Text>
          <Text style={s.headerIp}>{group.ipName}</Text>
          <View style={s.headerMeta}>
            <MetaItem icon="people" text={`${group.memberCount}人跟团`} />
            <MetaItem icon="cube" text={`${group.products.length}款商品`} />
            <MetaItem icon="shield-checkmark" text="信誉优" />
          </View>
          <View style={s.headerTags}>
            <View style={s.stageTag}><View style={[s.stageDot, { backgroundColor: '#FFF' }]} /><Text style={s.stageTagText}>{stage?.label}</Text></View>
            <View style={s.priceTag}>
              <Text style={s.priceTagText}>{formatCurrency(Math.min(...group.products.map((p) => p.price)))} ~ {formatCurrency(Math.max(...group.products.map((p) => p.price)))}</Text>
            </View>
          </View>
        </View>

        {/* 冷热捆绑规则 */}
        {coldRequired > 0 && (
          <View style={s.bundleCard}>
            <Ionicons name="information-circle" size={16} color={Colors.info} />
            <Text style={s.bundleText}>冷热捆绑：每选 1 个🔥热门，需搭配 {coldRequired} 个❄️冷门</Text>
          </View>
        )}

        {/* 工具栏：筛选+排序+视图 */}
        <View style={s.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {[{ key: 'all', label: '全部' }, { key: 'hot', label: '🔥 热门' }, { key: 'normal', label: '⭐ 普通' }, { key: 'cold', label: '❄️ 冷门' }].map((f) => (
              <TouchableOpacity key={f.key} style={[s.filterChip, filterHeat === f.key && s.filterChipActive]} onPress={() => setFilterHeat(f.key)}>
                <Text style={[s.filterChipText, filterHeat === f.key && s.filterChipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={s.toolRight}>
            <TouchableOpacity style={s.sortBtn} onPress={() => {
              const cycle: SortBy[] = ['default', 'price_asc', 'price_desc', 'hot_first', 'stock'];
              setSortBy(cycle[(cycle.indexOf(sortBy) + 1) % cycle.length]);
            }}>
              <Ionicons name="swap-vertical" size={16} color={Colors.textSecondary} />
              <Text style={s.sortBtnText}>{sortBy === 'price_asc' ? '价格↑' : sortBy === 'price_desc' ? '价格↓' : sortBy === 'hot_first' ? '热度' : sortBy === 'stock' ? '库存' : '默认'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
              <Ionicons name={viewMode === 'grid' ? 'grid' : 'list'} size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 商品列表 */}
        {viewMode === 'grid' ? (
          <View style={s.gridWrap}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} mode="grid" cartQty={cart[p.id] || 0} onAdd={() => addToCart(p.id)} onRemove={() => removeFromCart(p.id)} />
            ))}
          </View>
        ) : (
          products.map((p) => (
            <ProductCard key={p.id} product={p} mode="list" cartQty={cart[p.id] || 0} onAdd={() => addToCart(p.id)} onRemove={() => removeFromCart(p.id)} />
          ))
        )}
        <View style={{ height: cartCount > 0 ? 140 : 20 }} />
      </ScrollView>

      {/* 底部购物栏 */}
      {cartCount > 0 && (
        <View style={s.cartBar}>
          {!bundleCheck.valid && <Text style={s.bundleWarn}>⚠️ {bundleCheck.message}</Text>}
          <View style={s.cartRow}>
            <View style={s.cartInfo}>
              <View style={s.cartBadge}><Text style={s.cartBadgeText}>{cartCount}</Text></View>
              <View>
                <Text style={s.cartTotal}>{formatCurrency(cartTotal)}</Text>
                <Text style={s.cartDeposit}>定金 {formatCurrency(deposit)}</Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={handleOrder} style={[s.orderBtn, { backgroundColor: bundleCheck.valid ? Colors.primary : Colors.textTertiary }]}>
              <Text style={s.orderBtnText}>去下单</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function MetaItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon as any} size={13} color="rgba(255,255,255,0.7)" />
      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: {},
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: Radius.xxl, borderBottomRightRadius: Radius.xxl },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  headerType: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', marginTop: 4 },
  headerIp: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerMeta: { flexDirection: 'row', gap: 16, marginTop: 14 },
  headerTags: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stageTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  stageDot: { width: 5, height: 5, borderRadius: 3 },
  stageTagText: { fontSize: 11, color: '#FFF', fontWeight: '600' },
  priceTag: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  priceTagText: { fontSize: 11, color: '#FFF', fontWeight: '600' },

  bundleCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 14, backgroundColor: Colors.infoBg, borderRadius: Radius.lg, padding: 14 },
  bundleText: { flex: 1, fontSize: FontSize.sm, color: Colors.info, lineHeight: 20, fontWeight: '500' },

  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  filterRow: { flex: 1, gap: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.borderLight },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '700' },
  toolRight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 8 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sortBtnText: { fontSize: FontSize.xs, color: Colors.textSecondary },

  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, justifyContent: 'space-between' },

  cartBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36, ...Shadow.lg },
  bundleWarn: { fontSize: FontSize.sm, color: Colors.accent, marginBottom: 8, fontWeight: '600' },
  cartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartBadge: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  cartTotal: { fontSize: 22, fontWeight: '800', color: Colors.text },
  cartDeposit: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  orderBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: Radius.full },
  orderBtnText: { color: '#FFF', fontWeight: '800', fontSize: FontSize.lg },
});
