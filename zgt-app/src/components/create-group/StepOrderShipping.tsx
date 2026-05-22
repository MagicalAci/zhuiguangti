import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable, Switch, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AttributesData } from './StepAttributes';

interface Props {
  data: AttributesData;
  setData: (d: AttributesData) => void;
}

const PURPLE = '#7C3AED';
const ORANGE = '#F59E0B';

export default function StepOrderShipping({ data, setData }: Props) {
  const set = <K extends keyof AttributesData>(key: K, val: AttributesData[K]) =>
    setData({ ...data, [key]: val });

  const [customFeeOpen, setCustomFeeOpen] = useState(false);
  const [customFeeDraft, setCustomFeeDraft] = useState('');
  // V1 demo: 补邮时间相关 state 已下线(邮费在下单时自动结算)
  // —— 哈啰收款规则 详情弹层 ——
  const [haloDetailOpen, setHaloDetailOpen] = useState(false);
  const needShipping = data.shippingMethod === 'express';

  const openCustomFee = () => { setCustomFeeDraft(data.shippingFeeCustom); setCustomFeeOpen(true); };
  const confirmCustomFee = () => {
    const n = parseFloat(customFeeDraft);
    if (!n || n <= 0) return;
    setData({ ...data, shippingRule: 'custom', shippingFeeCustom: String(n) });
    setCustomFeeOpen(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ===== 下单设置 ===== */}
        <SectionTitle icon="cart-outline" title="下单设置" />

        {/* 哈啰 APP 收款 —— 单行紧凑卡 + ? 点开详情 */}
        <View style={s.haloCardSlim}>
          <Pressable style={s.haloHelpBtn} hitSlop={8} onPress={() => setHaloDetailOpen(true)}>
            <Ionicons name="help" size={12} color={ORANGE} />
          </Pressable>
          <View style={s.haloSlimIcon}>
            <Ionicons name="bicycle" size={14} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.haloSlimTitle}>哈啰 APP · 平台代收款</Text>
            <Text style={s.haloSlimSub}>
              <Text style={{ color: ORANGE, fontWeight: '800' }}>走平台 · 0 手续费</Text>
              <Text style={{ color: '#9CA3AF' }}>{'  ·  '}</Text>
              <Text style={{ color: '#1E1B4B', fontWeight: '700' }}>可随时提现</Text>
            </Text>
          </View>
        </View>

        <Card>
          <View style={s.switchLine}>
            <View>
              <Label text="下单必备注" />
              <Text style={s.hintInline}>开启后下单人必须填写备注</Text>
            </View>
            <Switch value={data.requireNote} onValueChange={(v) => set('requireNote', v)}
              trackColor={{ true: PURPLE, false: '#E5E7EB' }} thumbColor="#FFF" />
          </View>
          {data.requireNote && (
            <InputWrap style={{ marginTop: 10 }}>
              <TextInput style={s.input} placeholder="备注文案提示，如：请填写尺码+颜色"
                placeholderTextColor="#C4C4D4" value={data.noteDesc} onChangeText={(v) => set('noteDesc', v)} />
            </InputWrap>
          )}
        </Card>

        <Card>
          <View style={s.switchLine}>
            <View style={{ flex: 1 }}>
              <Label text="超时自动取消" />
              <Text style={s.hintInline}>15 分钟未支付自动取消订单</Text>
            </View>
            <Switch value={data.autoCancelMin} onValueChange={(v) => set('autoCancelMin', v)}
              trackColor={{ true: PURPLE, false: '#E5E7EB' }} thumbColor="#FFF" />
          </View>
        </Card>

        {/* ===== 配送设置 ===== */}
        <SectionTitle icon="airplane-outline" title="配送设置" />

        <Card>
          <Label text="配送方式" required />
          <View style={s.chipRow}>
            <Chip
              label="快递发货"
              icon="cube-outline"
              active={data.shippingMethod === 'express'}
              onPress={() => set('shippingMethod', 'express')}
            />
            <Chip
              label="无需邮寄"
              icon="hand-left-outline"
              active={data.shippingMethod === 'none'}
              onPress={() => setData({ ...data, shippingMethod: 'none', shippingRule: 'free', shippingFee: '0' })}
            />
          </View>
          <Text style={[s.hint, { marginTop: 8 }]}>
            {needShipping
              ? '需要寄送到团员收货地址 · 下方继续设置邮费规则'
              : '无需邮寄（如数字商品 / 自提 / 包含在打包成本里）· 不再要求填邮费 & 收货地址'}
          </Text>
        </Card>

        {needShipping && (
          <>
            <Card>
              <Label text="邮费规则" required />
              <View style={s.chipRow}>
                <Chip
                  label="包邮"
                  icon="gift-outline"
                  active={data.shippingRule === 'free'}
                  onPress={() => setData({ ...data, shippingRule: 'free', shippingFee: '0' })}
                />
                <Chip
                  label="江浙沪 ¥7 · 其他 ¥8"
                  icon="map-outline"
                  active={data.shippingRule === 'standard'}
                  onPress={() => setData({ ...data, shippingRule: 'standard', shippingFee: '7/8' })}
                />
                <Chip
                  label={data.shippingRule === 'custom' && data.shippingFeeCustom
                    ? `自定义 ¥${data.shippingFeeCustom}`
                    : '自定义'}
                  icon="create-outline"
                  active={data.shippingRule === 'custom'}
                  onPress={openCustomFee}
                />
              </View>
              <Text style={[s.hint, { marginTop: 8 }]}>
                {data.shippingRule === 'free' && '团员无需补邮费'}
                {data.shippingRule === 'standard' && '江浙沪地区 ¥7，其余地区 ¥8（按收货地自动判断）'}
                {data.shippingRule === 'custom' && (data.shippingFeeCustom
                  ? `统一邮费 ¥${data.shippingFeeCustom}`
                  : '点击「自定义」输入邮费金额')}
              </Text>
            </Card>

            {data.shippingRule !== 'free' && (
              <Card>
                <View style={[s.switchLine, { marginBottom: 0 }]}>
                  <Ionicons name="cash-outline" size={14} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={[s.switchLabel, { color: '#065F46' }]}>邮费在团员下单时自动算入应付总额</Text>
                </View>
                <Text style={[s.hint, { marginTop: 6 }]}>
                  V1 demo 起取消「补邮费」单独环节,团员只交一次款(定金或全款),邮费已并入这次支付金额
                </Text>
              </Card>
            )}

            <Card>
              <View style={s.switchLine}>
                <Text style={s.switchLabel}>允许团员修改地址</Text>
                <Switch value={data.allowEditAddress} onValueChange={(v) => set('allowEditAddress', v)}
                  trackColor={{ true: PURPLE, false: '#E5E7EB' }} thumbColor="#FFF" />
              </View>
              <View style={[s.switchLine, { marginTop: 14 }]}>
                <Text style={s.switchLabel}>允许团员截团后修改地址</Text>
                <Switch value={data.allowEditAfterCutoff} onValueChange={(v) => set('allowEditAfterCutoff', v)}
                  trackColor={{ true: PURPLE, false: '#E5E7EB' }} thumbColor="#FFF" />
              </View>
            </Card>
          </>
        )}
      </ScrollView>

      {/* —— 哈啰收款 · 规则详情 Modal —— */}
      <Modal visible={haloDetailOpen} transparent animationType="fade" onRequestClose={() => setHaloDetailOpen(false)}>
        <Pressable style={s.modalMask} onPress={() => setHaloDetailOpen(false)}>
          <Pressable style={[s.modalCard, { paddingHorizontal: 18 }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.haloMHead}>
              <View style={s.haloMIcon}><Ionicons name="bicycle" size={18} color="#FFF" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.haloMTitle}>哈啰 APP · 平台代收款</Text>
                <Text style={s.haloMSub}>团员的钱先进平台、有保障再到你账户</Text>
              </View>
            </View>

            {/* 4 步流程 */}
            <View style={s.haloFlowRow}>
              {[
                { n: '1', t: '团员扫码' },
                { n: '2', t: '平台代收' },
                { n: '3', t: '自动入账' },
                { n: '4', t: '哈啰提现' },
              ].map((it, idx, arr) => (
                <React.Fragment key={it.n}>
                  <View style={s.haloFlowItem}>
                    <View style={s.haloFlowDot}><Text style={s.haloFlowDotText}>{it.n}</Text></View>
                    <Text style={s.haloFlowText}>{it.t}</Text>
                  </View>
                  {idx < arr.length - 1 && <View style={s.haloFlowLine} />}
                </React.Fragment>
              ))}
            </View>

            {/* 规则要点 */}
            <View style={s.ruleList}>
              <View style={s.ruleRow}>
                <View style={[s.ruleBadge, { backgroundColor: '#FFFBEB' }]}>
                  <Text style={[s.ruleBadgeText, { color: ORANGE }]}>0 费率</Text>
                </View>
                <Text style={s.ruleText}>
                  <Text style={{ fontWeight: '800', color: '#1E1B4B' }}>不收一分手续费</Text>
                  ，团员付多少、你拿多少
                </Text>
              </View>
              <View style={s.ruleRow}>
                <View style={[s.ruleBadge, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={[s.ruleBadgeText, { color: '#10B981' }]}>定金</Text>
                </View>
                <Text style={s.ruleText}>
                  团员付定金后<Text style={{ fontWeight: '800', color: '#10B981' }}>可随时提现</Text>，去哈啰 APP 一键到账
                </Text>
              </View>
              <View style={s.ruleRow}>
                <View style={[s.ruleBadge, { backgroundColor: '#F5F3FF' }]}>
                  <Text style={[s.ruleBadgeText, { color: PURPLE }]}>尾款</Text>
                </View>
                <Text style={s.ruleText}>
                  尾款<Text style={{ fontWeight: '800', color: PURPLE }}>等团员确认收货</Text>后可提现 · 期间冻结在平台，团员收到货才解冻
                </Text>
              </View>
              <View style={s.ruleRow}>
                <View style={[s.ruleBadge, { backgroundColor: '#FFF1F2' }]}>
                  <Text style={[s.ruleBadgeText, { color: '#F43F5E' }]}>保障</Text>
                </View>
                <Text style={s.ruleText}>
                  团员看到「平台代收」会更放心，<Text style={{ fontWeight: '800', color: '#F43F5E' }}>提升成团率 30%+</Text>
                </Text>
              </View>
            </View>

            <Text style={s.haloFootnote}>
              提现入口：哈啰 APP → 我的 → 钱包 → 拼团收款 → 提现到银行卡（V1 演示）
            </Text>

            <Pressable style={s.haloMOkBtn} onPress={() => setHaloDetailOpen(false)}>
              <Text style={s.haloMOkText}>我知道了</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 自定义邮费弹层 —— */}
      <Modal visible={customFeeOpen} transparent animationType="fade" onRequestClose={() => setCustomFeeOpen(false)}>
        <Pressable style={s.modalMask} onPress={() => setCustomFeeOpen(false)}>
          <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={s.modalTitle}>自定义邮费</Text>
            <Text style={s.modalSub}>请输入统一邮费金额（元）</Text>
            <View style={s.modalInputWrap}>
              <Text style={s.fieldPrefix}>¥</Text>
              <TextInput
                style={s.modalInput}
                placeholder="如：6.5"
                placeholderTextColor="#C4C4D4"
                value={customFeeDraft}
                onChangeText={setCustomFeeDraft}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            <View style={s.modalBtnRow}>
              <Pressable style={[s.modalBtn, s.modalBtnCancel]} onPress={() => setCustomFeeOpen(false)}>
                <Text style={s.modalBtnCancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={[s.modalBtn, s.modalBtnOk, !parseFloat(customFeeDraft) && s.modalBtnDisabled]}
                onPress={confirmCustomFee}
              >
                <Text style={s.modalBtnOkText}>确定</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— V1 demo:「自定义补邮小时数」弹层已下线(邮费在下单时自动结算) —— */}
    </KeyboardAvoidingView>
  );
}

function SectionTitle({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={s.section}>
      <Ionicons name={icon} size={14} color={PURPLE} />
      <Text style={s.sectionText}>{title}</Text>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

function Label({ text, required, tag }: { text: string; required?: boolean; tag?: string }) {
  return (
    <View style={s.labelRow}>
      {required && <Text style={s.star}>*</Text>}
      <Text style={s.label}>{text}</Text>
      {tag && <View style={s.tagBadge}><Text style={s.tagText}>{tag}</Text></View>}
    </View>
  );
}

function InputWrap({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[s.inputWrap, style]}>{children}</View>;
}

function Chip({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon?: string }) {
  return (
    <Pressable style={[s.chip, active && s.chipActive]} onPress={onPress}>
      {icon && <Ionicons name={icon as any} size={14} color={active ? '#FFF' : '#6B7280'} />}
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  body: { flex: 1 },

  section: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8,
  },
  sectionText: { fontSize: 13, fontWeight: '800', color: PURPLE, letterSpacing: 0.5 },

  card: {
    marginHorizontal: 14, padding: 14, backgroundColor: '#FFF',
    borderRadius: 14, marginBottom: 10,
  },

  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  star: { color: '#EF4444', fontSize: 14, marginRight: 2, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: '#1E1B4B' },
  tagBadge: { marginLeft: 6, backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },

  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5FA', borderRadius: 12, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 14, color: '#1E1B4B', paddingVertical: 12 },
  multiline: { minHeight: 80 },
  hint: { fontSize: 11, color: '#9CA3AF', lineHeight: 16 },
  hintInline: { fontSize: 11, color: '#9CA3AF', marginTop: -4, marginBottom: 4 },
  counter: { fontSize: 11, color: '#B8B8D0', textAlign: 'right', marginTop: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F5F5FA', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: '#F5F3FF', borderColor: PURPLE },
  chipText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  chipTextActive: { color: PURPLE, fontWeight: '800' },

  switchLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#1E1B4B' },

  // —— 哈啰收款（单行紧凑卡） ——
  haloCardSlim: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 14, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#FFFBEB', borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#FCD34D',
    position: 'relative',
  },
  haloHelpBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FCD34D',
    alignItems: 'center', justifyContent: 'center',
  },
  haloSlimIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  haloSlimTitle: { fontSize: 13, fontWeight: '800', color: '#1E1B4B' },
  haloSlimSub: { fontSize: 11, marginTop: 2 },
  haloSlimBadge: {
    backgroundColor: '#FFF', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: '#FCD34D',
    marginRight: 22, // 给 ? 留位置
  },
  haloSlimBadgeText: { fontSize: 9, fontWeight: '800', color: ORANGE },

  // —— 哈啰规则详情 Modal ——
  haloMHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingBottom: 14, marginBottom: 6,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  haloMIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  haloMTitle: { fontSize: 16, fontWeight: '800', color: '#1E1B4B' },
  haloMSub: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },

  haloFlowRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 14, paddingHorizontal: 2,
  },
  haloFlowItem: { alignItems: 'center', gap: 4 },
  haloFlowDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  haloFlowDotText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  haloFlowText: { fontSize: 10, color: '#374151', fontWeight: '700' },
  haloFlowLine: { flex: 1, height: 1, backgroundColor: '#FCD34D', marginTop: -16, marginHorizontal: 2 },

  ruleList: { marginTop: 16, gap: 10 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ruleBadge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
    minWidth: 44, alignItems: 'center',
  },
  ruleBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  ruleText: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 17 },

  haloFootnote: {
    marginTop: 12, padding: 8, borderRadius: 8,
    backgroundColor: '#F5F5FA',
    fontSize: 11, color: '#6B7280', lineHeight: 16,
  },
  haloMOkBtn: {
    marginTop: 14, paddingVertical: 12, borderRadius: 24,
    backgroundColor: PURPLE, alignItems: 'center',
  },
  haloMOkText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // —— Modal ——
  modalMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 40 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B4B' },
  modalSub: { fontSize: 12, color: '#9CA3AF', marginTop: 6, marginBottom: 14 },
  modalInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5FA', borderRadius: 12, paddingHorizontal: 14,
  },
  modalInput: { flex: 1, fontSize: 16, paddingVertical: 12, color: '#1E1B4B' },
  fieldPrefix: { fontSize: 14, color: '#1E1B4B', fontWeight: '700', marginRight: 6 },
  fieldSuffix: { fontSize: 13, color: '#9CA3AF', fontWeight: '600', marginLeft: 6 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 22, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F3F4F6' },
  modalBtnCancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  modalBtnOk: { backgroundColor: PURPLE },
  modalBtnOkText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  modalBtnDisabled: { opacity: 0.4 },
});
