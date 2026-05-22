import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StepBasicInfo from '../src/components/create-group/StepBasicInfo';
import StepProducts, { ProductGroup, ProductItem } from '../src/components/create-group/StepProducts';
import StepAttributes, { AttributesData } from '../src/components/create-group/StepAttributes';
import StepOrderShipping from '../src/components/create-group/StepOrderShipping';
import { useStore } from '../src/store/useStore';
import type { Product } from '../src/types';

const PURPLE = '#7C3AED';

// —— 步骤定义（V1 demo 第 4 步独立：下单+配送） ——
const STEP_LABELS = {
  base:      '团基本信息',
  products:  '编辑商品',
  attrs:     '拼团属性',
  orderShip: '下单&配送',
} as const;

type StepKey = keyof typeof STEP_LABELS;
type EditFocus = 'base' | 'products';

// —— Group → form 默认值 mock 适配层 ——
// store.Group 只有基础字段，演示用 mock 数据补全
function buildMockProductGroups(editId: string, groupName?: string): ProductGroup[] {
  // 给每个被编辑的团造一组示例 SKU，包含已填的"名称/库存/调价系数"
  const skuTpl = ['兔子', '狐狸', '小熊', '松鼠', '企鹅'];
  const mults  = [1.5, 1.2, 1.0, 0.9, 0.8];
  return [
    {
      id: `g_default_${editId}`,
      name: '默认组',
      products: skuTpl.map<ProductItem>((nm, i) => ({
        id: `p_${editId}_${i}`,
        name: `${nm} 吧唧`,
        image: '',
        status: 'presale',
        stock: '1',
        groupId: `g_default_${editId}`,
        priceMultiplier: mults[i],
      })),
    },
    {
      id: `g_extra_${editId}`,
      name: '吧唧组',
      products: ['毛绒挂件', '亚克力立牌'].map<ProductItem>((nm, i) => ({
        id: `p_extra_${editId}_${i}`,
        name: nm,
        image: '',
        status: 'in_stock',
        stock: '5',
        groupId: `g_extra_${editId}`,
        priceMultiplier: 1.0,
      })),
    },
  ];
}

function buildMockAttrs(): AttributesData {
  return {
    contact: 'wx_grouper_2024',
    startMode: 'now',
    scheduledStartTime: '',
    cutoffTime: '2026-05-25 23:59',
    category: '谷子拼团',
    ipName: '偶像梦幻祭',
    type: '代购',
    payQr: '',
    requireNote: true,
    noteDesc: '请填写应援角色 + 偏好',
    autoCancelMin: true,
    shippingMethod: 'express',
    shippingFee: '7/8',
    allowEditAddress: true,
    allowEditAfterCutoff: false,
    queueMode: 'order',

    payMode: 'deposit',
    depositRate: 30,
    finalPayDeadline: '2026-06-01',
    autoRemindFinalPay: true,

    shippingRule: 'standard',
    shippingFeeCustom: '',
    shipFeeTime: 'immediate',
    shipFeeCustomHours: '24',
  };
}

function emptyAttrs(): AttributesData {
  return {
    contact: '',
    startMode: 'now',
    scheduledStartTime: '',
    cutoffTime: '',
    category: '谷子拼团',
    ipName: '',
    type: '自制',
    payQr: '',
    requireNote: false,
    noteDesc: '',
    autoCancelMin: true,
    shippingMethod: 'express',
    shippingFee: '0',
    allowEditAddress: true,
    allowEditAfterCutoff: false,
    queueMode: 'order',

    payMode: 'full',
    depositRate: 30,
    finalPayDeadline: '',
    autoRemindFinalPay: true,

    shippingRule: 'free',
    shippingFeeCustom: '',
    shipFeeTime: 'immediate',
    shipFeeCustomHours: '24',
  };
}

export default function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ editId?: string; focus?: string; type?: string }>();
  const editId = (params.editId as string) || '';
  const focus = (params.focus as EditFocus | '') || '';
  const isEdit = !!editId;
  // 入口 type：carpool（拼车开团，有拼团情况表）/ custom（自制开团，无拼团情况表）
  const entryType: 'carpool' | 'custom' = (params.type as any) === 'custom' ? 'custom' : 'carpool';

  const { groups, addGroup } = useStore();

  // —— 步骤序列（仅在编辑+focus 时被裁剪） ——
  const stepKeys: StepKey[] = useMemo(() => {
    if (isEdit && focus === 'products') return ['products'];
    if (isEdit && focus === 'base')     return ['base', 'attrs', 'orderShip'];
    return ['base', 'products', 'attrs', 'orderShip'];
  }, [isEdit, focus]);

  const [stepIdx, setStepIdx] = useState(0);
  const currentKey = stepKeys[stepIdx];

  // —— 表单数据 ——
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [detail, setDetail] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [descImages, setDescImages] = useState<string[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([
    { id: '1', name: '默认分组', products: [] },
  ]);
  const [attrs, setAttrs] = useState<AttributesData>(() => {
    const base = emptyAttrs();
    base.type = entryType === 'custom' ? '自制' : '拼车';
    return base;
  });

  // —— 编辑模式预填 ——
  useEffect(() => {
    if (!isEdit) return;
    const g = groups.find((x) => x.id === editId);
    // 真实字段（来自 store）
    setName(g?.name ?? '我的拼团 · 6 月新谷代购');
    setDesc(g?.description ?? '本团代购日亚直邮 / 谷美自抽 / 包邮包损 / 双 11 前到货');
    setDetail('已在 X 店下单（订单号后 4 位 1234）\n经营拼车 3 年，本 IP 第 5 车\n粉籍 2 年，已加 X 个官群');
    setImages([`cred_${editId}_1`, `cred_${editId}_2`]);
    setDescImages([`desc_${editId}_1`, `desc_${editId}_2`, `desc_${editId}_3`]);
    setProductGroups(buildMockProductGroups(editId, g?.name));
    setAttrs(buildMockAttrs());
  }, [isEdit, editId, groups]);

  // —— 校验 ——
  const canNext = () => {
    if (currentKey === 'base')     return name.trim().length > 0;
    if (currentKey === 'products') return productGroups.some((g) => g.products.length > 0);
    return true;
  };

  const isLastStep = stepIdx === stepKeys.length - 1;

  const handleBack = () => {
    if (stepIdx > 0) { setStepIdx(stepIdx - 1); return; }
    const canBack = typeof (router as any).canGoBack === 'function'
      ? (router as any).canGoBack()
      : true;
    if (canBack) {
      try { router.back(); return; } catch {}
    }
    router.replace('/' as any);
  };

  const handleNext = () => {
    if (!canNext()) {
      Alert.alert('提示', currentKey === 'base' ? '请填写团名称' : '请至少添加一个商品');
      return;
    }
    if (!isLastStep) { setStepIdx(stepIdx + 1); return; }
    handleSubmit();
  };

  const handleSubmit = () => {
    if (isEdit) {
      if (focus === 'products') {
        Alert.alert('已保存', '商品配置已更新');
      } else if (focus === 'base') {
        Alert.alert('已保存', '拼团基本信息 / 属性已更新');
      } else {
        Alert.alert('已保存', '拼团已更新');
      }
      // 编辑完成后返回详情页
      try { router.back(); } catch { router.replace('/' as any); }
      return;
    }

    // —— 新建：把表单数据写入 store，跳「发布成功」页 ——
    // 把 ProductGroup[] → Product[]
    const allProducts: Product[] = productGroups.flatMap((pg) =>
      pg.products.map((p, idx) => ({
        id: p.id || `p_${Date.now()}_${idx}`,
        groupId: '',                   // store.addGroup 会在内部覆盖为团 id
        name: p.name?.trim() || `商品 ${idx + 1}`,
        image: p.image || undefined,
        price: Math.round(50 * (p.priceMultiplier ?? 1) * 100) / 100,
        heat: (p.priceMultiplier ?? 1) >= 1.3 ? 'hot' : (p.priceMultiplier ?? 1) <= 0.9 ? 'cold' : 'normal',
        stock: parseInt(p.stock, 10) || 1,
        sold: 0,
        createdAt: Date.now(),
      }))
    );

    // 截团时间：'YYYY-MM-DD HH:mm' → timestamp
    const parseDt = (s: string): number | undefined => {
      if (!s) return undefined;
      const norm = s.replace(' ', 'T') + ':00';
      const t = Date.parse(norm);
      return Number.isNaN(t) ? undefined : t;
    };

    const gid = addGroup({
      name: name || '新拼团',
      // 「拼车」+「代购」都视为有拼团情况表的「proxy」类；「自制」无拼团情况表
      type: attrs.type === '自制' ? 'custom' : 'proxy',
      payMode: attrs.payMode,
      description: desc || '本团由追光体 V1 创建 · 自动同步拼团情况 / 群聊',
      ipName: attrs.ipName || attrs.type || '自制',
      stage: attrs.startMode === 'scheduled' ? 'preparing' : 'gathering',
      products: allProducts,
      depositRate: attrs.payMode === 'full' ? 0 : (attrs.depositRate ?? 30) / 100,
      startDate: parseDt(attrs.scheduledStartTime) ?? Date.now(),
      endDate: parseDt(attrs.cutoffTime),
    });

    router.replace({
      pathname: '/group/success' as any,
      params: { name: name || '新拼团', groupId: gid },
    });
  };

  // —— 顶部标题 ——
  const headerTitle = useMemo(() => {
    if (isEdit && focus === 'products') return '修改商品';
    if (isEdit && focus === 'base')     return '修改拼团';
    if (isEdit)                          return '编辑拼团';
    return STEP_LABELS[currentKey];
  }, [isEdit, focus, currentKey]);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.backHit} />
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{headerTitle}</Text>
          {isEdit && (
            <View style={s.editPill}>
              <Ionicons name="create-outline" size={9} color="#FFF" />
              <Text style={s.editPillText}>编辑模式 · 已预填原数据</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => {
            // Alert.alert 的多按钮 + 回调在 RN-Web 上不被支持(只能 window.alert
            // 弹个无按钮提示),会导致用户点 X 但实际没退出。
            // demo 场景直接退出最干脆 —— 不强行加二次确认。
            if (router.canGoBack()) router.back();
            else router.replace('/(main)/' as any);
          }}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={s.closeBtn}
        >
          <Ionicons name="close" size={24} color="#1E1B4B" />
        </TouchableOpacity>
      </View>

      {/* Progress dots */}
      {stepKeys.length > 1 && (
        <View style={s.progress}>
          <View style={s.stepDots}>
            {stepKeys.map((key, i) => (
              <React.Fragment key={key}>
                <View style={[s.stepDot, i <= stepIdx && s.stepDotActive]}>
                  {i < stepIdx ? (
                    <Ionicons name="checkmark" size={13} color="#FFF" />
                  ) : (
                    <Text style={[s.stepNum, i <= stepIdx && s.stepNumActive]}>{i + 1}</Text>
                  )}
                </View>
                {i < stepKeys.length - 1 && (
                  <View style={[s.stepLine, i < stepIdx && s.stepLineActive]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      {/* Body */}
      <View style={{ flex: 1 }}>
        {currentKey === 'base' && (
          <StepBasicInfo
            name={name} setName={setName}
            desc={desc} setDesc={setDesc}
            detail={detail} setDetail={setDetail}
            images={images} setImages={setImages}
            descImages={descImages} setDescImages={setDescImages}
          />
        )}
        {currentKey === 'products' && (
          <StepProducts groups={productGroups} setGroups={setProductGroups} />
        )}
        {currentKey === 'attrs' && (
          <StepAttributes data={attrs} setData={setAttrs} />
        )}
        {currentKey === 'orderShip' && (
          <StepOrderShipping data={attrs} setData={setAttrs} />
        )}
      </View>

      {/* Footer */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        {stepIdx === 0 && isEdit && (
          <Pressable style={s.draftBtn} onPress={handleBack}>
            <Text style={s.draftText}>取消</Text>
          </Pressable>
        )}
        <Pressable style={[s.nextBtn, !canNext() && s.nextBtnDisabled]} onPress={handleNext}>
          <Text style={s.nextText}>
            {!isLastStep
              ? '保存并下一步'
              : isEdit
                ? (focus === 'products' ? '保存商品' : '保存修改')
                : '发布开团'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
    zIndex: 10,
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B4B' },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginTop: 3, paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 6, backgroundColor: PURPLE,
  },
  editPillText: { fontSize: 9, color: '#FFF', fontWeight: '700' },
  backHit: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF', zIndex: 10,
  },

  progress: {
    paddingTop: 14, paddingBottom: 12, paddingHorizontal: 24,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  stepDots: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: PURPLE },
  stepNum: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  stepNumActive: { color: '#FFF' },
  stepLine: {
    flex: 1, height: 2.5, backgroundColor: '#E5E7EB',
    marginHorizontal: 6, borderRadius: 2,
  },
  stepLineActive: { backgroundColor: PURPLE },

  footer: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  draftBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 24,
    borderWidth: 1.5, borderColor: PURPLE, alignItems: 'center',
  },
  draftText: { fontSize: 15, fontWeight: '600', color: PURPLE },
  nextBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 24,
    backgroundColor: PURPLE, alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
});
