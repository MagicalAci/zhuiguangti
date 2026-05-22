import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order } from '../types';
import { StatusBadge } from './StatusBadge';
import { ORDER_STATUS_MAP, formatCurrency } from '../utils/helpers';

interface Props {
  order: Order;
  onPress: () => void;
}

export function OrderRow({ order, onPress }: Props) {
  const st = ORDER_STATUS_MAP[order.status];
  const paidTotal = order.depositPaid + order.finalPaid + order.shippingFeePaid;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{order.memberName}</Text>
          {order.isMawei && (
            <View style={styles.mawei}>
              <Text style={styles.maweiText}>妈位</Text>
            </View>
          )}
        </View>
        <Text style={styles.items} numberOfLines={1}>
          {order.items.map((i) => i.productName).join('、')}
        </Text>
        <Text style={styles.time}>{order.items.length}件商品</Text>
      </View>
      <View style={styles.right}>
        <StatusBadge label={st.label} color={st.color} size="sm" />
        <Text style={styles.amount}>{formatCurrency(order.totalAmount)}</Text>
        <Text style={styles.paid}>已收 {formatCurrency(paidTotal)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  left: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '600', color: '#2D3436' },
  mawei: { backgroundColor: '#FFEAA7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  maweiText: { fontSize: 9, color: '#D63031', fontWeight: '700' },
  items: { fontSize: 12, color: '#636E72', marginTop: 4 },
  time: { fontSize: 11, color: '#B2BEC3', marginTop: 2 },
  right: { alignItems: 'flex-end', justifyContent: 'space-between' },
  amount: { fontSize: 15, fontWeight: '700', color: '#2D3436', marginTop: 4 },
  paid: { fontSize: 11, color: '#00B894' },
});
