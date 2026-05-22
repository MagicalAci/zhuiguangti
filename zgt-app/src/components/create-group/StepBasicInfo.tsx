import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable, Switch, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePrefs } from '../../store/usePrefs';

interface Props {
  name: string; setName: (v: string) => void;
  desc: string; setDesc: (v: string) => void;
  detail: string; setDetail: (v: string) => void;
  images: string[]; setImages: (v: string[]) => void;
  /** 团详情图片（详情页/谷团卡片大图）—— 与开团凭证图分开 */
  descImages: string[];
  setDescImages: (v: string[]) => void;
  /** 下单/退换规则（从 step4 合并而来） */
  orderNotice: string;
  setOrderNotice: (v: string) => void;
}

const PURPLE = '#7C3AED';
const PINK = '#F43F5E';

export default function StepBasicInfo({
  name, setName, desc, setDesc, detail, setDetail, images, setImages,
  descImages, setDescImages,
  orderNotice, setOrderNotice,
}: Props) {
  const {
    leaderCredImages, leaderCredDesc,
    addLeaderCred, removeLeaderCred, setLeaderCredDesc,
  } = usePrefs();

  // —— 信誉凭证 详情 Modal ——
  const [credOpen, setCredOpen] = useState(false);
  const [credTab, setCredTab] = useState<'leader' | 'group'>('leader');

  // 团长凭证：是否同步沉淀到「我的-信誉凭证」（默认开启，本次开团必带）
  const [syncToProfile, setSyncToProfile] = useState(true);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* —— 团名称 —— */}
        <View style={s.card}>
          <Label text="团名称" required />
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder="输入团名称，例:6月新谷代购团"
              placeholderTextColor="#C4C4D4"
              value={name}
              onChangeText={(t) => t.length <= 40 && setName(t)}
              maxLength={40}
            />
            <Text style={s.counter}>{name.length}/40</Text>
          </View>
        </View>

        {/* —— 团描述 —— */}
        <View style={s.card}>
          <Label text="团描述" tag="可选" />
          <View style={s.inputWrap}>
            <TextInput
              style={[s.input, s.multiline]}
              placeholder="简要描述本团信息，吸引更多人参团"
              placeholderTextColor="#C4C4D4"
              value={desc}
              onChangeText={(t) => t.length <= 200 && setDesc(t)}
              maxLength={200}
              multiline
              textAlignVertical="top"
            />
          </View>
          <Text style={s.counter}>{desc.length}/200</Text>
        </View>

        {/* —— 信誉凭证 入口卡（暂时隐藏） —— */}
        {/* <Pressable style={s.entryCard} onPress={() => setCredOpen(true)}>
          <View style={s.entryIcon}>
            <Ionicons name="shield-checkmark" size={20} color={PINK} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.entryTitleRow}>
              <Text style={s.entryTitle}>信誉凭证</Text>
              <View style={s.entryTagBadge}><Text style={s.entryTagText}>可选 · 曝光↑30~50%</Text></View>
            </View>
            <Text style={s.entrySub}>
              <Text style={{ color: PURPLE, fontWeight: '700' }}>团长凭证 {leaderCredImages.length} 张</Text>
              <Text style={{ color: '#9CA3AF' }}>  ·  </Text>
              <Text style={{ color: PINK, fontWeight: '700' }}>本团专属 {images.length} 张</Text>
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#C4C4D4" />
        </Pressable> */}

        {/* —— 下单 / 退换规则（从原 step4 「下单须知」合并而来） —— */}
        <View style={s.card}>
          <Label text="下单 / 退换规则" tag="可选 · 给团员看的承诺" />
          <Text style={s.hint}>
            写清退换规则、发货时效、瑕疵处理等，能减少售后纠纷
          </Text>
          <View style={[s.inputWrap, { marginTop: 8 }]}>
            <TextInput
              style={[s.input, s.multiline]}
              placeholder="例：&#10;· 截团 48h 内补尾款，逾期视为放弃&#10;· 谷子官方瑕疵照价补发，非质量问题不退换&#10;· 默认顺丰陆运 · 江浙沪 1-2 天，其他地区 3-5 天"
              placeholderTextColor="#C4C4D4"
              value={orderNotice}
              onChangeText={(t) => t.length <= 500 && setOrderNotice(t)}
              maxLength={500}
              multiline
              textAlignVertical="top"
            />
          </View>
          <Text style={s.counter}>{orderNotice.length}/500</Text>
        </View>
      </ScrollView>

      {/* ============================================== */}
      {/*  信誉凭证 · 详情 Modal（团长凭证 / 开团凭证 双 Tab） */}
      {/* ============================================== */}
      <Modal visible={credOpen} animationType="slide" onRequestClose={() => setCredOpen(false)}>
        <View style={modalS.screen}>
          {/* Header */}
          <View style={modalS.header}>
            <Pressable hitSlop={12} onPress={() => setCredOpen(false)} style={modalS.headerBtn}>
              <Ionicons name="close" size={22} color="#1E1B4B" />
            </Pressable>
            <Text style={modalS.headerTitle}>信誉凭证</Text>
            <View style={modalS.headerBtn} />
          </View>

          {/* 曝光说明（顶部条幅） */}
          <View style={modalS.exposeBar}>
            <Ionicons name="trending-up" size={14} color={PINK} />
            <Text style={modalS.exposeText}>
              <Text style={{ fontWeight: '800', color: PINK }}>上传后曝光 ↑ 30%~50%</Text>
              {'  · 团员越信任团长，越愿意参团'}
            </Text>
          </View>

          {/* Tab */}
          <View style={modalS.tabBar}>
            <Pressable
              style={[modalS.tab, credTab === 'leader' && modalS.tabActive]}
              onPress={() => setCredTab('leader')}
            >
              <Ionicons name="person-circle" size={14} color={credTab === 'leader' ? PURPLE : '#9CA3AF'} />
              <Text style={[modalS.tabText, credTab === 'leader' && modalS.tabTextActive]}>
                团长凭证
              </Text>
              <View style={modalS.tabCount}>
                <Text style={modalS.tabCountText}>{leaderCredImages.length}</Text>
              </View>
            </Pressable>
            <Pressable
              style={[modalS.tab, credTab === 'group' && modalS.tabActive]}
              onPress={() => setCredTab('group')}
            >
              <Ionicons name="cube" size={14} color={credTab === 'group' ? PURPLE : '#9CA3AF'} />
              <Text style={[modalS.tabText, credTab === 'group' && modalS.tabTextActive]}>
                开团凭证
              </Text>
              <View style={modalS.tabCount}>
                <Text style={modalS.tabCountText}>{images.length}</Text>
              </View>
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {credTab === 'leader' ? (
              /* ===== 团长凭证 Tab ===== */
              <View style={modalS.tabPane}>
                <View style={modalS.intro}>
                  <Ionicons name="information-circle-outline" size={14} color={PURPLE} />
                  <Text style={modalS.introText}>
                    展示<Text style={{ fontWeight: '800', color: PURPLE }}>你本人的信誉</Text>，跟具体哪个团无关。粉籍证明、历史拼车记录、官店认证截图等
                  </Text>
                </View>

                {/* 团长简介 */}
                <Text style={modalS.fieldLabel}>团长简介</Text>
                <View style={modalS.inputWrap}>
                  <TextInput
                    style={[s.input, s.multiline, { fontSize: 13 }]}
                    placeholder="如：本人为 偶像梦幻祭 / 偶像大师 粉籍 3 年 · 经营拼车 23 次 · 0 跑单"
                    placeholderTextColor="#C4C4D4"
                    value={leaderCredDesc}
                    onChangeText={setLeaderCredDesc}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                {/* 凭证图片 */}
                <Text style={[modalS.fieldLabel, { marginTop: 14 }]}>凭证图片 · 最多 9 张</Text>
                <View style={modalS.imgGrid}>
                  {leaderCredImages.map((c) => (
                    <View key={c.id} style={modalS.imgThumb}>
                      <View style={modalS.imgPlaceholder}>
                        <Ionicons name="document-attach-outline" size={22} color={PURPLE} />
                        <Text style={modalS.imgThumbType} numberOfLines={1}>{c.type}</Text>
                      </View>
                      <Pressable style={modalS.imgRemove} onPress={() => removeLeaderCred(c.id)}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  ))}
                  {leaderCredImages.length < 9 && (
                    <Pressable
                      style={modalS.imgAdd}
                      onPress={() => addLeaderCred({ label: `凭证 ${leaderCredImages.length + 1}`, type: '粉籍证明' })}
                    >
                      <Ionicons name="cloud-upload-outline" size={24} color={PURPLE} />
                      <Text style={modalS.imgAddText}>上传</Text>
                    </Pressable>
                  )}
                </View>

                {/* 沉淀到凭证库（默认开启，本次开团自动带上无需选项） */}
                <View style={modalS.optBox}>
                  <View style={modalS.optRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={modalS.optTitle}>沉淀到我的凭证库</Text>
                      <Text style={modalS.optSub}>
                        以后每次开团都自动可用，无需重复上传 · 也可在「我的-信誉凭证」修改
                      </Text>
                    </View>
                    <Switch
                      value={syncToProfile}
                      onValueChange={setSyncToProfile}
                      trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
                      thumbColor={syncToProfile ? PURPLE : '#F9FAFB'}
                    />
                  </View>
                  <View style={modalS.optTip}>
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    <Text style={modalS.optTipText}>本次开团已默认带上 · 团员可在拼团详情页查看</Text>
                  </View>
                </View>
              </View>
            ) : (
              /* ===== 开团凭证 Tab ===== */
              <View style={modalS.tabPane}>
                <View style={modalS.intro}>
                  <Ionicons name="information-circle-outline" size={14} color={PINK} />
                  <Text style={modalS.introText}>
                    上传<Text style={{ fontWeight: '800', color: PINK }}>本次开团专属</Text>的凭证，仅本团展示。如：本次下单截图、官店预购单号、批发市场拿货图
                  </Text>
                </View>

                {/* 凭证类型示例 chips */}
                <View style={modalS.credChipRow}>
                  <View style={modalS.credChip}><Text style={modalS.credChipEmoji}>📦</Text><Text style={modalS.credChipText}>下单证明</Text></View>
                  <View style={modalS.credChip}><Text style={modalS.credChipEmoji}>🛍️</Text><Text style={modalS.credChipText}>官店截图</Text></View>
                  <View style={modalS.credChip}><Text style={modalS.credChipEmoji}>📑</Text><Text style={modalS.credChipText}>拿货凭证</Text></View>
                </View>

                <Text style={modalS.fieldLabel}>本团凭证图片 · 最多 9 张</Text>
                <View style={modalS.imgGrid}>
                  {images.map((_, i) => (
                    <View key={i} style={modalS.imgThumb}>
                      <View style={[modalS.imgPlaceholder, { backgroundColor: '#FFF1F2', borderColor: '#FCA5A5' }]}>
                        <Ionicons name="document-attach-outline" size={22} color={PINK} />
                        <Text style={[modalS.imgThumbType, { color: PINK }]}>凭证 {i + 1}</Text>
                      </View>
                      <Pressable style={modalS.imgRemove} onPress={() => setImages(images.filter((__, idx) => idx !== i))}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  ))}
                  {images.length < 9 && (
                    <Pressable
                      style={[modalS.imgAdd, { borderColor: PINK, backgroundColor: '#FFF8F8' }]}
                      onPress={() => setImages([...images, `img_${Date.now()}`])}
                    >
                      <Ionicons name="cloud-upload-outline" size={24} color={PINK} />
                      <Text style={[modalS.imgAddText, { color: PINK }]}>上传</Text>
                    </Pressable>
                  )}
                </View>

                {/* 本团补充说明 */}
                <Text style={[modalS.fieldLabel, { marginTop: 14 }]}>本团补充说明</Text>
                <View style={modalS.inputWrap}>
                  <TextInput
                    style={[s.input, s.multiline, { fontSize: 13 }]}
                    placeholder="例：&#10;· 已在 X 店下单（订单号后 4 位 1234）&#10;· 本 IP 第 5 车 · 货源稳定"
                    placeholderTextColor="#C4C4D4"
                    value={detail}
                    onChangeText={(t) => t.length <= 1000 && setDetail(t)}
                    maxLength={1000}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
                <Text style={modalS.counter}>{detail.length}/1000</Text>
              </View>
            )}

            {/* 风控提示 */}
            <View style={modalS.warnBox}>
              <Ionicons name="shield-checkmark-outline" size={14} color={PURPLE} />
              <Text style={modalS.warnText}>
                <Text style={{ fontWeight: '700', color: PURPLE }}>隐私提示：</Text>
                凭证仅展示给团员预览，请勿上传身份证 / 真实姓名等敏感信息
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={modalS.footer}>
            <Pressable style={modalS.doneBtn} onPress={() => setCredOpen(false)}>
              <Text style={modalS.doneBtnText}>完成</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
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

const s = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginTop: 12 },

  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  star: { color: '#EF4444', fontSize: 15, marginRight: 2, fontWeight: '700' },
  label: { fontSize: 15, fontWeight: '600', color: '#1E1B4B' },
  tagBadge: { marginLeft: 6, backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },

  inputWrap: {
    backgroundColor: '#F5F5FA', borderRadius: 12, paddingHorizontal: 14,
  },
  input: { fontSize: 14, color: '#1E1B4B', paddingVertical: 14 },
  multiline: { minHeight: 80 },
  counter: { fontSize: 11, color: '#B8B8D0', textAlign: 'right', marginTop: 6 },
  hint: { fontSize: 12, color: '#9CA3AF', lineHeight: 18 },

  // —— 信誉凭证 入口卡 ——
  entryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14, marginTop: 12,
  },
  entryIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center',
  },
  entryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryTitle: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  entryTagBadge: { backgroundColor: '#FFF1F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  entryTagText: { fontSize: 9, fontWeight: '800', color: PINK },
  entrySub: { fontSize: 12, marginTop: 4 },

});

const modalS = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 54, paddingBottom: 12, paddingHorizontal: 12,
    backgroundColor: '#FFF',
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1E1B4B', letterSpacing: 0.3 },

  exposeBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#FED7D7',
  },
  exposeText: { flex: 1, fontSize: 12, color: '#7F1D1D' },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 14,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: PURPLE },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: PURPLE, fontWeight: '800' },
  tabCount: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  tabCountText: { fontSize: 10, fontWeight: '800', color: '#6B7280' },

  tabPane: { paddingHorizontal: 16, paddingTop: 14 },

  intro: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F5F3FF', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 9,
    marginBottom: 14,
  },
  introText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 16 },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#1E1B4B', marginBottom: 8 },
  inputWrap: { backgroundColor: '#F5F5FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 2 },
  counter: { fontSize: 11, color: '#B8B8D0', textAlign: 'right', marginTop: 4 },

  imgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imgThumb: { width: 80, height: 80, position: 'relative' },
  imgPlaceholder: {
    width: 80, height: 80, borderRadius: 10, backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center', gap: 3,
    borderWidth: 1, borderColor: '#E0D7FB',
  },
  imgThumbType: { fontSize: 9, color: PURPLE, fontWeight: '700' },
  imgRemove: { position: 'absolute', top: -6, right: -6 },
  imgAdd: {
    width: 80, height: 80, borderRadius: 10,
    borderWidth: 1.5, borderColor: PURPLE, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FAFAFE',
  },
  imgAddText: { fontSize: 10, color: PURPLE, marginTop: 3, fontWeight: '600' },

  credChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  credChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF1F2', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  credChipEmoji: { fontSize: 12 },
  credChipText: { fontSize: 11, color: PINK, fontWeight: '700' },

  optBox: {
    marginTop: 14, padding: 12,
    backgroundColor: '#F5F3FF', borderRadius: 12,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  optRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  optTitle: { fontSize: 13, fontWeight: '800', color: '#5B21B6' },
  optSub: { fontSize: 11, color: '#7C3AED', marginTop: 3, lineHeight: 15 },
  optTip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#DDD6FE',
  },
  optTipText: { fontSize: 11, color: '#065F46', fontWeight: '600' },

  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginHorizontal: 16, marginTop: 18,
    backgroundColor: '#F5F3FF', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 9,
  },
  warnText: { flex: 1, fontSize: 11, color: '#6B7280', lineHeight: 16 },

  footer: {
    padding: 14, backgroundColor: '#FFF',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  doneBtn: {
    paddingVertical: 14, borderRadius: 24, backgroundColor: PURPLE,
    alignItems: 'center',
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
