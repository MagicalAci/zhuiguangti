import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { Colors, Radius, Shadow, FontSize } from '../../src/theme';
import { formatCurrency, HEAT_MAP, validateBundle, generateId } from '../../src/utils/helpers';

export default function PlaceOrderScreen() {
  const params = useLocalSearchParams<{ groupId: string; cart: string }>();
  const router = useRouter();
  const store = useStore();
  const group = store.groups.find((g) => g.id === params.groupId);
  const cartData: Record<string, number> = params.cart ? JSON.parse(params.cart as string) : {};

  const [address, setAddress] = useState({ name: '', phone: '', province: '', city: '', detail: '' });
  const [payMethod, setPayMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'confirm' | 'address' | 'pay' | 'done'>('confirm');

  if (!group) return <View style={s.screen}><Text style={{ textAlign: 'center', marginTop: 100, color: Colors.textTertiary }}>团不存在</Text></View>;

  const items = Object.entries(cartData).filter(([_, q]) => q > 0).map(([pid, qty]) => {
    const prod = group.products.find((p) => p.id === pid);
    return prod ? { productId: pid, productName: prod.name, quantity: qty, unitPrice: prod.price, heat: prod.heat } : null;
  }).filter(Boolean) as any[];

  const total = items.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0);
  const deposit = Math.round(total * group.depositRate);
  const bundleRule = group.bundleRules[0];
  const bundleCheck = bundleRule ? validateBundle(items.map((i: any) => ({ productId: i.productId, heat: i.heat })), bundleRule.coldCount) : { valid: true, message: '' };

  const handleSubmit = () => {
    if (!address.name.trim() || !address.phone.trim() || !address.detail.trim()) {
      Alert.alert('请填写完整地址');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const orderId = store.addOrder({
        groupId: group.id,
        memberId: `member_${Date.now()}`,
        memberName: address.name,
        items,
        status: 'deposit_paid',
        totalAmount: total,
        depositAmount: deposit,
        depositPaid: deposit,
        finalAmount: total - deposit,
        finalPaid: 0,
        shippingFee: 8,
        shippingFeePaid: 0,
        isMawei: false,
        priority: Date.now(),
        address: { ...address, district: '' },
        trackingNumbers: [],
      });
      store.addPayment({
        orderId,
        groupId: group.id,
        memberId: `member_${Date.now()}`,
        memberName: address.name,
        type: 'deposit',
        amount: deposit,
        method: payMethod,
        status: 'confirmed',
      });
      setSubmitting(false);
      setStep('done');
    }, 1500);
  };

  if (step === 'done') {
    return (
      <View style={[s.screen, s.doneScreen]}>
        <View style={s.doneIcon}><Text style={{ fontSize: 56 }}>🎉</Text></View>
        <Text style={s.doneTitle}>下单成功！</Text>
        <Text style={s.doneSub}>定金 {formatCurrency(deposit)} 已支付</Text>
        <Text style={s.doneHint}>你可以在「我的订单」中追踪进度{'\n'}团长确认后会通知你</Text>
        <TouchableOpacity style={s.doneBtn} onPress={() => router.push('/member/orders-ongoing')} activeOpacity={0.8}>
          <View style={[s.doneBtnInner, { backgroundColor: Colors.primary }]}>
            <Text style={s.doneBtnText}>查看订单</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={s.doneBackBtn} onPress={() => router.push('/(main)/')}>
          <Text style={s.doneBackText}>继续逛逛</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* 头部 */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={s.topTitle}>确认订单</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* 步骤 */}
        <View style={s.stepRow}>
          {['确认商品', '填写地址', '支付定金'].map((label, i) => {
            const stepIdx = step === 'confirm' ? 0 : step === 'address' ? 1 : 2;
            const active = i <= stepIdx;
            return (
              <View key={i} style={s.stepItem}>
                <View style={[s.stepDot, active && { backgroundColor: Colors.primary }]}>
                  <Text style={[s.stepNum, active && { color: '#FFF' }]}>{i + 1}</Text>
                </View>
                <Text style={[s.stepLabel, active && { color: Colors.primary }]}>{label}</Text>
              </View>
            );
          })}
        </View>

        {/* Step 1: 确认商品 */}
        {step === 'confirm' && (
          <View>
            <Text style={s.sectionTitle}>商品清单</Text>
            {items.map((item: any, i: number) => {
              const ht = HEAT_MAP[item.heat as keyof typeof HEAT_MAP];
              return (
                <View key={i} style={s.itemCard}>
                  <View style={s.itemThumb}><Ionicons name="gift" size={20} color={Colors.primaryLight} /></View>
                  <View style={s.itemInfo}>
                    <Text style={s.itemName}>{item.productName}</Text>
                    <View style={[s.heatTag, { backgroundColor: ht.bg }]}><Text style={{ fontSize: 9, fontWeight: '700', color: ht.color }}>{ht.label}</Text></View>
                  </View>
                  <Text style={s.itemQty}>x{item.quantity}</Text>
                  <Text style={s.itemPrice}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
                </View>
              );
            })}
            {!bundleCheck.valid && (
              <View style={s.warnCard}>
                <Ionicons name="warning" size={16} color={Colors.accent} />
                <Text style={s.warnText}>{bundleCheck.message}</Text>
              </View>
            )}
            <View style={s.summaryCard}>
              <SummaryRow label="商品合计" value={formatCurrency(total)} />
              <SummaryRow label={`定金 (${(group.depositRate * 100).toFixed(0)}%)`} value={formatCurrency(deposit)} bold color={Colors.accent} />
              <SummaryRow label="尾款（稍后支付）" value={formatCurrency(total - deposit)} />
              <SummaryRow label="预估邮费" value="¥8.00" />
            </View>
          </View>
        )}

        {/* Step 2: 地址 */}
        {step === 'address' && (
          <View>
            <Text style={s.sectionTitle}>收货地址</Text>
            <AddrField label="收货人" placeholder="真实姓名" value={address.name} onChange={(v) => setAddress({ ...address, name: v })} />
            <AddrField label="手机号" placeholder="11位手机号" value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} numeric />
            <AddrField label="省/市" placeholder="例：广东省 深圳市" value={address.province} onChange={(v) => setAddress({ ...address, province: v })} />
            <AddrField label="详细地址" placeholder="街道、小区、楼栋、门牌号" value={address.detail} onChange={(v) => setAddress({ ...address, detail: v })} />
          </View>
        )}

        {/* Step 3: 支付 */}
        {step === 'pay' && (
          <View>
            <Text style={s.sectionTitle}>支付方式</Text>
            <TouchableOpacity style={[s.payOption, payMethod === 'wechat' && s.payOptionActive]} onPress={() => setPayMethod('wechat')} activeOpacity={0.7}>
              <View style={[s.payIcon, { backgroundColor: '#07C16022' }]}><Ionicons name="chatbubble-ellipses" size={22} color="#07C160" /></View>
              <Text style={s.payLabel}>微信支付</Text>
              <View style={[s.radio, payMethod === 'wechat' && s.radioActive]}>{payMethod === 'wechat' && <View style={s.radioDot} />}</View>
            </TouchableOpacity>
            <TouchableOpacity style={[s.payOption, payMethod === 'alipay' && s.payOptionActive]} onPress={() => setPayMethod('alipay')} activeOpacity={0.7}>
              <View style={[s.payIcon, { backgroundColor: '#1677FF22' }]}><Ionicons name="card" size={22} color="#1677FF" /></View>
              <Text style={s.payLabel}>支付宝</Text>
              <View style={[s.radio, payMethod === 'alipay' && s.radioActive]}>{payMethod === 'alipay' && <View style={s.radioDot} />}</View>
            </TouchableOpacity>

            <View style={s.payAmountCard}>
              <Text style={s.payAmountLabel}>本次支付定金</Text>
              <Text style={s.payAmount}>{formatCurrency(deposit)}</Text>
              <Text style={s.payAmountSub}>尾款 {formatCurrency(total - deposit)} 稍后支付</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 底部按钮 */}
      <View style={s.footer}>
        {step !== 'confirm' && (
          <TouchableOpacity style={s.prevBtn} onPress={() => setStep(step === 'pay' ? 'address' : 'confirm')} activeOpacity={0.7}>
            <Text style={s.prevText}>上一步</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={{ flex: step !== 'confirm' ? 2 : 1 }} activeOpacity={0.8} onPress={() => {
          if (step === 'confirm') { if (!bundleCheck.valid) { Alert.alert('请满足冷热捆绑'); return; } setStep('address'); }
          else if (step === 'address') { if (!address.name || !address.phone || !address.detail) { Alert.alert('请填写完整地址'); return; } setStep('pay'); }
          else handleSubmit();
        }} disabled={submitting}>
          <View style={[s.nextBtn, { backgroundColor: submitting ? Colors.textTertiary : Colors.primary }]}>
            {step === 'pay' && <Ionicons name="lock-closed" size={16} color="#FFF" />}
            <Text style={s.nextText}>{submitting ? '支付中...' : step === 'pay' ? `支付 ${formatCurrency(deposit)}` : '下一步'}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SummaryRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ fontSize: 14, color: Colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: bold ? 18 : 14, fontWeight: bold ? '800' : '600', color: color ?? Colors.text }}>{value}</Text>
    </View>
  );
}

function AddrField({ label, placeholder, value, onChange, numeric }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; numeric?: boolean }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: '#FFF', borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: Colors.text, borderWidth: 1.5, borderColor: Colors.borderLight }}
        value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={Colors.textTertiary} keyboardType={numeric ? 'phone-pad' : 'default'}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 12 },
  topTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 24, backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 16, ...Shadow.sm },
  stepItem: { alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.bgMuted, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary },
  stepLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: Radius.lg, padding: 12, marginBottom: 8, gap: 12, ...Shadow.sm },
  itemThumb: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  heatTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  itemQty: { fontSize: 13, color: Colors.textTertiary },
  itemPrice: { fontSize: 15, fontWeight: '700', color: Colors.text },
  warnCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.accentBg, borderRadius: Radius.lg, padding: 14, marginBottom: 12 },
  warnText: { flex: 1, fontSize: 13, color: Colors.accent, fontWeight: '600' },
  summaryCard: { backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 18, marginTop: 8, ...Shadow.sm },
  payOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 18, marginBottom: 10, gap: 14, borderWidth: 2, borderColor: Colors.borderLight },
  payOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  payIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  payLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  payAmountCard: { backgroundColor: '#FFF', borderRadius: Radius.xl, padding: 24, alignItems: 'center', marginTop: 16, ...Shadow.md },
  payAmountLabel: { fontSize: 13, color: Colors.textTertiary },
  payAmount: { fontSize: 36, fontWeight: '800', color: Colors.primary, marginTop: 4 },
  payAmountSub: { fontSize: 13, color: Colors.textTertiary, marginTop: 8 },
  footer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 36, gap: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: Colors.borderLight },
  prevBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
  prevText: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  nextBtn: { borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  nextText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  doneScreen: { justifyContent: 'center', alignItems: 'center', padding: 32 },
  doneIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: Colors.text },
  doneSub: { fontSize: 16, color: Colors.success, fontWeight: '600', marginTop: 8 },
  doneHint: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center', lineHeight: 22, marginTop: 12 },
  doneBtn: { marginTop: 32, width: '100%' },
  doneBtnInner: { borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
  doneBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  doneBackBtn: { marginTop: 16 },
  doneBackText: { fontSize: 14, color: Colors.textTertiary },
});
