import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Modal,
  TouchableWithoutFeedback, Animated, Easing, PanResponder, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

export type ProductStatus = 'presale' | 'in_stock';

export interface ProductItem {
  id: string;
  name: string;
  image: string;
  status: ProductStatus;
  stock: string;
  groupId: string;          // 分组归属 id
  priceMultiplier: number;  // 调价系数 0.5 ~ 3.0
}

export interface ProductGroup {
  id: string;
  name: string;
  products: ProductItem[];
}

interface Props {
  groups: ProductGroup[];
  setGroups: (g: ProductGroup[]) => void;
}

const PURPLE = '#7C3AED';
const PINK = '#F43F5E';
const MULT_MIN = 0.5;
const MULT_MAX = 3.0;
const MULT_STEP = 0.1;
// V1 退化推荐系数：按录入顺序循环
const DEFAULT_MULTIPLIERS = [1.5, 1.2, 1.0, 0.9, 0.8];

// 默认分组：策划案示例
function ensureDefaultGroups(groups: ProductGroup[]): ProductGroup[] {
  if (groups.length > 0) return groups;
  return [{ id: 'g_default', name: '默认组', products: [] }];
}

function roundJiao(n: number) {
  // 四舍五入到角（1 位小数）
  return Math.round(n * 10) / 10;
}

export default function StepProducts({ groups: rawGroups, setGroups }: Props) {
  const groups = ensureDefaultGroups(rawGroups);

  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id);

  // —— 编辑分组：独立"全屏页面"形式 —— //
  const [editGroupPageOpen, setEditGroupPageOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);

  // 全局调价
  const [adjustEnabled, setAdjustEnabled] = useState(false);
  const [totalPrice, setTotalPrice] = useState(''); // 整套拿货价

  // 添加方式弹层
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  // 添加分组弹层
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // AI 识图
  const [aiScanning, setAiScanning] = useState(false);
  const aiProgress = useRef(new Animated.Value(0)).current;

  // —— 表格导入 —— //
  const [tableOpen, setTableOpen] = useState(false);
  const [tableParsing, setTableParsing] = useState(false);
  const [tableParseStep, setTableParseStep] = useState('');
  const [tableParsed, setTableParsed] = useState<{ name: string; stock: number; mult: number }[]>([]);
  const [tablePreviewOpen, setTablePreviewOpen] = useState(false);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/comma-separated-values',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setTableParsing(true);
      setTableParseStep('读取文件中...');

      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setTableParseStep('AI 解析表格结构...');
      await new Promise((r) => setTimeout(r, 400));

      const workbook = XLSX.read(base64, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        Alert.alert('解析失败', '表格中未找到工作表');
        setTableParsing(false);
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        Alert.alert('解析失败', '表格中没有数据行');
        setTableParsing(false);
        return;
      }

      setTableParseStep('AI 智能匹配字段...');
      await new Promise((r) => setTimeout(r, 500));

      const headers = Object.keys(rows[0]);
      const nameCol = headers.find((h) =>
        /商品|名称|品名|name|商品名|产品|product/i.test(h)
      ) ?? headers[0];
      const stockCol = headers.find((h) =>
        /数量|库存|stock|qty|quantity|件数|份数/i.test(h)
      );
      const priceCol = headers.find((h) =>
        /价格|单价|price|售价|定价|cost|金额/i.test(h)
      );
      const statusCol = headers.find((h) =>
        /状态|类型|status|type|现货|预售/i.test(h)
      );

      setTableParseStep(`识别到 ${rows.length} 条商品，正在转换...`);
      await new Promise((r) => setTimeout(r, 300));

      const parsed = rows.map((row, idx) => {
        const name = String(row[nameCol] ?? '').trim() || `商品${idx + 1}`;
        const stock = stockCol ? (parseInt(String(row[stockCol]), 10) || 1) : 1;
        const price = priceCol ? (parseFloat(String(row[priceCol])) || 0) : 0;
        const statusRaw = statusCol ? String(row[statusCol]).trim() : '';
        const status: ProductStatus =
          /现货|in.?stock|有货/i.test(statusRaw) ? 'in_stock' : 'presale';
        return { name, stock, price, status, mult: DEFAULT_MULTIPLIERS[idx % DEFAULT_MULTIPLIERS.length] };
      }).filter((p) => p.name.length > 0);

      setTableParsed(parsed);
      setTableParsing(false);
      setTableParseStep('');
      setTablePreviewOpen(true);
    } catch (err: any) {
      setTableParsing(false);
      setTableParseStep('');
      Alert.alert('读取失败', err?.message ?? '文件读取出错');
    }
  };

  const confirmImportParsed = () => {
    if (tableParsed.length === 0) return;
    const gid = activeGroup?.id ?? groups[0]?.id ?? 'g_default';
    const newProducts: ProductItem[] = tableParsed.map((p, i) => ({
      id: `imp_${Date.now()}_${i}`,
      name: p.name,
      image: '',
      status: p.status as ProductStatus,
      stock: String(p.stock),
      groupId: gid,
      priceMultiplier: p.mult,
    }));
    const next = groups.map((g) =>
      g.id === gid ? { ...g, products: [...g.products, ...newProducts] } : g
    );
    setGroups(next);
    setTablePreviewOpen(false);
    setTableOpen(false);
    setTableParsed([]);
    Alert.alert('导入成功', `已添加 ${newProducts.length} 个商品到「${activeGroup?.name ?? '默认组'}」`);
  };

  const allProducts = useMemo(() => groups.flatMap((g) => g.products), [groups]);
  const skuCount = allProducts.length || 1;
  const totalPriceNum = parseFloat(totalPrice) || 0;
  const avgPrice = totalPriceNum / skuCount;

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];

  // ——————— 分组操作 ———————
  const addGroup = () => {
    if (!newGroupName.trim()) {
      Alert.alert('请输入组名');
      return;
    }
    const id = `g_${Date.now()}`;
    setGroups([...groups, { id, name: newGroupName.trim(), products: [] }]);
    setActiveGroupId(id);
    setNewGroupName('');
    setAddGroupOpen(false);
  };

  // 点叉号直接删除分组（同组商品并入剩余的第一个分组）
  const removeGroup = (gid: string) => {
    if (groups.length <= 1) {
      Alert.alert('至少保留 1 个分组', '不能删除最后一个分组');
      return;
    }
    const target = groups.find((g) => g.id === gid);
    if (!target) return;
    const fallback = groups.find((g) => g.id !== gid)?.id ?? 'g_default';
    const next = groups
      .filter((g) => g.id !== gid)
      .map((g) =>
        g.id === fallback
          ? { ...g, products: [...g.products, ...target.products.map((p) => ({ ...p, groupId: fallback }))] }
          : g
      );
    setGroups(next);
    if (activeGroupId === gid) setActiveGroupId(fallback);
  };

  // 调整分组顺序（编辑组模式下可用）
  const moveGroup = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= groups.length || fromIdx === toIdx) return;
    const next = [...groups];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    setGroups(next);
  };

  const renameGroup = (gid: string, name: string) => {
    if (!name.trim()) return;
    setGroups(groups.map((g) => (g.id === gid ? { ...g, name: name.trim() } : g)));
  };

  // ——————— 商品操作 ———————
  const productIndex = (pid: string) => allProducts.findIndex((p) => p.id === pid);

  const addProductManually = () => {
    const nextIdx = allProducts.length;
    const newP: ProductItem = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      image: '',
      status: 'presale',
      stock: '1',
      groupId: activeGroupId,
      priceMultiplier: DEFAULT_MULTIPLIERS[nextIdx % DEFAULT_MULTIPLIERS.length],
    };
    setGroups(
      groups.map((g) =>
        g.id === activeGroupId ? { ...g, products: [...g.products, newP] } : g
      )
    );
    setAddMethodOpen(false);
  };

  const updateProduct = (pid: string, patch: Partial<ProductItem>) => {
    setGroups(
      groups.map((g) => ({
        ...g,
        products: g.products.map((p) => (p.id === pid ? { ...p, ...patch } : p)),
      }))
    );
  };

  const removeProduct = (pid: string) => {
    setGroups(groups.map((g) => ({ ...g, products: g.products.filter((p) => p.id !== pid) })));
  };

  const moveProductToGroup = (pid: string, targetGid: string) => {
    let target: ProductItem | null = null;
    const withoutOld = groups.map((g) => {
      const idx = g.products.findIndex((p) => p.id === pid);
      if (idx >= 0) {
        target = { ...g.products[idx], groupId: targetGid };
        return { ...g, products: g.products.filter((p) => p.id !== pid) };
      }
      return g;
    });
    if (!target) return;
    setGroups(
      withoutOld.map((g) =>
        g.id === targetGid ? { ...g, products: [...g.products, target!] } : g
      )
    );
  };

  // ——————— 调价 ———————
  const clampMultiplier = (v: number) => {
    let next = Math.round(v * 10) / 10;
    if (next < MULT_MIN) next = MULT_MIN;
    if (next > MULT_MAX) next = MULT_MAX;
    return next;
  };

  // ——————— AI 识图 ———————
  const startAiScan = () => {
    setAddMethodOpen(false);
    setAiScanning(true);
    aiProgress.setValue(0);
    Animated.timing(aiProgress, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      setAiScanning(false);
      // 模拟识别结果：批量插入 5 个 SKU
      const stamp = Date.now();
      const newProducts: ProductItem[] = ['兔子', '狐狸', '小熊', '松鼠', '企鹅'].map((nm, i) => ({
        id: `p_${stamp}_${i}`,
        name: `${nm} 吧唧`,
        image: '',
        status: 'presale',
        stock: '1',
        groupId: activeGroupId,
        priceMultiplier: DEFAULT_MULTIPLIERS[i % DEFAULT_MULTIPLIERS.length],
      }));
      setGroups(
        groups.map((g) =>
          g.id === activeGroupId ? { ...g, products: [...g.products, ...newProducts] } : g
        )
      );
      Alert.alert('AI 识图完成', `共识别 ${newProducts.length} 个 SKU，已加入「${activeGroup?.name}」`);
    });
  };

  const aiBarWidth = aiProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  // —— 表格导入：解析 + 提交 ——
  const parseTable = (text: string) => {
    // 支持「商品名 数量 系数」按制表符 / 逗号 / 空格 分隔
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const out: { name: string; stock: number; mult: number }[] = [];
    lines.forEach((line) => {
      // 跳过标题行
      if (/^(商品名|名称|name|sku)/i.test(line)) return;
      const cells = line.split(/[\t,，\s]+/).filter(Boolean);
      if (cells.length < 1) return;
      const name = cells[0];
      const stock = cells[1] ? Math.max(1, Math.min(100, parseInt(cells[1], 10) || 1)) : 1;
      let mult = cells[2] ? parseFloat(cells[2]) || 1 : 1;
      // 支持 ×1.5 / 1.5x 等格式
      mult = clampMultiplier(mult);
      out.push({ name, stock, mult });
    });
    setTableParsed(out);
    setTableParseDone(true);
  };

  const loadTableSample = () => {
    setTableText('商品名\t数量\t系数\n兔子吧唧\t1\t1.5\n狐狸吧唧\t1\t1.2\n小熊吧唧\t1\t1.0\n松鼠吧唧\t1\t0.9\n企鹅吧唧\t1\t0.8');
    setTableParseDone(false);
    setTableParsed([]);
  };

  const confirmImportTable = () => {
    if (tableParsed.length === 0) {
      Alert.alert('提示', '没有可导入的商品');
      return;
    }
    const stamp = Date.now();
    const newProducts: ProductItem[] = tableParsed.map((row, i) => ({
      id: `p_${stamp}_${i}`,
      name: row.name,
      image: '',
      status: 'presale',
      stock: String(row.stock),
      groupId: activeGroupId,
      priceMultiplier: row.mult,
    }));
    setGroups(
      groups.map((g) =>
        g.id === activeGroupId ? { ...g, products: [...g.products, ...newProducts] } : g
      )
    );
    setTableOpen(false);
    setTableText('');
    setTableParsed([]);
    setTableParseDone(false);
    Alert.alert('导入完成', `共导入 ${newProducts.length} 个 SKU 至「${activeGroup?.name}」`);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* —— A. 顶部分组栏 —— */}
      <View style={s.groupBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.groupRow}>
          {groups.map((g) => (
            <Pressable
              key={g.id}
              style={[s.groupTab, g.id === activeGroupId && s.groupTabActive]}
              onPress={() => setActiveGroupId(g.id)}
            >
              <Text style={[s.groupTabText, g.id === activeGroupId && s.groupTabTextActive]}>
                {g.name} <Text style={{ fontSize: 10, opacity: 0.7 }}>({g.products.length})</Text>
              </Text>
            </Pressable>
          ))}
          <Pressable style={s.groupAdd} onPress={() => setAddGroupOpen(true)}>
            <Ionicons name="add" size={16} color={PURPLE} />
            <Text style={s.groupAddText}>添加组</Text>
          </Pressable>
          <Pressable style={s.groupEdit} onPress={() => setEditGroupPageOpen(true)}>
            <Ionicons name="settings-outline" size={14} color="#6B7280" />
            <Text style={s.groupEditText}>编辑组</Text>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* —— B. 全局调价开关条 —— */}
        <View style={s.adjustCard}>
          <View style={s.adjustHeader}>
            <View>
              <Text style={s.adjustTitle}>调价（全部商品）</Text>
              <Text style={s.adjustHint}>填整套拿货价 · 系数 ×0.5～×3.0 · 全开/全不开</Text>
            </View>
            <Pressable
              style={[s.switch, adjustEnabled && s.switchOn]}
              onPress={() => setAdjustEnabled((v) => !v)}
            >
              <View style={[s.switchKnob, adjustEnabled && s.switchKnobOn]} />
            </Pressable>
          </View>

          {adjustEnabled && (
            <View style={s.adjustBody}>
              <View style={s.priceField}>
                <Text style={s.priceLabel}>总价</Text>
                <Text style={s.priceUnit}>¥</Text>
                <TextInput
                  style={s.priceInput}
                  placeholder="0"
                  placeholderTextColor="#C4C4D4"
                  value={totalPrice}
                  onChangeText={(v) => setTotalPrice(v.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                />
              </View>
              <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
              <View style={[s.priceField, { backgroundColor: '#F5F3FF' }]}>
                <Text style={s.priceLabel}>均价</Text>
                <Text style={[s.priceUnit, { color: PURPLE }]}>¥</Text>
                <Text style={[s.priceInput, { color: PURPLE, fontWeight: '800' }]}>{avgPrice ? roundJiao(avgPrice).toFixed(1) : '0.0'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* —— C. 商品卡列表（当前分组） —— */}
        <View style={s.listWrap}>
          {activeGroup?.products.length === 0 && (
            <View style={s.emptyHint}>
              <Ionicons name="cube-outline" size={36} color="#E5E7EB" />
              <Text style={s.emptyTitle}>当前分组还没有商品</Text>
              <Text style={s.emptySub}>点击下方 [+ 继续添加商品] 开始添加</Text>
            </View>
          )}

          {activeGroup?.products.map((p, idx) => {
            const globalIdx = productIndex(p.id);
            const finalPrice = adjustEnabled ? roundJiao(avgPrice * p.priceMultiplier) : 0;
            return (
              <View key={p.id} style={s.prodCard}>
                <View style={s.prodHeader}>
                  <Text style={s.prodIndex}>#{idx + 1}</Text>
                  <Pressable onPress={() => removeProduct(p.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </Pressable>
                </View>

                <View style={s.prodBody}>
                  {/* 左：图片 */}
                  <Pressable style={s.prodImg} onPress={() => Alert.alert('上传图片', '唤起相册/相机（V1 演示）')}>
                    <Ionicons name="image-outline" size={22} color="#B8B8D0" />
                    <Text style={s.prodImgText}>图片</Text>
                  </Pressable>

                  {/* 右：信息 */}
                  <View style={s.prodFields}>
                    {/* 商品名 + 状态 */}
                    <View style={s.row}>
                      <TextInput
                        style={[s.input, { flex: 1 }]}
                        placeholder="商品名"
                        placeholderTextColor="#C4C4D4"
                        value={p.name}
                        onChangeText={(v) => updateProduct(p.id, { name: v })}
                      />
                      <Pressable
                        style={[s.statusBtn, p.status === 'in_stock' && s.statusBtnActive]}
                        onPress={() => updateProduct(p.id, { status: p.status === 'presale' ? 'in_stock' : 'presale' })}
                      >
                        <View style={[s.statusDot, { backgroundColor: p.status === 'in_stock' ? '#10B981' : '#F59E0B' }]} />
                        <Text style={s.statusText}>{p.status === 'in_stock' ? '现货' : '预售中'}</Text>
                        <Ionicons name="swap-vertical" size={10} color="#9CA3AF" />
                      </Pressable>
                    </View>

                    {/* 件数 + 分组 */}
                    <View style={s.row}>
                      <View style={s.field}>
                        <Text style={s.fieldLabel}>件数</Text>
                        <TextInput
                          style={s.fieldInput}
                          placeholder="1"
                          placeholderTextColor="#C4C4D4"
                          value={p.stock}
                          onChangeText={(v) => {
                            const n = Math.max(0, Math.min(100, parseInt(v || '0', 10)));
                            updateProduct(p.id, { stock: String(n || '') });
                          }}
                          keyboardType="number-pad"
                        />
                      </View>
                      <Pressable
                        style={s.field}
                        onPress={() => {
                          // 简易的分组归属切换：循环到下一个分组
                          const cur = groups.findIndex((g) => g.id === p.groupId);
                          const next = groups[(cur + 1) % groups.length];
                          if (next.id !== p.groupId) moveProductToGroup(p.id, next.id);
                        }}
                      >
                        <Text style={s.fieldLabel}>分组</Text>
                        <Text style={[s.fieldInput, { paddingVertical: 6 }]} numberOfLines={1}>
                          {groups.find((g) => g.id === p.groupId)?.name ?? '默认组'}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color="#9CA3AF" />
                      </Pressable>
                    </View>

                    {/* 调价系数 + 实付价（仅开启时） · 双向同步 */}
                    {adjustEnabled && (
                      <View style={s.adjustRow}>
                        <View style={s.adjustCol}>
                          <Text style={s.adjustLabel}>系数</Text>
                          <View style={s.stepper}>
                            <Pressable
                              style={s.stepBtn}
                              onPress={() => updateProduct(p.id, { priceMultiplier: clampMultiplier(p.priceMultiplier - MULT_STEP) })}
                            >
                              <Ionicons name="remove" size={12} color={PURPLE} />
                            </Pressable>
                            <Text style={s.stepValue}>×{p.priceMultiplier.toFixed(1)}</Text>
                            <Pressable
                              style={s.stepBtn}
                              onPress={() => updateProduct(p.id, { priceMultiplier: clampMultiplier(p.priceMultiplier + MULT_STEP) })}
                            >
                              <Ionicons name="add" size={12} color={PURPLE} />
                            </Pressable>
                          </View>
                        </View>

                        <Ionicons name="swap-horizontal" size={14} color="#A78BFA" style={{ marginHorizontal: 2 }} />

                        <View style={s.adjustCol}>
                          <Text style={s.adjustLabel}>实付价</Text>
                          <View style={s.finalPriceEditBox}>
                            <Text style={s.finalPriceUnit}>¥</Text>
                            <TextInput
                              style={s.finalPriceInput}
                              value={finalPrice > 0 ? finalPrice.toFixed(1) : ''}
                              keyboardType="decimal-pad"
                              placeholder={avgPrice > 0 ? roundJiao(avgPrice).toFixed(1) : '—'}
                              placeholderTextColor="#FCA5A5"
                              onChangeText={(v) => {
                                const num = parseFloat(v.replace(/[^0-9.]/g, ''));
                                if (!Number.isFinite(num) || !avgPrice) return;
                                const mult = clampMultiplier(num / avgPrice);
                                updateProduct(p.id, { priceMultiplier: mult });
                              }}
                            />
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {/* —— D. 继续添加商品按钮 —— */}
          <Pressable style={s.addCard} onPress={() => setAddMethodOpen(true)}>
            <Ionicons name="add-circle-outline" size={22} color={PURPLE} />
            <Text style={s.addCardText}>+ 继续添加商品</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* —— D. 添加方式选择弹层 —— */}
      <Modal visible={addMethodOpen} transparent animationType="fade" onRequestClose={() => setAddMethodOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setAddMethodOpen(false)}>
          <View style={modalS.overlay}>
            <TouchableWithoutFeedback>
              <View style={modalS.sheet}>
                <View style={modalS.handle} />
                <Text style={modalS.title}>添加方式</Text>
                <Text style={modalS.sub}>选一种你最顺手的添加方式</Text>

                <Pressable style={modalS.methodRow} onPress={addProductManually}>
                  <View style={[modalS.methodIcon, { backgroundColor: '#F5F3FF' }]}>
                    <Text style={{ fontSize: 22 }}>🖐</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modalS.methodTitle}>手动上传</Text>
                    <Text style={modalS.methodSub}>逐个上传图片 + 填名称 / 价格 / 件数</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#C4C4D4" />
                </Pressable>

                <Pressable
                  style={modalS.methodRow}
                  onPress={() => {
                    setAddMethodOpen(false);
                    setTableOpen(true);
                    setTableText('');
                    setTableParsed([]);
                    setTableParseDone(false);
                  }}
                >
                  <View style={[modalS.methodIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={{ fontSize: 22 }}>📊</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modalS.methodTitle}>表格导入</Text>
                    <Text style={modalS.methodSub}>从 Excel / CSV 粘贴或上传 · 整团一次性建好</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#C4C4D4" />
                </Pressable>

                <Pressable style={modalS.cancelBtn} onPress={() => setAddMethodOpen(false)}>
                  <Text style={modalS.cancelText}>取消</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* —— 添加分组弹层 —— */}
      <Modal visible={addGroupOpen} transparent animationType="fade" onRequestClose={() => setAddGroupOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setAddGroupOpen(false)}>
          <View style={modalS.overlay}>
            <TouchableWithoutFeedback>
              <View style={modalS.sheet}>
                <View style={modalS.handle} />
                <Text style={modalS.title}>新建分组</Text>
                <Text style={modalS.sub}>输入分组名，例如「一直娱 / wvs / 熊宝」</Text>
                <TextInput
                  style={modalS.groupInput}
                  placeholder="分组名"
                  placeholderTextColor="#C4C4D4"
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  autoFocus
                  maxLength={10}
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <Pressable style={modalS.cancelBtn2} onPress={() => { setAddGroupOpen(false); setNewGroupName(''); }}>
                    <Text style={modalS.cancelText2}>取消</Text>
                  </Pressable>
                  <Pressable style={modalS.confirmBtn} onPress={addGroup}>
                    <Text style={modalS.confirmText}>确定</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* —— AI 识图扫描动画弹层 —— */}
      <Modal visible={aiScanning} transparent animationType="fade">
        <View style={[modalS.overlay, { backgroundColor: 'rgba(30,27,75,0.65)', justifyContent: 'center' }]}>
          <View style={modalS.aiCard}>
            <View style={modalS.aiIconWrap}>
              <Text style={{ fontSize: 40 }}>🤖</Text>
            </View>
            <Text style={modalS.aiTitle}>AI 正在识别商品…</Text>
            <Text style={modalS.aiSub}>正在分析图片中的商品名称 / 价格 / 件数</Text>
            <View style={modalS.aiBarTrack}>
              <Animated.View style={[modalS.aiBarFill, { width: aiBarWidth }]} />
            </View>
          </View>
        </View>
      </Modal>

      {/* —— 编辑分组 · 全屏页 —— */}
      <Modal visible={editGroupPageOpen} animationType="slide" onRequestClose={() => setEditGroupPageOpen(false)}>
        <View style={pageS.screen}>
          <View style={pageS.header}>
            <Pressable onPress={() => setEditGroupPageOpen(false)} hitSlop={16} style={pageS.iconBtn}>
              <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
            </Pressable>
            <Text style={pageS.headerTitle}>编辑分组</Text>
            <Pressable
              onPress={() => { setAddGroupOpen(true); }}
              hitSlop={10}
              style={pageS.headerAddBtn}
            >
              <Ionicons name="add" size={16} color={PURPLE} />
              <Text style={pageS.headerAddText}>新建</Text>
            </Pressable>
          </View>
          <View style={pageS.helpBar}>
            <Ionicons name="information-circle" size={13} color="#92400E" />
            <Text style={pageS.helpText}>
              <Text style={{ fontWeight: '800' }}>长按右侧 ☰ 拖拽改顺序</Text> · 也可点 ↑↓ · 点笔形改名 · 点 🗑 删除
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {groups.map((g, idx) => (
              <DraggableGroupCard
                key={g.id}
                idx={idx}
                total={groups.length}
                onMove={(delta) => moveGroup(idx, idx + delta)}
              >
                {/* 顺序 + 名称 + 改名 */}
                <View style={pageS.gHead}>
                  <View style={pageS.gIndex}>
                    <Text style={pageS.gIndexText}>{idx + 1}</Text>
                  </View>
                  <Text style={pageS.gName} numberOfLines={1}>{g.name}</Text>
                  <Pressable
                    style={pageS.gIcon}
                    onPress={() => setRenameTarget({ id: g.id, name: g.name })}
                    hitSlop={6}
                  >
                    <Ionicons name="create-outline" size={16} color={PURPLE} />
                  </Pressable>
                </View>
                {/* 商品数 */}
                <Text style={pageS.gMeta}>
                  共 <Text style={{ color: PURPLE, fontWeight: '800' }}>{g.products.length}</Text> 件商品
                  {g.products.length > 0 && (
                    <Text style={{ color: '#9CA3AF' }}>
                      {' '}· {g.products.slice(0, 3).map((p) => p.name || '未命名').join(' / ')}
                      {g.products.length > 3 ? ' ...' : ''}
                    </Text>
                  )}
                </Text>
                {/* 操作 */}
                <View style={pageS.gActions}>
                  <Pressable
                    style={[pageS.gBtn, idx === 0 && pageS.gBtnDisabled]}
                    disabled={idx === 0}
                    onPress={() => moveGroup(idx, idx - 1)}
                  >
                    <Ionicons name="arrow-up" size={13} color={idx === 0 ? '#D1D5DB' : '#374151'} />
                    <Text style={[pageS.gBtnText, idx === 0 && { color: '#D1D5DB' }]}>上移</Text>
                  </Pressable>
                  <Pressable
                    style={[pageS.gBtn, idx === groups.length - 1 && pageS.gBtnDisabled]}
                    disabled={idx === groups.length - 1}
                    onPress={() => moveGroup(idx, idx + 1)}
                  >
                    <Ionicons name="arrow-down" size={13} color={idx === groups.length - 1 ? '#D1D5DB' : '#374151'} />
                    <Text style={[pageS.gBtnText, idx === groups.length - 1 && { color: '#D1D5DB' }]}>下移</Text>
                  </Pressable>
                  <Pressable
                    style={[pageS.gBtn, pageS.gBtnDelete]}
                    onPress={() => {
                      Alert.alert('删除分组', `确认删除「${g.name}」？组内商品将并入剩余的第一个分组`, [
                        { text: '取消', style: 'cancel' },
                        { text: '删除', style: 'destructive', onPress: () => removeGroup(g.id) },
                      ]);
                    }}
                  >
                    <Ionicons name="trash-outline" size={13} color="#EF4444" />
                    <Text style={[pageS.gBtnText, { color: '#EF4444' }]}>删除</Text>
                  </Pressable>
                </View>
              </DraggableGroupCard>
            ))}
          </ScrollView>

          <View style={pageS.footer}>
            <Pressable style={pageS.doneBtn} onPress={() => setEditGroupPageOpen(false)}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
              <Text style={pageS.doneText}>完成</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* —— 重命名分组 —— */}
      <Modal visible={!!renameTarget} transparent animationType="fade" onRequestClose={() => setRenameTarget(null)}>
        <TouchableWithoutFeedback onPress={() => setRenameTarget(null)}>
          <View style={modalS.overlay}>
            <TouchableWithoutFeedback>
              <View style={modalS.sheet}>
                <View style={modalS.handle} />
                <Text style={modalS.title}>重命名分组</Text>
                <Text style={modalS.sub}>新名最多 10 字</Text>
                <TextInput
                  style={modalS.groupInput}
                  value={renameTarget?.name ?? ''}
                  onChangeText={(t) => setRenameTarget((cur) => (cur ? { ...cur, name: t.slice(0, 10) } : cur))}
                  autoFocus
                  maxLength={10}
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <Pressable style={modalS.cancelBtn2} onPress={() => setRenameTarget(null)}>
                    <Text style={modalS.cancelText2}>取消</Text>
                  </Pressable>
                  <Pressable
                    style={modalS.confirmBtn}
                    onPress={() => {
                      if (renameTarget) renameGroup(renameTarget.id, renameTarget.name);
                      setRenameTarget(null);
                    }}
                  >
                    <Text style={modalS.confirmText}>保存</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* —— 表格导入 · 全屏页 —— */}
      <Modal visible={tableOpen} animationType="slide" onRequestClose={() => setTableOpen(false)}>
        <View style={pageS.screen}>
          <View style={pageS.header}>
            <Pressable onPress={() => { setTableOpen(false); setTableParsing(false); }} hitSlop={16} style={pageS.iconBtn}>
              <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
            </Pressable>
            <Text style={pageS.headerTitle}>表格导入</Text>
            <View style={{ width: 56 }} />
          </View>

          {tableParsing ? (
            <View style={tableS.parsingWrap}>
              <ActivityIndicator size="large" color={PURPLE} />
              <Text style={tableS.parsingTitle}>AI 正在解析</Text>
              <Text style={tableS.parsingSub}>{tableParseStep}</Text>
            </View>
          ) : (
            <View style={tableS.body}>
              <Text style={tableS.bodyHint}>选择一种方式导入商品</Text>

              <Pressable
                style={tableS.bigBtn}
                onPress={() => Alert.alert('下载模版', '将为你下载 Excel 模版文件，填入商品信息后上传即可批量导入。\n\n模版列：商品名称 | 数量 | 单价 | 状态（现货/预售）')}
              >
                <View style={[tableS.bigBtnIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="download-outline" size={28} color="#3B82F6" />
                </View>
                <Text style={tableS.bigBtnTitle}>下载模版</Text>
                <Text style={tableS.bigBtnSub}>下载 Excel 模版，按格式填写后上传</Text>
              </Pressable>

              <Pressable style={tableS.bigBtn} onPress={handlePickFile}>
                <View style={[tableS.bigBtnIcon, { backgroundColor: '#F5F3FF' }]}>
                  <Ionicons name="cloud-upload-outline" size={28} color={PURPLE} />
                </View>
                <Text style={tableS.bigBtnTitle}>上传表格</Text>
                <Text style={tableS.bigBtnSub}>支持 .xlsx / .csv · AI 自动识别字段</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>

      {/* —— 解析预览 · 确认导入 —— */}
      <Modal visible={tablePreviewOpen} animationType="slide" onRequestClose={() => setTablePreviewOpen(false)}>
        <View style={pageS.screen}>
          <View style={pageS.header}>
            <Pressable onPress={() => setTablePreviewOpen(false)} hitSlop={16} style={pageS.iconBtn}>
              <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
            </Pressable>
            <Text style={pageS.headerTitle}>解析结果（{tableParsed.length} 条）</Text>
            <Pressable onPress={confirmImportParsed} hitSlop={8}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: PURPLE, paddingRight: 8 }}>全部导入</Text>
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
            {tableParsed.map((p, i) => (
              <View key={i} style={tableS.previewRow}>
                <View style={tableS.previewIdx}>
                  <Text style={tableS.previewIdxText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={tableS.previewName} numberOfLines={1}>{p.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <Text style={tableS.previewMeta}>数量: {p.stock}</Text>
                    {(p as any).price > 0 && <Text style={tableS.previewMeta}>¥{(p as any).price}</Text>}
                    <Text style={tableS.previewMeta}>{(p as any).status === 'in_stock' ? '现货' : '预售'}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setTableParsed((prev) => prev.filter((_, j) => j !== i))}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={20} color="#D1D5DB" />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          <View style={tableS.previewFooter}>
            <Pressable style={tableS.previewConfirmBtn} onPress={confirmImportParsed}>
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
              <Text style={tableS.previewConfirmText}>确认导入 {tableParsed.length} 个商品</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  // —— A. 分组栏 ——
  groupBar: { backgroundColor: '#FFF', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  groupRow: { paddingHorizontal: 14, gap: 8, alignItems: 'center' },
  groupTabWrap: { position: 'relative' },
  groupTabWrapEdit: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFBEB', borderRadius: 18,
    paddingHorizontal: 4, paddingVertical: 2,
    borderWidth: 1, borderColor: '#FDE68A',
    marginTop: 4,
  },
  groupTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#F3F4F6' },
  groupTabActive: { backgroundColor: PURPLE },
  groupTabEditing: { paddingHorizontal: 10 },
  groupTabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  groupTabTextActive: { color: '#FFF' },
  groupDelBtn: {
    position: 'absolute', top: -5, right: -5,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
  },
  moveBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  moveBtnDisabled: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },

  editHint: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginHorizontal: 14, marginBottom: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#FFFBEB', borderRadius: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  editHintText: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 16 },

  groupAdd: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1, borderColor: PURPLE, borderStyle: 'dashed',
  },
  groupAddText: { fontSize: 11, fontWeight: '600', color: PURPLE },
  groupEdit: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  groupEditActive: { backgroundColor: '#10B981' },
  groupEditText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },

  // —— B. 调价卡 ——
  adjustCard: {
    marginHorizontal: 14, marginTop: 12,
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  adjustHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adjustTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  adjustHint: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },

  switch: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: '#E5E7EB', padding: 2, justifyContent: 'center',
  },
  switchOn: { backgroundColor: PURPLE },
  switchKnob: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  switchKnobOn: { transform: [{ translateX: 20 }] },

  adjustBody: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12,
  },
  priceField: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F8FC', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, gap: 4,
  },
  priceLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  priceUnit: { fontSize: 14, color: '#1E1B4B', fontWeight: '700' },
  priceInput: { flex: 1, fontSize: 16, color: '#1E1B4B', fontWeight: '700', padding: 0 },

  // —— C. 商品卡 ——
  listWrap: { paddingHorizontal: 14, paddingTop: 12 },
  emptyHint: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: '#FFF', borderRadius: 14,
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginTop: 8 },
  emptySub: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  prodCard: {
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  prodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  prodIndex: { fontSize: 11, fontWeight: '700', color: PURPLE, backgroundColor: '#F5F3FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },

  prodBody: { flexDirection: 'row', gap: 10 },
  prodImg: {
    width: 64, height: 64, borderRadius: 10,
    backgroundColor: '#F5F5FA', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  prodImgText: { fontSize: 9, color: '#B8B8D0', marginTop: 2 },

  prodFields: { flex: 1, gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  input: {
    backgroundColor: '#F5F5FA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 13, color: '#1E1B4B',
  },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6,
  },
  statusBtnActive: {},
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#1E1B4B' },

  field: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F5F5FA', borderRadius: 8, paddingHorizontal: 10,
  },
  fieldLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  fieldInput: { flex: 1, fontSize: 13, color: '#1E1B4B', paddingVertical: 7, fontWeight: '600' },

  adjustRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 4,
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 8,
  },
  // 两列等宽，让"系数"和"实付价"视觉对称
  adjustCol: { flex: 1, alignItems: 'center', gap: 4 },
  adjustLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '700' },
  // 系数 stepper：紧凑步进器（自适应宽度）
  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF', borderRadius: 8,
    paddingHorizontal: 4, paddingVertical: 2,
    alignSelf: 'stretch', justifyContent: 'center',
  },
  stepBtn: {
    width: 22, height: 22, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5F3FF',
  },
  stepValue: { fontSize: 12, fontWeight: '800', color: PURPLE, minWidth: 34, textAlign: 'center' },
  // 实付价输入：与左侧 stepper 等宽（alignSelf: 'stretch' + 内部居中）
  finalPriceEditBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, gap: 2,
    alignSelf: 'stretch',
  },
  finalPriceUnit: { fontSize: 12, fontWeight: '700', color: PINK },
  finalPriceInput: {
    fontSize: 14, fontWeight: '800', color: PINK,
    padding: 0, textAlign: 'center', minWidth: 0, flexShrink: 1,
  },

  // —— + 继续添加商品 ——
  addCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: PURPLE + '40', borderStyle: 'dashed',
  },
  addCardText: { fontSize: 14, fontWeight: '700', color: PURPLE },
});

const modalS = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(30,27,75,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 14, paddingBottom: 28, paddingHorizontal: 18,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '700', color: '#1E1B4B' },
  sub: { fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 14 },

  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FAFAFE', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 10,
  },
  methodIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  methodTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  methodSub: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  recBadge: { backgroundColor: PINK, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  recText: { fontSize: 10, fontWeight: '700', color: '#FFF' },

  cancelBtn: { paddingVertical: 12, marginTop: 6, borderRadius: 14, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },

  groupInput: {
    backgroundColor: '#F5F5FA', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1E1B4B',
  },
  cancelBtn2: { flex: 1, paddingVertical: 13, borderRadius: 22, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelText2: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 22, alignItems: 'center', backgroundColor: PURPLE },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  aiCard: {
    marginHorizontal: 40,
    backgroundColor: '#FFF', borderRadius: 24,
    paddingVertical: 30, paddingHorizontal: 24, alignItems: 'center',
  },
  aiIconWrap: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  aiTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B4B' },
  aiSub: { fontSize: 12, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  aiBarTrack: { width: '100%', height: 4, borderRadius: 2, backgroundColor: '#F3F4F6', marginTop: 18, overflow: 'hidden' },
  aiBarFill: { height: 4, backgroundColor: PURPLE, borderRadius: 2 },
});

// —— 编辑分组 / 表格导入 全屏页样式 ——
const pageS = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingTop: 48, paddingBottom: 12,
    backgroundColor: '#FFF',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B4B' },
  headerAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 14, backgroundColor: '#F5F3FF',
  },
  headerAddText: { fontSize: 12, fontWeight: '700', color: PURPLE },

  helpBar: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginHorizontal: 14, marginTop: 12, paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: '#FFFBEB', borderRadius: 10,
    borderLeftWidth: 3, borderLeftColor: '#F59E0B',
  },
  helpText: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 16 },

  gCard: {
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
    shadowColor: '#1E1B4B', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  gHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gIndex: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  gIndexText: { fontSize: 12, fontWeight: '800', color: PURPLE },
  gName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  gIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  gMeta: { fontSize: 11, color: '#6B7280', marginTop: 6, lineHeight: 16 },

  gActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  gBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
  },
  gBtnDisabled: { backgroundColor: '#FAFAFA', borderColor: '#F3F4F6' },
  gBtnDelete: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  gBtnText: { fontSize: 11, fontWeight: '700', color: '#374151' },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 26,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: PURPLE, paddingVertical: 14, borderRadius: 24,
  },
  doneText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});

// —— 表格导入子样式 ——
const tableS = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 30, gap: 16 },
  bodyHint: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 8 },
  bigBtn: {
    alignItems: 'center', paddingVertical: 28,
    backgroundColor: '#FFF', borderRadius: 18,
    borderWidth: 1.5, borderColor: '#F3F4F6',
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  bigBtnIcon: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  bigBtnTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B4B' },
  bigBtnSub: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  parsingWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40,
  },
  parsingTitle: { fontSize: 18, fontWeight: '700', color: '#1E1B4B' },
  parsingSub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  previewIdx: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
  },
  previewIdxText: { fontSize: 12, fontWeight: '700', color: PURPLE },
  previewName: { fontSize: 14, fontWeight: '600', color: '#1E1B4B' },
  previewMeta: { fontSize: 11, color: '#9CA3AF' },
  previewFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  previewConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: PURPLE, borderRadius: 16, paddingVertical: 14,
  },
  previewConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});

// ====================================================================
// DraggableGroupCard
// ====================================================================
// 单卡片高度（gCard padding + gHead 26 + gMeta + gActions ≈ 120）
const DRAG_ITEM_HEIGHT = 120;

function DraggableGroupCard({
  idx,
  total,
  onMove,
  children,
}: {
  idx: number;
  total: number;
  onMove: (delta: number) => void;
  children: React.ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const draggingRef = useRef(false);

  const finalize = (dy: number) => {
    const delta = Math.round(dy / DRAG_ITEM_HEIGHT);
    if (delta !== 0) {
      const newIdx = Math.max(0, Math.min(total - 1, idx + delta));
      onMove(newIdx - idx);
    }
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    setDragging(false);
    draggingRef.current = false;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => draggingRef.current,
      onMoveShouldSetPanResponder: () => draggingRef.current,
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => finalize(gesture.dy),
      onPanResponderTerminate: (_, gesture) => finalize(gesture.dy),
    })
  ).current;

  const startDrag = () => {
    draggingRef.current = true;
    setDragging(true);
  };

  return (
    <Animated.View
      style={[
        pageS.gCard,
        dragging && dragS.dragging,
        { transform: [{ translateY }] },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={dragS.handleRow}>
        <View style={{ flex: 1 }}>{children}</View>
        <Pressable
          onLongPress={startDrag}
          delayLongPress={180}
          hitSlop={10}
          style={[dragS.handleBtn, dragging && dragS.handleBtnActive]}
        >
          <Ionicons name="reorder-three" size={22} color={dragging ? '#FFF' : '#9CA3AF'} />
          <Text style={[dragS.handleHint, dragging && { color: '#FFF' }]}>
            {dragging ? '拖动' : '长按'}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const dragS = StyleSheet.create({
  handleRow: { flexDirection: 'row', alignItems: 'stretch', gap: 6 },
  handleBtn: {
    width: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: '#F5F5FA',
    paddingVertical: 6,
  },
  handleBtnActive: { backgroundColor: '#7C3AED' },
  handleHint: { fontSize: 9, color: '#9CA3AF', marginTop: 2, fontWeight: '700' },
  dragging: {
    zIndex: 100,
    shadowColor: '#7C3AED', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: 1.5, borderColor: '#7C3AED',
    opacity: 0.96,
  },
});
