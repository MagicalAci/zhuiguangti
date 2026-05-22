import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { Colors, Radius, Shadow, FontSize } from '../theme';
import { formatCurrency, HEAT_MAP } from '../utils/helpers';
import { getProductIcon, getProductGradient, getHeatEmoji } from '../utils/productVisual';

interface Props {
  product: Product;
  mode?: 'grid' | 'list' | 'manage';
  cartQty?: number;
  onAdd?: () => void;
  onRemove?: () => void;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestock?: () => void;
}

export function ProductCard({ product, mode = 'grid', cartQty = 0, onAdd, onRemove, onPress, onEdit, onDelete, onRestock }: Props) {
  const icon = getProductIcon(product.name);
  const gradient = getProductGradient(product.id);
  const ht = HEAT_MAP[product.heat];
  const soldOut = product.sold >= product.stock;
  const soldPct = product.stock > 0 ? (product.sold / product.stock) * 100 : 0;
  const remaining = product.stock - product.sold;

  if (mode === 'manage') {
    return (
      <View style={ms.card}>
        <LinearGradient colors={gradient} style={ms.thumb}>
          <Text style={ms.icon}>{icon}</Text>
        </LinearGradient>
        <View style={ms.info}>
          <View style={ms.nameRow}>
            <Text style={ms.name} numberOfLines={1}>{product.name}</Text>
            <View style={[ms.heatTag, { backgroundColor: ht.bg }]}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: ht.color }}>{getHeatEmoji(product.heat)} {ht.label}</Text>
            </View>
          </View>
          <View style={ms.metaRow}>
            <Text style={ms.price}>{formatCurrency(product.price)}</Text>
            <Text style={ms.stock}>库存 {remaining}/{product.stock}</Text>
            <Text style={ms.sold}>已售 {product.sold}</Text>
          </View>
          <View style={ms.bar}><View style={[ms.barFill, { width: `${soldPct}%`, backgroundColor: soldPct > 80 ? Colors.accent : Colors.primary }]} /></View>
        </View>
        <View style={ms.actions}>
          {onRestock && <TouchableOpacity style={ms.actionBtn} onPress={onRestock}><Ionicons name="add-circle-outline" size={20} color={Colors.success} /></TouchableOpacity>}
          {onEdit && <TouchableOpacity style={ms.actionBtn} onPress={onEdit}><Ionicons name="create-outline" size={20} color={Colors.primary} /></TouchableOpacity>}
          {onDelete && <TouchableOpacity style={ms.actionBtn} onPress={onDelete}><Ionicons name="trash-outline" size={20} color={Colors.danger} /></TouchableOpacity>}
        </View>
      </View>
    );
  }

  if (mode === 'list') {
    return (
      <TouchableOpacity style={ls.card} onPress={onPress} activeOpacity={0.7} disabled={soldOut}>
        <LinearGradient colors={gradient} style={ls.thumb}>
          <Text style={ls.icon}>{icon}</Text>
          {soldOut && <View style={ls.soldOutOverlay}><Text style={ls.soldOutText}>售罄</Text></View>}
        </LinearGradient>
        <View style={ls.info}>
          <View style={ls.nameRow}>
            <Text style={ls.name} numberOfLines={1}>{product.name}</Text>
            <View style={[ls.heatTag, { backgroundColor: ht.bg }]}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: ht.color }}>{getHeatEmoji(product.heat)} {ht.label}</Text>
            </View>
          </View>
          <Text style={ls.price}>{formatCurrency(product.price)}</Text>
          <View style={ls.bottomRow}>
            <Text style={ls.remaining}>剩余 {remaining}</Text>
            <View style={ls.bar}><View style={[ls.barFill, { width: `${soldPct}%`, backgroundColor: soldPct > 80 ? Colors.accent : Colors.primary }]} /></View>
          </View>
        </View>
        {!soldOut && onAdd && (
          <View style={ls.qtyCtrl}>
            {cartQty > 0 && (
              <>
                <TouchableOpacity style={ls.qtyBtn} onPress={onRemove}><Ionicons name="remove" size={16} color={Colors.primary} /></TouchableOpacity>
                <Text style={ls.qtyText}>{cartQty}</Text>
              </>
            )}
            <TouchableOpacity style={ls.qtyBtnAdd} onPress={onAdd}><Ionicons name="add" size={16} color="#FFF" /></TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={gs.card} onPress={onPress} activeOpacity={0.7} disabled={soldOut}>
      <LinearGradient colors={gradient} style={gs.thumb}>
        <Text style={gs.icon}>{icon}</Text>
        {soldOut && <View style={gs.soldOutOverlay}><Text style={gs.soldOutText}>售罄</Text></View>}
        {product.heat === 'hot' && !soldOut && <View style={gs.hotBadge}><Text style={gs.hotBadgeText}>🔥</Text></View>}
      </LinearGradient>
      <View style={gs.info}>
        <Text style={gs.name} numberOfLines={2}>{product.name}</Text>
        <View style={gs.bottomRow}>
          <Text style={gs.price}>{formatCurrency(product.price)}</Text>
          <Text style={gs.remaining}>剩{remaining}</Text>
        </View>
        {!soldOut && onAdd && (
          <TouchableOpacity style={gs.addBtn} onPress={onAdd} activeOpacity={0.7}>
            {cartQty > 0 ? (
              <View style={gs.addBtnActive}><Text style={gs.addBtnQty}>{cartQty}</Text></View>
            ) : (
              <View style={gs.addBtnDefault}><Ionicons name="add" size={16} color={Colors.primary} /></View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const gs = StyleSheet.create({
  card: { width: '48%', backgroundColor: '#FFF', borderRadius: Radius.xl, overflow: 'hidden', marginBottom: 12, ...Shadow.sm },
  thumb: { height: 110, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  icon: { fontSize: 40 },
  soldOutOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  soldOutText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  hotBadge: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  hotBadgeText: { fontSize: 12 },
  info: { padding: 10 },
  name: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, minHeight: 32 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  price: { fontSize: FontSize.md, fontWeight: '800', color: Colors.accent },
  remaining: { fontSize: FontSize.xs, color: Colors.textTertiary },
  addBtn: { position: 'absolute', right: 0, bottom: 0 },
  addBtnDefault: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  addBtnActive: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  addBtnQty: { fontSize: 12, fontWeight: '800', color: '#FFF' },
});

const ls = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 10, marginBottom: 8, gap: 12, ...Shadow.sm },
  thumb: { width: 60, height: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  icon: { fontSize: 24 },
  soldOutOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  soldOutText: { color: '#FFF', fontWeight: '800', fontSize: 10 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, flex: 1 },
  heatTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  price: { fontSize: FontSize.md, fontWeight: '800', color: Colors.accent, marginTop: 4 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  remaining: { fontSize: FontSize.xs, color: Colors.textTertiary, width: 40 },
  bar: { flex: 1, height: 3, backgroundColor: Colors.bgMuted, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 2 },
  qtyCtrl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  qtyBtnAdd: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, minWidth: 20, textAlign: 'center' },
});

const ms = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 12, marginBottom: 8, gap: 12, alignItems: 'center', ...Shadow.sm },
  thumb: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, flex: 1 },
  heatTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  price: { fontSize: FontSize.md, fontWeight: '800', color: Colors.accent },
  stock: { fontSize: FontSize.xs, color: Colors.textTertiary },
  sold: { fontSize: FontSize.xs, color: Colors.success },
  bar: { height: 3, backgroundColor: Colors.bgMuted, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  barFill: { height: 3, borderRadius: 2 },
  actions: { flexDirection: 'column', gap: 4 },
  actionBtn: { padding: 4 },
});
