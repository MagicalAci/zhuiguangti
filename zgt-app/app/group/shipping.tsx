import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable,
  TextInput, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../src/store/useStore';

const PURPLE = '#7C3AED';
const BLUE = '#3B82F6';

interface PendingOrder {
  id: string;
  orderNo: string;
  userName: string;
  userAvatar: string;
  groupId: string;
  groupName: string;
  items: string;
  amount: number;
  address: string;
}

// —— mock 待发货订单 ——
const MOCK_PENDING: PendingOrder[] = [
  { id: 'po1', orderNo: 'ZGT20260518001', userName: '星月',    userAvatar: '星', groupId: 'g1', groupName: '偶像梦幻祭 6月新谷代购团', items: '朔间零 吧唧 ×1 · 全员集合 海报 ×1', amount: 73,    address: '浙江省杭州市余杭区梦想小镇 4 号楼 502' },
  { id: 'po2', orderNo: 'ZGT20260518002', userName: '七七',    userAvatar: '七', groupId: 'g1', groupName: '偶像梦幻祭 6月新谷代购团', items: '天城一彩 吧唧 ×1',                amount: 35,    address: '上海市浦东新区张江高科 1888 号' },
  { id: 'po3', orderNo: 'ZGT20260518003', userName: '小鹿',    userAvatar: '小', groupId: 'g1', groupName: '偶像梦幻祭 6月新谷代购团', items: '冰鹰 立牌 ×1',                    amount: 28,    address: '北京市朝阳区望京 SOHO T1 1208' },
  { id: 'po4', orderNo: 'ZGT20260518004', userName: '柚子',    userAvatar: '柚', groupId: 'g2', groupName: '名侦探柯南 一番赏代抽',    items: '柯南 A 赏立牌 ×1 + B 赏挂件 ×2',  amount: 168,   address: '广东省深圳市南山区科技园 88 栋' },
  { id: 'po5', orderNo: 'ZGT20260518005', userName: '棉花糖',  userAvatar: '棉', groupId: 'g3', groupName: '原神 4.5 卡池代抽',        items: '阿蕾奇诺 立牌 ×1',                 amount: 47.25, address: '四川省成都市高新区天府软件园 D 区' },
  { id: 'po6', orderNo: 'ZGT20260518006', userName: '初雪',    userAvatar: '初', groupId: 'g3', groupName: '原神 4.5 卡池代抽',        items: '阿蕾奇诺 挂件 ×2',                 amount: 94.5,  address: '江苏省南京市鼓楼区珠江路 88 号' },
];

export default function ShippingManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groups } = useStore();

  // —— 状态 ——
  const [orders, setOrders] = useState<PendingOrder[]>(MOCK_PENDING);
  /** 待提交的单号缓存：orderId -> trackingNo */
  const [trackings, setTrackings] = useState<Record<string, string>>({});
  /** 已确认发货的订单 id 集合 */
  const [shipped, setShipped] = useState<Set<string>>(new Set());

  // —— 拼团筛选 ——
  const [filterGroupId, setFilterGroupId] = useState<string | 'all'>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  // —— 批量导入 ——
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [batchText, setBatchText] = useState('');

  // —— 过滤后的订单 ——
  const filtered = useMemo(() => {
    if (filterGroupId === 'all') return orders;
    return orders.filter((o) => o.groupId === filterGroupId);
  }, [orders, filterGroupId]);

  /** 每个团的待发货数量（用于筛选弹层显示） */
  const groupCounts = useMemo(() => {
    const c: Record<string, number> = {};
    orders.forEach((o) => { c[o.groupId] = (c[o.groupId] ?? 0) + 1; });
    return c;
  }, [orders]);

  /** 当前筛选状态下的团名 */
  const filterLabel = filterGroupId === 'all'
    ? '全部拼团'
    : (groups.find((g) => g.id === filterGroupId)?.name ?? orders.find((o) => o.groupId === filterGroupId)?.groupName ?? '已筛选');

  const updateTracking = (orderId: string, v: string) => {
    setTrackings((prev) => ({ ...prev, [orderId]: v }));
  };

  const handleConfirmShip = (o: PendingOrder) => {
    const t = (trackings[o.id] ?? '').trim();
    if (!t) {
      Alert.alert('请先填写快递单号');
      return;
    }
    setShipped((prev) => new Set(prev).add(o.id));
    setTimeout(() => {
      setOrders((prev) => prev.filter((x) => x.id !== o.id));
    }, 500);
  };

  const handleBatchShipAll = () => {
    const ready = filtered.filter((o) => (trackings[o.id] ?? '').trim().length > 0 && !shipped.has(o.id));
    if (ready.length === 0) {
      Alert.alert('提示', '请先填写至少一个订单的快递单号，或使用「批量导入」一键填写');
      return;
    }
    Alert.alert('批量发货', `确认将 ${ready.length} 笔订单标记为已发货？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认发货',
        onPress: () => {
          setShipped((prev) => {
            const next = new Set(prev);
            ready.forEach((o) => next.add(o.id));
            return next;
          });
          setTimeout(() => {
            setOrders((prev) => prev.filter((x) => !ready.some((r) => r.id === x.id)));
          }, 500);
        },
      },
    ]);
  };

  /**
   * 解析 CSV：「订单号,快递单号[,快递公司]」。
   * 兼容：
   *  - 标准英文逗号
   *  - 第一行可为表头（含"订单号" / "order" 等字样时跳过）
   *  - 值带半角引号包裹
   *  - 老格式：制表符 / 空格 / 中文逗号 / 分号 / 冒号 也兼容
   */
  const handleBatchImport = () => {
    const lines = batchText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { Alert.alert('提示', '请先粘贴 CSV 内容或拖入 CSV 文件'); return; }

    // 第一行如包含表头关键字则跳过
    let startIdx = 0;
    const firstLower = lines[0].toLowerCase();
    if (/订单号|order|快递单|tracking/.test(firstLower)) startIdx = 1;

    const map: Record<string, string> = {};
    let matched = 0;
    let unmatched = 0;

    const stripQuote = (s: string) => s.replace(/^"|"$/g, '').trim();

    for (let i = startIdx; i < lines.length; i++) {
      const l = lines[i];
      const parts = l.split(/[,，\t;；\s|:]+/).map(stripQuote).filter(Boolean);
      if (parts.length < 2) continue;
      const [orderNo, tracking] = parts;
      const target = orders.find((o) => o.orderNo === orderNo);
      if (target) { map[target.id] = tracking; matched++; }
      else unmatched++;
    }

    if (matched === 0) {
      Alert.alert('未匹配', 'CSV 中没有可识别的订单号 · 请检查列顺序（第 1 列订单号 · 第 2 列快递单号）');
      return;
    }
    setTrackings((prev) => ({ ...prev, ...map }));
    setBatchImportOpen(false);
    setBatchText('');
    Alert.alert(
      '已填入',
      `成功匹配 ${matched} 条${unmatched > 0 ? ` · ${unmatched} 条订单号未找到` : ''}，请检查后点击「批量发货」`,
    );
  };

  const insertSampleTemplate = () => {
    const header = '订单号,快递单号';
    const rows = orders.slice(0, 3).map((o, i) => `${o.orderNo},SF${Date.now().toString().slice(-8)}${i}`);
    setBatchText([header, ...rows].join('\n'));
  };

  /** 下载 CSV 模板（Web 端可直接触发下载） */
  const downloadCsvTemplate = () => {
    const csv = '订单号,快递单号\n' + orders.map((o) => `${o.orderNo},`).join('\n');
    if (typeof window !== 'undefined' && (window as any).URL?.createObjectURL) {
      try {
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = (window as any).URL.createObjectURL(blob);
        const a = (window as any).document.createElement('a');
        a.href = url;
        a.download = `待发货模板_${Date.now()}.csv`;
        a.click();
        (window as any).URL.revokeObjectURL(url);
        return;
      } catch {/* fallthrough */}
    }
    // 原生端 / 不支持下载时退化为预览
    setBatchText(csv);
    Alert.alert('模板已填入文本框', '请保存为 .csv 后用 Excel/WPS/飞书表格填写快递单号，再粘贴回来');
  };

  return (
    <View style={s.screen}>
      {/* —— 顶栏 —— */}
      <LinearGradient
        colors={[BLUE, '#60A5FA']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.topRow}>
          <Pressable style={s.iconBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <Text style={s.title}>待发货管理</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={s.headerSub}>
          共 <Text style={{ fontWeight: '800' }}>{orders.length}</Text> 单待发货 · 可单条 / 批量发货
        </Text>
      </LinearGradient>

      {/* —— 筛选 + 批量导入工具栏 —— */}
      <View style={s.toolBar}>
        <Pressable style={s.filterChip} onPress={() => setFilterOpen(true)}>
          <Ionicons name="funnel-outline" size={13} color={PURPLE} />
          <Text style={s.filterChipText} numberOfLines={1}>{filterLabel}</Text>
          <View style={s.filterChipBadge}>
            <Text style={s.filterChipBadgeText}>{filtered.length}</Text>
          </View>
        </Pressable>
        <Pressable style={s.toolBtn} onPress={() => setBatchImportOpen(true)}>
          <Ionicons name="cloud-upload-outline" size={14} color={PURPLE} />
          <Text style={s.toolBtnText}>导入 CSV</Text>
        </Pressable>
      </View>

      {/* —— 订单列表 —— */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color="#E5E7EB" />
            <Text style={s.emptyTitle}>没有待发货订单</Text>
            <Text style={s.emptySub}>所有订单都已处理完毕</Text>
          </View>
        ) : (
          filtered.map((o) => (
            <View key={o.id} style={[s.card, shipped.has(o.id) && { opacity: 0.5 }]}>
              {/* 顶部 · 用户 + 单号 */}
              <View style={s.cardTop}>
                <View style={s.userBlock}>
                  <View style={s.userAvatar}>
                    <Text style={s.userAvatarText}>{o.userAvatar}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.userName}>{o.userName}</Text>
                    <Text style={s.orderNo}>单号 {o.orderNo}</Text>
                  </View>
                </View>
                <Text style={s.amount}>¥{o.amount.toFixed(0)}</Text>
              </View>

              {/* 商品 */}
              <View style={s.metaRow}>
                <Ionicons name="cube-outline" size={12} color="#9CA3AF" />
                <Text style={s.metaText} numberOfLines={2}>{o.items}</Text>
              </View>
              {/* 团名 + 地址 */}
              <View style={s.metaRow}>
                <Ionicons name="people-outline" size={12} color="#9CA3AF" />
                <Text style={s.metaText} numberOfLines={1}>{o.groupName}</Text>
              </View>
              <View style={s.metaRow}>
                <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                <Text style={s.metaText} numberOfLines={1}>{o.address}</Text>
              </View>

              {/* 单号输入 + 发货按钮 */}
              <View style={s.shipRow}>
                <View style={s.trackInput}>
                  <Ionicons name="paper-plane-outline" size={13} color={PURPLE} />
                  <TextInput
                    style={s.trackField}
                    placeholder="填入快递单号"
                    placeholderTextColor="#C4C4D4"
                    value={trackings[o.id] ?? ''}
                    onChangeText={(v) => updateTracking(o.id, v)}
                    editable={!shipped.has(o.id)}
                  />
                  {!!(trackings[o.id] ?? '').length && !shipped.has(o.id) && (
                    <Pressable onPress={() => updateTracking(o.id, '')} hitSlop={6}>
                      <Ionicons name="close-circle" size={14} color="#C4C4D4" />
                    </Pressable>
                  )}
                </View>
                <Pressable
                  style={[s.shipBtn, (shipped.has(o.id) || !(trackings[o.id] ?? '').trim()) && s.shipBtnDisabled]}
                  disabled={shipped.has(o.id) || !(trackings[o.id] ?? '').trim()}
                  onPress={() => handleConfirmShip(o)}
                >
                  {shipped.has(o.id) ? (
                    <>
                      <Ionicons name="checkmark" size={13} color="#FFF" />
                      <Text style={s.shipBtnText}>已发货</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="send" size={13} color="#FFF" />
                      <Text style={s.shipBtnText}>确认发货</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* —— 底部批量发货 CTA —— */}
      {filtered.length > 0 && (
        <View style={[s.bottomBar, { paddingBottom: 10 + insets.bottom }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.bottomLabel}>已填单号 <Text style={{ color: BLUE, fontWeight: '800' }}>{filtered.filter((o) => (trackings[o.id] ?? '').trim().length > 0 && !shipped.has(o.id)).length}</Text> / {filtered.length}</Text>
            <Text style={s.bottomSub}>点击「批量发货」一次性标记所有已填单号的订单为已发货</Text>
          </View>
          <Pressable style={s.batchBtn} onPress={handleBatchShipAll}>
            <LinearGradient
              colors={[BLUE, '#60A5FA']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.batchBtnInner}
            >
              <Ionicons name="send" size={15} color="#FFF" />
              <Text style={s.batchBtnText}>批量发货</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* —— 拼团筛选 Modal —— */}
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={modalS.overlay} onPress={() => setFilterOpen(false)}>
          <Pressable style={modalS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={modalS.handle} />
            <Text style={modalS.title}>按拼团筛选</Text>
            <Text style={modalS.sub}>只看某一个拼团的待发货订单</Text>

            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 8 }}>
              <Pressable
                style={[modalS.row, filterGroupId === 'all' && modalS.rowActive]}
                onPress={() => { setFilterGroupId('all'); setFilterOpen(false); }}
              >
                <View style={[modalS.rowIcon, { backgroundColor: '#F5F3FF' }]}>
                  <Ionicons name="grid" size={14} color={PURPLE} />
                </View>
                <Text style={[modalS.rowText, filterGroupId === 'all' && modalS.rowTextActive]}>全部拼团</Text>
                <View style={modalS.rowCount}>
                  <Text style={modalS.rowCountText}>{orders.length}</Text>
                </View>
                {filterGroupId === 'all' && <Ionicons name="checkmark-circle" size={16} color={PURPLE} />}
              </Pressable>

              {Object.keys(groupCounts).map((gid) => {
                const group = groups.find((g) => g.id === gid);
                const gn = group?.name ?? orders.find((o) => o.groupId === gid)?.groupName ?? gid;
                const active = filterGroupId === gid;
                return (
                  <Pressable
                    key={gid}
                    style={[modalS.row, active && modalS.rowActive]}
                    onPress={() => { setFilterGroupId(gid); setFilterOpen(false); }}
                  >
                    <View style={[modalS.rowIcon, { backgroundColor: '#FFF1F2' }]}>
                      <Ionicons name="people" size={14} color="#F43F5E" />
                    </View>
                    <Text style={[modalS.rowText, active && modalS.rowTextActive]} numberOfLines={1}>{gn}</Text>
                    <View style={modalS.rowCount}>
                      <Text style={modalS.rowCountText}>{groupCounts[gid]}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={16} color={PURPLE} />}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable style={modalS.cancelBtn} onPress={() => setFilterOpen(false)}>
              <Text style={modalS.cancelText}>关闭</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 批量导入 CSV Modal —— */}
      <Modal visible={batchImportOpen} transparent animationType="slide" onRequestClose={() => setBatchImportOpen(false)}>
        <Pressable style={modalS.overlay} onPress={() => setBatchImportOpen(false)}>
          <Pressable style={modalS.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={modalS.handle} />
            <View style={importS.titleRow}>
              <Text style={modalS.title}>批量导入 CSV</Text>
              <View style={importS.csvBadge}>
                <Ionicons name="document-text" size={10} color="#10B981" />
                <Text style={importS.csvBadgeText}>.csv</Text>
              </View>
            </View>
            <Text style={modalS.sub}>用 Excel / WPS / Numbers / 飞书表格编辑 CSV 文件，复制内容粘贴到下方</Text>

            <View style={importS.formatBox}>
              <View style={importS.formatHeader}>
                <Ionicons name="information-circle-outline" size={13} color={PURPLE} />
                <Text style={importS.formatTitle}>CSV 格式要求</Text>
              </View>
              <Text style={importS.formatText}>
                <Text style={{ fontWeight: '800' }}>表头（可选）：</Text>订单号,快递单号{'\n'}
                <Text style={{ fontWeight: '800' }}>数据行：</Text>每行 1 条订单 · 列用英文逗号分隔
              </Text>
              <View style={importS.actionRow}>
                <Pressable style={importS.actionBtn} onPress={downloadCsvTemplate}>
                  <Ionicons name="download-outline" size={11} color="#FFF" />
                  <Text style={importS.actionBtnText}>下载 CSV 模板</Text>
                </Pressable>
                <Pressable style={[importS.actionBtn, { backgroundColor: '#FFF', borderWidth: 1, borderColor: PURPLE }]} onPress={insertSampleTemplate}>
                  <Ionicons name="document-text-outline" size={11} color={PURPLE} />
                  <Text style={[importS.actionBtnText, { color: PURPLE }]}>填入示例</Text>
                </Pressable>
              </View>
            </View>

            <View style={importS.textBox}>
              <TextInput
                style={importS.text}
                multiline
                placeholder={`订单号,快递单号\nZGT20260518001,SF1234567890\nZGT20260518002,YT9876543210\nZGT20260518003,JD5566778899`}
                placeholderTextColor="#C4C4D4"
                value={batchText}
                onChangeText={setBatchText}
                textAlignVertical="top"
              />
            </View>

            <View style={importS.btnRow}>
              <Pressable style={importS.cancelBtn} onPress={() => setBatchImportOpen(false)}>
                <Text style={importS.cancelText}>取消</Text>
              </Pressable>
              <Pressable style={importS.confirmBtn} onPress={handleBatchImport}>
                <LinearGradient
                  colors={[PURPLE, '#A855F7']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={importS.confirmInner}
                >
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                  <Text style={importS.confirmText}>解析并填入</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  header: {
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
  headerSub: { marginTop: 10, color: 'rgba(255,255,255,0.92)', fontSize: 12 },

  toolBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#FFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    flex: 1,
  },
  filterChipText: { flex: 1, fontSize: 12, color: '#1E1B4B', fontWeight: '700' },
  filterChipBadge: { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: '#F5F3FF', borderRadius: 6 },
  filterChipBadgeText: { fontSize: 10, fontWeight: '800', color: PURPLE },

  toolBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#F5F3FF', borderRadius: 12,
  },
  toolBtnText: { fontSize: 12, fontWeight: '700', color: PURPLE },

  card: {
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 12,
    marginTop: 10,
    shadowColor: '#1E1B4B', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userBlock: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  userAvatar: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontSize: 13, fontWeight: '800', color: PURPLE },
  userName: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  orderNo: { fontSize: 11, color: '#9CA3AF', marginTop: 2, fontVariant: ['tabular-nums'] as any },
  amount: { fontSize: 16, fontWeight: '800', color: '#F43F5E' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { flex: 1, fontSize: 11, color: '#6B7280', lineHeight: 16 },

  shipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  trackInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#F8F8FC', borderRadius: 10,
  },
  trackField: { flex: 1, fontSize: 13, color: '#1E1B4B', padding: 0 },
  shipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, backgroundColor: BLUE,
  },
  shipBtnDisabled: { backgroundColor: '#C4C4D4' },
  shipBtnText: { fontSize: 12, fontWeight: '800', color: '#FFF' },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingTop: 10,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    shadowColor: '#1E1B4B', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12,
  },
  bottomLabel: { fontSize: 12, color: '#6B7280' },
  bottomSub: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  batchBtn: { borderRadius: 22, overflow: 'hidden' },
  batchBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 18, paddingVertical: 12,
  },
  batchBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B4B', marginTop: 8 },
  emptySub: { fontSize: 11, color: '#9CA3AF' },
});

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 12, paddingHorizontal: 18, paddingBottom: 24,
    maxHeight: '90%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: '#1E1B4B' },
  sub: { fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 14 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 10,
    borderRadius: 12, backgroundColor: '#FAFAFE',
    marginBottom: 6,
  },
  rowActive: { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE' },
  rowIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontSize: 13, color: '#1E1B4B', fontWeight: '600' },
  rowTextActive: { color: PURPLE, fontWeight: '800' },
  rowCount: { paddingHorizontal: 7, paddingVertical: 1, backgroundColor: '#F3F4F6', borderRadius: 6 },
  rowCountText: { fontSize: 10, fontWeight: '800', color: '#6B7280' },

  cancelBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: 16, alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
});

const importS = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  csvBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2,
    backgroundColor: '#ECFDF5', borderRadius: 6,
  },
  csvBadgeText: { fontSize: 10, fontWeight: '800', color: '#10B981', fontFamily: undefined },

  formatBox: {
    backgroundColor: '#F5F3FF', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 10,
    marginTop: 12,
  },
  formatHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  formatTitle: { fontSize: 12, fontWeight: '800', color: PURPLE },
  formatText: { marginTop: 4, fontSize: 11, color: '#5B21B6', lineHeight: 18 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, backgroundColor: PURPLE,
  },
  actionBtnText: { fontSize: 11, fontWeight: '800', color: '#FFF' },

  sampleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    marginTop: 8, paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: '#FFF', borderRadius: 8,
  },
  sampleBtnText: { fontSize: 11, fontWeight: '700', color: PURPLE },

  textBox: {
    marginTop: 12,
    backgroundColor: '#FAFAFE', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    minHeight: 160, maxHeight: 240,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  text: { flex: 1, fontSize: 12, color: '#1E1B4B', minHeight: 140, fontFamily: undefined },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  confirmBtn: { flex: 1.5, borderRadius: 16, overflow: 'hidden' },
  confirmInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 12,
  },
  confirmText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});
