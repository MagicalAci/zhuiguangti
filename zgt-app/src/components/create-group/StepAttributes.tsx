import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable, Switch, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type PayMode = 'deposit' | 'full';
export type ShippingRule = 'free' | 'standard' | 'custom';
export type ShipFeeTime = 'immediate' | 'custom';

export interface AttributesData {
  contact: string;
  startMode: 'now' | 'scheduled';
  scheduledStartTime: string;     // YYYY-MM-DD HH:mm
  cutoffTime: string;             // YYYY-MM-DD HH:mm
  category: string;
  ipName: string;                 // —— 新增：团长自填的 IP（如「偶像梦幻祭」） ——
  type: string;
  payQr: string;
  requireNote: boolean;
  noteDesc: string;
  autoCancelMin: boolean;
  orderNotice: string;
  shippingMethod: string;
  shippingFee: string;
  allowEditAddress: boolean;
  allowEditAfterCutoff: boolean;
  queueMode: 'number' | 'order';

  // —— 支付方式 ——
  payMode: PayMode;
  depositRate: number;            // 30~50（百分比）
  finalPayDeadline: string;       // YYYY-MM-DD
  autoRemindFinalPay: boolean;

  // —— 邮费规则 + 补邮时间 ——
  shippingRule: ShippingRule;
  shippingFeeCustom: string;      // 自定义金额
  shipFeeTime: ShipFeeTime;
  shipFeeCustomHours: string;     // 成团后 N 小时内
}

interface Props {
  data: AttributesData;
  setData: (d: AttributesData) => void;
}

const PURPLE = '#7C3AED';
const CATEGORIES = ['谷子拼团', '韩娱拼团', '内娱拼团', '其他拼团'];
const TYPES = ['自制', '代购', '拼车'];

export default function StepAttributes({ data, setData }: Props) {
  const set = <K extends keyof AttributesData>(key: K, val: AttributesData[K]) =>
    setData({ ...data, [key]: val });

  // —— 自定义邮费/补邮时间 弹层 ——
  const [customFeeOpen, setCustomFeeOpen] = useState(false);
  const [customFeeDraft, setCustomFeeDraft] = useState('');
  const [customHoursOpen, setCustomHoursOpen] = useState(false);
  const [customHoursDraft, setCustomHoursDraft] = useState('');

  // —— 日期时间选择弹层 ——
  const [dtTarget, setDtTarget] = useState<null | 'scheduled' | 'cutoff'>(null);
  const dtCurrentValue = dtTarget === 'scheduled' ? data.scheduledStartTime : data.cutoffTime;
  const onConfirmDateTime = (v: string) => {
    if (dtTarget === 'scheduled') setData({ ...data, scheduledStartTime: v });
    if (dtTarget === 'cutoff')    setData({ ...data, cutoffTime: v });
    setDtTarget(null);
  };

  const openCustomFee = () => {
    setCustomFeeDraft(data.shippingFeeCustom);
    setCustomFeeOpen(true);
  };
  const confirmCustomFee = () => {
    const n = parseFloat(customFeeDraft);
    if (!n || n <= 0) return;
    setData({ ...data, shippingRule: 'custom', shippingFeeCustom: String(n) });
    setCustomFeeOpen(false);
  };

  const openCustomHours = () => {
    setCustomHoursDraft(data.shipFeeCustomHours);
    setCustomHoursOpen(true);
  };
  const confirmCustomHours = () => {
    const n = parseInt(customHoursDraft, 10);
    if (!n || n <= 0) return;
    setData({ ...data, shipFeeTime: 'custom', shipFeeCustomHours: String(n) });
    setCustomHoursOpen(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ===== 拼团属性 ===== */}
        <SectionTitle icon="settings-outline" title="拼团属性" />

        <Card>
          <Label text="团长联系方式" required />
          <InputWrap>
            <TextInput style={s.input} placeholder="微信号/QQ/手机号" placeholderTextColor="#C4C4D4"
              value={data.contact} onChangeText={(v) => set('contact', v)} />
          </InputWrap>
        </Card>

        <Card>
          <Label text="开团方式" required />
          <View style={s.chipRow}>
            <Chip
              label="立即开团"
              icon="flash-outline"
              active={data.startMode === 'now'}
              onPress={() => setData({ ...data, startMode: 'now', scheduledStartTime: '' })}
            />
            <Chip
              label={data.startMode === 'scheduled' && data.scheduledStartTime
                ? `定时 · ${data.scheduledStartTime}`
                : '定时开团'}
              icon="time-outline"
              active={data.startMode === 'scheduled'}
              onPress={() => {
                setData({ ...data, startMode: 'scheduled' });
                setDtTarget('scheduled');
              }}
            />
          </View>
          <Text style={[s.hint, { marginTop: 8 }]}>
            {data.startMode === 'now'
              ? '发布后立即开团 · 团员即可下单'
              : data.scheduledStartTime
                ? `到达 ${data.scheduledStartTime} 时自动开团 · 在此之前团员只能预约`
                : '点击「定时开团」选择开团时间'}
          </Text>
        </Card>

        <Card>
          <Label text="截团时间" required />
          <Pressable style={s.inputRow} onPress={() => setDtTarget('cutoff')}>
            <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
            <Text style={[s.input, !data.cutoffTime && s.placeholder]}>
              {data.cutoffTime || '点击选择截团日期与时间'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
          </Pressable>
          {!!data.cutoffTime && (
            <Pressable onPress={() => set('cutoffTime', '')} style={s.clearDate}>
              <Text style={s.clearDateText}>清除</Text>
            </Pressable>
          )}
          <Text style={[s.hint, { marginTop: 6 }]}>
            到截团时间后，新团员无法上车；已上车团员按系统规则继续付款 / 补尾款
          </Text>
        </Card>

        <Card>
          <Label text="分类" />
          <View style={s.chipRow}>
            {CATEGORIES.map((c) => (
              <Chip key={c} label={c} active={data.category === c} onPress={() => set('category', c)} />
            ))}
          </View>

          {/* —— IP 名（可选，但鼓励填写以获得圈子精准推荐） —— */}
          <View style={{ marginTop: 12 }}>
            <Label text="所属 IP" tag="可选 · 填了曝光更精准" />
            <InputWrap>
              <Ionicons name="pricetag-outline" size={14} color="#9CA3AF" />
              <TextInput
                style={[s.input, { marginLeft: 6 }]}
                placeholder="例：偶像梦幻祭 / 恋与深空 / 周深 / EXO …"
                placeholderTextColor="#C4C4D4"
                value={data.ipName}
                onChangeText={(v) => set('ipName', v.slice(0, 20))}
                maxLength={20}
              />
            </InputWrap>
            <Text style={[s.hint, { marginTop: 6 }]}>
              {data.ipName
                ? `本团将被自动推荐给关注「${data.ipName}」的团员，并出现在该圈子下`
                : '不填也可以；填写后系统会推送给该 IP 圈子的团员，曝光更精准'}
            </Text>
          </View>
        </Card>

        <Card>
          <Label text="类型" />
          <View style={s.chipRow}>
            {TYPES.map((t) => (
              <Chip key={t} label={t} active={data.type === t} onPress={() => set('type', t)} />
            ))}
          </View>
        </Card>

        {/* —— 支付方式（策划案 §2.2 页面 2 步骤 4） —— */}
        <Card>
          <Label text="支付方式" required />
          <View style={s.chipRow}>
            <Chip label="定金" active={data.payMode === 'deposit'} onPress={() => set('payMode', 'deposit')} icon="cash-outline" />
            <Chip label="全款" active={data.payMode === 'full'} onPress={() => set('payMode', 'full')} icon="card-outline" />
          </View>
          <Text style={s.hint}>
            {data.payMode === 'full'
              ? '成团后通知付全款 · 团员扫码付全款 + 上传凭证 + 团长审核 → 待发货'
              : '成团后先付定金，发货前再补尾款 · 超时未补尾款将自动剔除'}
          </Text>

          {data.payMode === 'deposit' && (
            <View style={s.depositBody}>
              {/* 定金比例（30%~50%） */}
              <Text style={s.subLabel}>定金比例</Text>
              <View style={s.chipRow}>
                {[30, 35, 40, 45, 50].map((r) => (
                  <Chip
                    key={r}
                    label={`${r}%`}
                    active={data.depositRate === r}
                    onPress={() => set('depositRate', r)}
                  />
                ))}
              </View>
              <Text style={[s.hint, { marginTop: 6 }]}>
                团员支付 ¥100 商品 · 定金 ¥{data.depositRate} · 尾款 ¥{100 - data.depositRate}
              </Text>

              {/* 补尾款截止日期 */}
              <Text style={[s.subLabel, { marginTop: 12 }]}>补尾款截止日期</Text>
              <Pressable style={s.dateRow} onPress={() => {
                // 简易日期选择：默认 7 天后
                const d = new Date();
                d.setDate(d.getDate() + 7);
                set('finalPayDeadline', d.toISOString().slice(0, 10));
              }}>
                <Ionicons name="calendar-outline" size={16} color="#7C3AED" />
                <Text style={[s.dateText, !data.finalPayDeadline && { color: '#C4C4D4' }]}>
                  {data.finalPayDeadline || '点击选择截止日期（默认 7 天后）'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
              </Pressable>
              {data.finalPayDeadline && (
                <Pressable onPress={() => set('finalPayDeadline', '')} style={s.clearDate}>
                  <Text style={s.clearDateText}>清除</Text>
                </Pressable>
              )}

              {/* 到日期自动提醒团员 */}
              <View style={[s.switchLine, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchLabel}>到日期自动提醒团员</Text>
                  <Text style={s.hintInline}>开启后系统将在截止当日推送补尾款通知</Text>
                </View>
                <Switch
                  value={data.autoRemindFinalPay}
                  onValueChange={(v) => set('autoRemindFinalPay', v)}
                  trackColor={{ true: PURPLE, false: '#E5E7EB' }}
                  thumbColor="#FFF"
                />
              </View>
            </View>
          )}
        </Card>

      </ScrollView>

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

      {/* —— 日期时间选择弹层 —— */}
      <DateTimePickerModal
        visible={dtTarget !== null}
        title={dtTarget === 'scheduled' ? '选择开团时间' : '选择截团时间'}
        sub={dtTarget === 'scheduled'
          ? '到达此时间时系统自动开团'
          : '到达此时间后停止接收新订单'}
        value={dtCurrentValue}
        onClose={() => setDtTarget(null)}
        onConfirm={onConfirmDateTime}
      />

      {/* —— 自定义补邮小时数弹层 —— */}
      <Modal visible={customHoursOpen} transparent animationType="fade" onRequestClose={() => setCustomHoursOpen(false)}>
        <Pressable style={s.modalMask} onPress={() => setCustomHoursOpen(false)}>
          <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={s.modalTitle}>补邮时间</Text>
            <Text style={s.modalSub}>成团后 N 小时内补完邮费</Text>
            <View style={s.modalInputWrap}>
              <TextInput
                style={s.modalInput}
                placeholder="如：24"
                placeholderTextColor="#C4C4D4"
                value={customHoursDraft}
                onChangeText={setCustomHoursDraft}
                keyboardType="number-pad"
                autoFocus
              />
              <Text style={s.modalSuffix}>小时</Text>
            </View>
            <View style={s.quickRow}>
              {[6, 12, 24, 48].map((h) => (
                <Pressable key={h} style={s.quickChip} onPress={() => setCustomHoursDraft(String(h))}>
                  <Text style={s.quickChipText}>{h}h</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.modalBtnRow}>
              <Pressable style={[s.modalBtn, s.modalBtnCancel]} onPress={() => setCustomHoursOpen(false)}>
                <Text style={s.modalBtnCancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={[s.modalBtn, s.modalBtnOk, !parseInt(customHoursDraft, 10) && s.modalBtnDisabled]}
                onPress={confirmCustomHours}
              >
                <Text style={s.modalBtnOkText}>确定</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={s.sectionTitle}>
      <Ionicons name={icon as any} size={18} color={PURPLE} />
      <Text style={s.sectionTitleText}>{title}</Text>
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

// —— 日期 / 时间选择 Modal ——
function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function fmtDate(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function todayDate() { return fmtDate(new Date()); }
function offsetDate(days: number) {
  const d = new Date(); d.setDate(d.getDate() + days); return fmtDate(d);
}

const DATE_PRESETS = [
  { label: '今天', value: () => todayDate() },
  { label: '明天', value: () => offsetDate(1) },
  { label: '3 天后', value: () => offsetDate(3) },
  { label: '1 周后', value: () => offsetDate(7) },
  { label: '2 周后', value: () => offsetDate(14) },
  { label: '1 个月后', value: () => offsetDate(30) },
];
const TIME_PRESETS = ['08:00', '12:00', '18:00', '20:00', '22:00', '23:59'];

function DateTimePickerModal({
  visible, title, sub, value, onClose, onConfirm,
}: {
  visible: boolean;
  title: string;
  sub?: string;
  value: string;             // 'YYYY-MM-DD HH:mm'
  onClose: () => void;
  onConfirm: (v: string) => void;
}) {
  // 切回打开时解析当前值
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  React.useEffect(() => {
    if (!visible) return;
    if (value && /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(value)) {
      const [d, t] = value.split(/\s+/);
      setDate(d); setTime(t);
    } else {
      setDate(offsetDate(1)); setTime('23:59');
    }
  }, [visible, value]);

  const canConfirm = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.modalMask} onPress={onClose}>
        <Pressable style={[s.modalCard, { maxWidth: 380 }]} onPress={(e) => e.stopPropagation()}>
          <Text style={s.modalTitle}>{title}</Text>
          {!!sub && <Text style={s.modalSub}>{sub}</Text>}

          {/* —— 日期 —— */}
          <Text style={dtS.label}>日期</Text>
          <View style={dtS.presetRow}>
            {DATE_PRESETS.map((p) => {
              const v = p.value();
              const active = date === v;
              return (
                <Pressable
                  key={p.label}
                  style={[dtS.presetChip, active && dtS.presetChipActive]}
                  onPress={() => setDate(v)}
                >
                  <Text style={[dtS.presetChipText, active && dtS.presetChipTextActive]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={s.modalInputWrap}>
            <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
            <TextInput
              style={dtS.dtInput}
              placeholder="YYYY-MM-DD（例 2026-05-25）"
              placeholderTextColor="#C4C4D4"
              value={date}
              onChangeText={(v) => setDate(v.replace(/[^\d-]/g, '').slice(0, 10))}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* —— 时间 —— */}
          <Text style={[dtS.label, { marginTop: 14 }]}>时间</Text>
          <View style={dtS.presetRow}>
            {TIME_PRESETS.map((t) => {
              const active = time === t;
              return (
                <Pressable
                  key={t}
                  style={[dtS.presetChip, active && dtS.presetChipActive]}
                  onPress={() => setTime(t)}
                >
                  <Text style={[dtS.presetChipText, active && dtS.presetChipTextActive]}>{t}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={s.modalInputWrap}>
            <Ionicons name="time-outline" size={16} color="#9CA3AF" />
            <TextInput
              style={dtS.dtInput}
              placeholder="HH:mm（例 23:59）"
              placeholderTextColor="#C4C4D4"
              value={time}
              onChangeText={(v) => setTime(v.replace(/[^\d:]/g, '').slice(0, 5))}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <View style={dtS.previewBox}>
            <Ionicons name="checkmark-circle-outline" size={14} color={PURPLE} />
            <Text style={dtS.previewText}>
              已选：<Text style={{ fontWeight: '800' }}>{canConfirm ? `${date} ${time}` : '请完整填写'}</Text>
            </Text>
          </View>

          <View style={s.modalBtnRow}>
            <Pressable style={[s.modalBtn, s.modalBtnCancel]} onPress={onClose}>
              <Text style={s.modalBtnCancelText}>取消</Text>
            </Pressable>
            <Pressable
              style={[s.modalBtn, s.modalBtnOk, !canConfirm && s.modalBtnDisabled]}
              onPress={() => canConfirm && onConfirm(`${date} ${time}`)}
            >
              <Text style={s.modalBtnOkText}>确定</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const dtS = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: '#1E1B4B', marginTop: 4, marginBottom: 8 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  presetChip: {
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 14, backgroundColor: '#F3F4F6',
  },
  presetChipActive: { backgroundColor: PURPLE },
  presetChipText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  presetChipTextActive: { color: '#FFF', fontWeight: '700' },
  dtInput: {
    flex: 1, fontSize: 15, color: '#1E1B4B', paddingVertical: 12,
    fontWeight: '700',
  },
  previewBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 14, paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#F5F3FF', borderRadius: 10,
  },
  previewText: { fontSize: 12, color: PURPLE, fontWeight: '600' },
});

function QrUpload({ label, icon, color }: { label: string; icon: string; color: string }) {
  return (
    <Pressable style={s.qrBox}>
      <Ionicons name={icon as any} size={28} color={color} />
      <Text style={s.qrLabel}>{label}</Text>
      <Text style={s.qrHint}>点击上传</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 16 },

  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, marginBottom: 2, paddingHorizontal: 2 },
  sectionTitleText: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },

  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginTop: 10 },

  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  star: { color: '#EF4444', fontSize: 15, marginRight: 2, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: '#1E1B4B' },
  tagBadge: { marginLeft: 6, backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },

  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5FA', borderRadius: 12, paddingHorizontal: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5FA', borderRadius: 12, paddingHorizontal: 14, gap: 6 },
  input: { flex: 1, fontSize: 14, color: '#1E1B4B', paddingVertical: 12 },
  placeholder: { color: '#C4C4D4' },
  multiline: { minHeight: 80 },
  fieldPrefix: { fontSize: 14, fontWeight: '700', color: '#F43F5E' },
  counter: { fontSize: 11, color: '#B8B8D0', textAlign: 'right', marginTop: 4 },
  hint: { fontSize: 12, color: '#9CA3AF' },
  hintInline: { fontSize: 11, color: '#9CA3AF', marginTop: -4, marginBottom: 4 },

  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: '#F3F4F6',
  },
  chipActive: { backgroundColor: PURPLE },
  chipText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  chipTextActive: { color: '#FFF', fontWeight: '600' },

  switchLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },

  qrRow: { flexDirection: 'row', gap: 12 },
  qrBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 18,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed', gap: 4,
  },
  qrLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  qrHint: { fontSize: 10, color: '#B8B8D0' },

  // —— 支付方式：定金扩展 ——
  depositBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F1F8',
  },
  subLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F0FF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  dateText: { flex: 1, fontSize: 13, color: '#1E1B4B', fontWeight: '600' },
  clearDate: { alignSelf: 'flex-end', marginTop: 4, paddingHorizontal: 8, paddingVertical: 2 },
  clearDateText: { fontSize: 11, color: '#9CA3AF' },

  // —— 自定义弹层 ——
  modalMask: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#FFF', borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B4B', textAlign: 'center' },
  modalSub: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  modalInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F5FA', borderRadius: 12, paddingHorizontal: 14,
  },
  modalInput: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1E1B4B', paddingVertical: 14 },
  modalSuffix: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickChip: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  quickChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F3F4F6' },
  modalBtnCancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  modalBtnOk: { backgroundColor: PURPLE },
  modalBtnOkText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  modalBtnDisabled: { backgroundColor: '#D1D5DB' },
});
