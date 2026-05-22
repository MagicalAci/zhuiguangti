import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, Animated, Easing,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../src/store/useStore';
import { useRole } from '../../src/store/useRole';
import { useMemberOrders } from '../../src/store/useMemberOrders';

const PURPLE = '#7C3AED';
const PINK = '#F43F5E';

// V1 demo:订单 / 格子状态机重排
// 成团中 → 待支付 →(定金团多一步)待付尾款 → 待发货 → 待收货 → 已完成
type CellStatus =
  | 'empty'
  | 'gathering'        // 成团中(团员已下单,未付款,等团长发起收款)
  | 'pending'          // 待支付(团长已发起收款 · 含定金 / 全款)
  | 'finalPending'     // 待付尾款(定金团付完定金后的中间态)
  | 'paid'             // 待发货(已付完款,等团长发货)
  | 'shipped'          // 待收货(团长已发货,等团员确认)
  | 'received';        // 已完成(团员已确认收货)

interface MatrixCell {
  status: CellStatus;
  memberName?: string;     // 团员昵称
  memberAvatar?: string;   // 单字头像
  orderTime?: number;      // 下单时间(用于"凑齐组合"判定)
}

const STATUS_CONFIG: Record<Exclude<CellStatus, 'empty'>, { label: string; color: string; bg: string; emoji: string }> = {
  gathering:    { label: '成团中',   color: '#3B82F6', bg: '#EFF6FF', emoji: '🔵' },
  pending:      { label: '待支付',   color: '#F97316', bg: '#FFF7ED', emoji: '🟠' },
  finalPending: { label: '待付尾款', color: '#A855F7', bg: '#F5F3FF', emoji: '🟣' },
  paid:         { label: '待发货',   color: '#10B981', bg: '#ECFDF5', emoji: '🟢' },
  shipped:      { label: '待收货',   color: '#0EA5E9', bg: '#E0F2FE', emoji: '🚚' },
  received:     { label: '已完成',   color: '#6B7280', bg: '#F3F4F6', emoji: '✅' },
};

const MOCK_NAMES = ['星月', '七七', '小鹿', '柚子', '棉花糖', '阿澈', '夏目', '初雪', '泡芙', '栗子', '团子', '桃酥', '柠檬', '芋圆', '布丁'];

// —— 生成 mock 矩阵数据 ——
// 假设 5 个 SKU 列、每列 8 行
// 状态分布(便于 demo 同时展示 6 种状态):
//   第 0 行(假定团长已经发起收款): pending / finalPending / paid / shipped
//   第 1 行(假定已发货): paid / shipped / received
//   其余行(凑车阶段): 大量 gathering + 少量空位
function buildMockMatrix(cols: number, rows: number, gridSeed: string): MatrixCell[][] {
  const grid: MatrixCell[][] = [];
  let nameIdx = 0;
  const seed = gridSeed.length;
  for (let c = 0; c < cols; c++) {
    const col: MatrixCell[] = [];
    for (let r = 0; r < rows; r++) {
      const v = (seed + c * 13 + r * 7) % 17;
      let status: CellStatus;
      if (r === 0) {
        // 第一辆车:演示已发起收款的状态
        if (v <= 2) status = 'shipped';
        else if (v <= 5) status = 'paid';
        else if (v <= 8) status = 'finalPending';
        else status = 'pending';
      } else if (r === 1) {
        // 第二辆车:演示发货后的状态
        if (v <= 2) status = 'empty';
        else if (v <= 5) status = 'received';
        else if (v <= 9) status = 'shipped';
        else if (v <= 12) status = 'paid';
        else status = 'finalPending';
      } else {
        // 其余行:多为成团中(凑车阶段)
        if (v <= 10) status = 'empty';
        else status = 'gathering';
      }

      if (status === 'empty') {
        col.push({ status });
      } else {
        const name = MOCK_NAMES[(nameIdx++) % MOCK_NAMES.length];
        col.push({
          status,
          memberName: name,
          memberAvatar: name[0],
          orderTime: 1716000000000 + (c * 1000 + r) * 60000,
        });
      }
    }
    grid.push(col);
  }
  return grid;
}

// —— 判断某一行是否满行（所有列都非空） ——
function isRowFull(grid: MatrixCell[][], row: number): boolean {
  if (grid.length === 0) return false;
  for (let c = 0; c < grid.length; c++) {
    if (!grid[c][row] || grid[c][row].status === 'empty') return false;
  }
  return true;
}

// —— 行满才视为「已成团」 normalize ——
// V1 demo 规则:
// - 行未满 → 该行所有非空格子都是「成团中(gathering)」,等团长发起收款
// - 行已满 → 保留 mock 的原状态(pending / finalPending / paid / shipped / received),
//   体现"团长已经发起收款 / 已经发货 / 已经确认收货"等不同阶段
function normalizeByRow(grid: MatrixCell[][]): MatrixCell[][] {
  if (grid.length === 0) return grid;
  const rows = grid[0]?.length ?? 0;
  const next = grid.map((c) => c.slice());
  for (let r = 0; r < rows; r++) {
    const rowFull = isRowFull(next, r);
    for (let c = 0; c < next.length; c++) {
      const cell = next[c][r];
      if (cell.status === 'empty') continue;
      if (!rowFull) {
        // 行未满:所有非空格子统一显示「成团中」
        if (cell.status !== 'gathering') next[c][r] = { ...cell, status: 'gathering' };
      }
      // 行已满: 保留 mock 中的进阶状态
    }
  }
  return next;
}

// —— 计算已成盒数 ——
// V1：满行 = 1 盒成团
function calcMatchedBoxes(grid: MatrixCell[][]) {
  if (grid.length === 0) return 0;
  const rows = grid[0]?.length ?? 0;
  let cnt = 0;
  for (let r = 0; r < rows; r++) if (isRowFull(grid, r)) cnt++;
  return cnt;
}

export default function MatrixScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, view } = useLocalSearchParams<{ id: string; view?: 'leader' | 'member' }>();
  const store = useStore();
  const { role } = useRole();
  const { placed } = useMemberOrders();
  // 视角优先级：路由 view 参数 > 全局 role（与 /group/[id] 保持一致）
  const isLeader = view ? view === 'leader' : role === 'leader';
  const group = store.groups.find((g) => g.id === id);
  const myPlacedQty = !isLeader && id ? (placed[id] ?? 0) : 0;

  // —— 子分组 Tab ——
  const skuGroups = useMemo(() => {
    if (!group) return [{ key: 'all', label: '全部 SKU', products: [] as { id: string; name: string }[] }];
    // mock：按商品名前缀生成分组，对应"页面 3 添加的分组"
    const groupMap = new Map<string, { id: string; name: string }[]>();
    group.products.forEach((p) => {
      const prefix = p.name.split(' ')[0] || '其他';
      const arr = groupMap.get(prefix) ?? [];
      arr.push({ id: p.id, name: p.name });
      groupMap.set(prefix, arr);
    });
    return [
      { key: 'all', label: '全部 SKU', products: group.products.map((p) => ({ id: p.id, name: p.name })) },
      ...Array.from(groupMap.entries()).slice(0, 5).map(([key, products]) => ({ key, label: key, products })),
    ];
  }, [group]);

  const [activeTab, setActiveTab] = useState('all');
  const activeGroup = skuGroups.find((g) => g.key === activeTab) ?? skuGroups[0];

  // —— 按调价系数从高到低排列 5 个 SKU 列 ——
  // 用商品名前 5 个，模拟 [兔子 / 狐狸 / 小熊 / 松鼠 / 企鹅] 等
  const columns = useMemo(() => {
    const list = activeGroup?.products ?? [];
    // 取前 5 个商品作为列，调价系数按 ×1.5, ×1.2, ×1.0, ×0.9, ×0.8
    const mults = [1.5, 1.2, 1.0, 0.9, 0.8];
    return list.slice(0, 5).map((p, i) => ({
      id: p.id,
      name: p.name,
      mult: mults[i] ?? 1.0,
    }));
  }, [activeGroup]);

  const ROWS = 8;
  const COLS = columns.length;

  // —— 矩阵数据 ——
  const [grid, setGrid] = useState<MatrixCell[][]>([]);
  useEffect(() => {
    const m = buildMockMatrix(COLS, ROWS, (group?.id ?? '') + activeTab);

    if (isLeader) {
      // 团长视角：在最后一列找一个空位或将一个非空格替换为"团长占位"
      // 优先放空位（不破坏 mock），找不到再覆盖现有格
      let placed = false;
      const lastCol = m.length - 1;
      if (lastCol >= 0) {
        for (let r = 0; r < m[lastCol].length; r++) {
          if (m[lastCol][r].status === 'empty') {
            m[lastCol][r] = { status: 'gathering', memberName: '团长', memberAvatar: '团', orderTime: Date.now() };
            placed = true;
            break;
          }
        }
        if (!placed) {
          m[lastCol][m[lastCol].length - 1] = { status: 'gathering', memberName: '团长', memberAvatar: '团', orderTime: Date.now() };
        }
      }
    } else {
      // 团员视角：根据「下单件数」把头像填进第一辆车（row=0）的位置
      // 没有下单 → 不强制填充；有下单 → 优先填空位，无空位则覆盖已有
      if (myPlacedQty > 0) {
        let remaining = Math.min(myPlacedQty, m.length);
        let r = 0;
        for (let c = 0; c < m.length && remaining > 0; c++) {
          if (m[c][r].status === 'empty') {
            m[c][r] = { status: 'gathering', memberName: '我', memberAvatar: '我', orderTime: Date.now() };
            remaining--;
          }
        }
        if (remaining > 0) {
          for (let c = 0; c < m.length && remaining > 0; c++) {
            if (m[c][r].memberName !== '我') {
              m[c][r] = { status: 'gathering', memberName: '我', memberAvatar: '我', orderTime: Date.now() };
              remaining--;
            }
          }
        }
      }
    }
    // 强制套用「行满才成团」规则
    setGrid(normalizeByRow(m));
  }, [COLS, ROWS, group?.id, activeTab, isLeader, myPlacedQty]);

  // —— 成团弹窗（手动分配凑齐一行时） ——
  const [completedRow, setCompletedRow] = useState<number | null>(null);

  // —— 总进度 ——
  const matchedBoxes = calcMatchedBoxes(grid);

  // —— 撤排模式（仅团长 · 单点踢人） ——
  const [removeMode, setRemoveMode] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ col: number; row: number } | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const removeBtnPulse = useRef(new Animated.Value(0)).current;

  // —— 砍排模式（仅团长 · 整行取消，常用于凑不齐的位置） ——
  const [chopMode, setChopMode] = useState(false);
  const [chopConfirmRow, setChopConfirmRow] = useState<number | null>(null);
  const chopBtnPulse = useRef(new Animated.Value(0)).current;

  // —— 一键收款 · 二次确认 Modal ——
  const [collectModalOpen, setCollectModalOpen] = useState(false);

  // —— 📖 说明 Modal ——
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // —— 手动分配模式（仅团长） ——
  const [assignMode, setAssignMode] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number } | null>(null);
  const [assignedHint, setAssignedHint] = useState<string | null>(null);
  const assignPulse = useRef(new Animated.Value(0)).current;

  // —— 我的位置高亮（仅团员） ——
  const [showMyPos, setShowMyPos] = useState(false);
  const minePulse = useRef(new Animated.Value(0)).current;

  // —— 一键催款成功提示（仅团长） ——
  const [urgePaidVisible, setUrgePaidVisible] = useState(false);
  const [urgePaidCount, setUrgePaidCount] = useState(0);

  // 模式切换时清空对方状态(三模式互斥)
  const enterRemove = () => {
    setAssignMode(false);
    setSelectedCell(null);
    setChopMode(false);
    setChopConfirmRow(null);
    setRemoveMode((v) => !v);
  };
  const enterAssign = () => {
    setRemoveMode(false);
    setConfirmTarget(null);
    setChopMode(false);
    setChopConfirmRow(null);
    setAssignMode((v) => !v);
    setSelectedCell(null);
  };
  const enterChop = () => {
    setRemoveMode(false);
    setConfirmTarget(null);
    setAssignMode(false);
    setSelectedCell(null);
    setChopMode((v) => !v);
  };

  useEffect(() => {
    if (!removeMode) {
      pulse.setValue(0);
      removeBtnPulse.setValue(0);
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(removeBtnPulse, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(removeBtnPulse, { toValue: 0, duration: 800, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [removeMode, pulse, removeBtnPulse]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });
  const removeBtnDotOpacity = removeBtnPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  // —— 手动分配脉冲（选中格子时高亮） ——
  useEffect(() => {
    if (!assignMode) { assignPulse.setValue(0); return; }
    Animated.loop(
      Animated.sequence([
        Animated.timing(assignPulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(assignPulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [assignMode, assignPulse]);
  const assignScale = assignPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  // —— "我的位置"高亮脉冲 ——
  useEffect(() => {
    if (!showMyPos) { minePulse.setValue(0); return; }
    Animated.loop(
      Animated.sequence([
        Animated.timing(minePulse, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(minePulse, { toValue: 0, duration: 800, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [showMyPos, minePulse]);
  const mineScale = minePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  // —— 砍排按钮脉冲 ——
  useEffect(() => {
    if (!chopMode) { chopBtnPulse.setValue(0); return; }
    Animated.loop(
      Animated.sequence([
        Animated.timing(chopBtnPulse, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(chopBtnPulse, { toValue: 0, duration: 800, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [chopMode, chopBtnPulse]);
  const chopBtnDotOpacity = chopBtnPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  // —— 砍排:点击任意格子选中整行 ——
  const handleRowChop = (row: number) => {
    if (!isLeader || !chopMode) return;
    setChopConfirmRow(row);
  };

  const handleConfirmChop = () => {
    if (chopConfirmRow === null) return;
    const row = chopConfirmRow;
    const removedMembers: string[] = [];
    setGrid((prev) =>
      prev.map((c) =>
        c.map((cell, ri) => {
          if (ri === row && cell.status !== 'empty') {
            removedMembers.push(cell.memberName ?? '团员');
            return { status: 'empty' as const };
          }
          return cell;
        })
      )
    );
    setChopConfirmRow(null);
    Alert.alert(
      '已砍排',
      removedMembers.length === 0
        ? `第 ${row + 1} 行已为空,无需砍排`
        : `第 ${row + 1} 行所有订单已取消(${removedMembers.length} 位团员)\n${removedMembers.join('、')}\n\n已通知:「您所在的行未凑齐,本次未能成团,订单已取消」`,
    );
  };

  // —— 触发撤排 / 砍排(仅团长) ——
  const handleCellPress = (col: number, row: number) => {
    if (!isLeader) return;
    // 砍排模式:点任意格子选中整行
    if (chopMode) {
      handleRowChop(row);
      return;
    }
    const cell = grid[col]?.[row];

    // —— 手动分配：点击两个格子即交换/移动位置 ——
    if (assignMode) {
      if (!cell) return;
      // 第一次点击：必须点非空格子（要"被移动"的团员）
      if (!selectedCell) {
        if (cell.status === 'empty') {
          setAssignedHint('请先选中一个团员头像');
          setTimeout(() => setAssignedHint(null), 1500);
          return;
        }
        setSelectedCell({ col, row });
        return;
      }
      // 第二次点击：交换或移动
      const { col: c1, row: r1 } = selectedCell;
      if (c1 === col && r1 === row) {
        // 取消选中
        setSelectedCell(null);
        return;
      }
      const aName = grid[c1]?.[r1]?.memberName ?? '团员';
      const bCell = grid[col]?.[row];

      // 先计算 swap + normalize 后的新 grid
      setGrid((prev) => {
        const next = prev.map((c) => c.slice());
        const a = next[c1][r1];
        const b = next[col][row];
        next[c1][r1] = b;
        next[col][row] = a;

        // 检查"目标行 row"或"源行 r1"是否刚刚从未满 → 满
        const targetRowWasFull = isRowFull(prev, row);
        const sourceRowWasFull = isRowFull(prev, r1);
        const targetRowNowFull = isRowFull(next, row);
        const sourceRowNowFull = isRowFull(next, r1);

        let justFull: number | null = null;
        if (!targetRowWasFull && targetRowNowFull) justFull = row;
        else if (!sourceRowWasFull && sourceRowNowFull) justFull = r1;

        if (justFull !== null) {
          setCompletedRow(justFull);
        }
        return normalizeByRow(next);
      });

      if (bCell?.status === 'empty') {
        setAssignedHint(`已把 ${aName} 移到 #${row + 1} 位`);
      } else {
        setAssignedHint(`已交换 ${aName} 与 ${bCell?.memberName ?? '团员'}`);
      }
      setSelectedCell(null);
      setTimeout(() => setAssignedHint(null), 1500);
      return;
    }

    // —— 撤排 ——
    if (removeMode) {
      if (!cell || cell.status === 'empty') return;
      setConfirmTarget({ col, row });
    }
  };

  const handleConfirmRemove = () => {
    if (!confirmTarget) return;
    const { col, row } = confirmTarget;
    const removed = grid[col][row];
    // 该格变成空位（淡出由列表重渲染体现）
    setGrid((prev) =>
      prev.map((c, ci) => (ci === col ? c.map((cell, ri) => (ri === row ? { status: 'empty' as const } : cell)) : c))
    );
    setConfirmTarget(null);
    Alert.alert('已撤排', `已通知 ${removed.memberName}：「您已被团长从『${group?.name ?? '本团'}』拼团中撤除」`);
  };

  // —— 📖 排表说明 Modal · 抽成函数 / 团长 + 团员 + 自制团空态三处共用 ——
  const renderHelpModal = () => (
    <Modal visible={helpModalOpen} transparent animationType="fade" onRequestClose={() => setHelpModalOpen(false)}>
      <Pressable style={modalS.overlay} onPress={() => setHelpModalOpen(false)}>
        <Pressable style={helpS.card} onPress={(e) => e.stopPropagation()}>
          <View style={helpS.header}>
            <View style={[modalS.iconWrap, { backgroundColor: '#F5F3FF', width: 36, height: 36, borderRadius: 18, marginBottom: 0 }]}>
              <Text style={{ fontSize: 18 }}>📖</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={helpS.title}>拼团情况 · 排表说明</Text>
              <Text style={helpS.subTitle}>{isLeader ? '团长视角 · 含 4 个工具按钮详解' : '团员视角 · 看清自己所在的位置'}</Text>
            </View>
            <Pressable hitSlop={10} onPress={() => setHelpModalOpen(false)}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={helpS.body} showsVerticalScrollIndicator={false}>
            <View style={helpS.section}>
              <View style={helpS.sectionTitleRow}>
                <Text style={helpS.sectionEmoji}>📐</Text>
                <Text style={helpS.sectionTitle}>排表基础规则</Text>
              </View>
              <View style={helpS.bulletList}>
                <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}><Text style={helpS.kw}>行</Text> = 上车位 1, 2, 3, ..., N(按团员下单时间顺序排)</Text></View>
                <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}><Text style={helpS.kw}>列</Text> = 每个 SKU(按调价系数从高到低排列,热门款在左)</Text></View>
                <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}><Text style={helpS.kw}>一行所有列都被占满</Text> = 凑齐 1 套 SKU = 已成团 1 盒</Text></View>
                <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}>一行未满 → 该行所有非空格强制显示「成团中」,任何团员都不需要付款</Text></View>
              </View>
            </View>

            <View style={helpS.section}>
              <View style={helpS.sectionTitleRow}>
                <Text style={helpS.sectionEmoji}>🎨</Text>
                <Text style={helpS.sectionTitle}>6 种格子状态</Text>
              </View>
              <View style={helpS.statusGrid}>
                {(['gathering', 'pending', 'finalPending', 'paid', 'shipped', 'received'] as const).map((st) => {
                  const cfg = STATUS_CONFIG[st];
                  return (
                    <View key={st} style={[helpS.statusChip, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                      <View style={[helpS.statusDot, { backgroundColor: cfg.color }]} />
                      <Text style={[helpS.statusLabel, { color: cfg.color }]}>{cfg.emoji} {cfg.label}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={helpS.statusFlow}>成团中 → 待支付 →(待付尾款)→ 待发货 → 待收货 → 已完成</Text>
            </View>

            {isLeader && (
              <View style={helpS.section}>
                <View style={helpS.sectionTitleRow}>
                  <Text style={helpS.sectionEmoji}>🛠</Text>
                  <Text style={helpS.sectionTitle}>团长工具栏 · 4 个工具</Text>
                </View>

                <View style={[helpS.toolCard, { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' }]}>
                  <View style={helpS.toolHead}>
                    <Text style={helpS.toolIcon}>🪓</Text>
                    <Text style={helpS.toolName}>砍排 — 整行取消订单</Text>
                  </View>
                  <Text style={helpS.toolDesc}>
                    点击进入砍排模式 → 点 <Text style={helpS.kw}>#行号</Text> 或行内任意格子 → 二次确认 → 整行所有订单变空位 + 通知本行团员"未能成团"。
                    {'\n'}<Text style={helpS.warn}>⚠️ 不可撤回 · 适合凑不齐永久缺货 SKU 的整行</Text>
                  </Text>
                </View>

                <View style={[helpS.toolCard, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}>
                  <View style={helpS.toolHead}>
                    <Text style={helpS.toolIcon}>🚫</Text>
                    <Text style={helpS.toolName}>撤排 — 单点踢人</Text>
                  </View>
                  <Text style={helpS.toolDesc}>
                    点击进入撤排模式 → 点任意团员头像 → 必填理由(≥5 字)→ 二次确认 → 该格变空位 + 通知该团员"已被撤除"。
                    {'\n'}适合处理跑团 / 恶意挂车 / 多次违规的团员,可一并加入团长黑名单。
                  </Text>
                </View>

                <View style={[helpS.toolCard, { borderColor: '#C4B5FD', backgroundColor: '#F5F3FF' }]}>
                  <View style={helpS.toolHead}>
                    <Text style={helpS.toolIcon}>🧩</Text>
                    <Text style={helpS.toolName}>手动分配 — 交换位置凑齐</Text>
                  </View>
                  <Text style={helpS.toolDesc}>
                    点两个格子完成交换 / 移动 → 系统重新 normalize 行状态。
                    {'\n'}若某行刚被凑满 → 自动弹「✅ 成团」,团长可直接对该行 <Text style={{ fontWeight: '800', color: PINK }}>一键收定金</Text>。
                  </Text>
                </View>

                <View style={[helpS.toolCard, { borderColor: '#FBA4B8', backgroundColor: '#FFF1F2' }]}>
                  <View style={helpS.toolHead}>
                    <Text style={helpS.toolIcon}>📣</Text>
                    <Text style={helpS.toolName}>一键收款 — 通知所有非空位</Text>
                  </View>
                  <Text style={helpS.toolDesc}>
                    点击 → 二次确认 → 统计当前所有非空格子数 N → 推送付款通知 + 把团 stage 推进到对应收款阶段。
                    {'\n'}<Text style={helpS.warn}>建议先用 🪓 砍排 / 🚫 撤排 清掉无效订单,再点本按钮</Text>
                  </Text>
                </View>
              </View>
            )}

            {!isLeader && (
              <View style={helpS.section}>
                <View style={helpS.sectionTitleRow}>
                  <Text style={helpS.sectionEmoji}>💡</Text>
                  <Text style={helpS.sectionTitle}>团员看排表的小贴士</Text>
                </View>
                <View style={helpS.bulletList}>
                  <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}>点底部 <Text style={helpS.kw}>💡 我的位置</Text> → 紫色脉冲高亮自己在矩阵中的格子</Text></View>
                  <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}>所在行 <Text style={helpS.kw}>已凑齐</Text> → 等团长发起收款 / 推送付款通知</Text></View>
                  <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}>所在行 <Text style={helpS.kw}>未凑齐</Text> → 无需付款,可继续等其他团员上车</Text></View>
                  <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}>截团前可回团详情页 [✏️ 修改订单] 加购 / 改 SKU</Text></View>
                  <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}>团已切到"收款中"后 → 新下单会<Text style={helpS.kw}>自动唤起微信支付</Text></Text></View>
                </View>
              </View>
            )}

            <View style={helpS.section}>
              <View style={helpS.sectionTitleRow}>
                <Text style={helpS.sectionEmoji}>💚</Text>
                <Text style={helpS.sectionTitle}>资金 / 收款规则</Text>
              </View>
              <View style={helpS.bulletList}>
                <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}><Text style={helpS.kw}>付款时机</Text>由团长决定,不再"凑齐自动通知付款"</Text></View>
                <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}>团员走 <Text style={helpS.kw}>微信支付</Text> → 资金进哈啰<Text style={helpS.kw}>平台托管账户</Text> · 0 手续费</Text></View>
                <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}>定金团 · 定金团员付完即可提现;尾款必须等团员确认收货后才解锁</Text></View>
                <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}>全款团 · 全款必须等团员确认收货后才解锁放款</Text></View>
                <View style={helpS.bullet}><Text style={helpS.bulletDot}>•</Text><Text style={helpS.bulletText}>截团之前团员可继续下单 / 改单</Text></View>
              </View>
            </View>
          </ScrollView>

          <View style={helpS.footer}>
            <Pressable style={[modalS.confirmBtn, { backgroundColor: PURPLE, flex: 1 }]} onPress={() => setHelpModalOpen(false)}>
              <Ionicons name="checkmark" size={14} color="#FFF" />
              <Text style={modalS.confirmText}>知道了</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (!group) {
    return (
      <View style={s.empty}>
        <Ionicons name="grid-outline" size={40} color="#E5E7EB" />
        <Text style={s.emptyText}>团不存在</Text>
        <Pressable style={s.emptyBtn} onPress={() => router.back()}>
          <Text style={s.emptyBtnText}>返回</Text>
        </Pressable>
      </View>
    );
  }

  // —— 自制开团:无 SKU 排单矩阵,显示友好空态(仍保留入口) ——
  if (group.type === 'custom') {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.topBar}>
          <Pressable hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
          </Pressable>
          <Text style={s.topTitle}>拼团情况</Text>
          <Pressable hitSlop={10} onPress={() => setHelpModalOpen(true)}>
            <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
          </Pressable>
        </View>

        <View style={s.empty}>
          <Text style={{ fontSize: 40 }}>🎨</Text>
          <Text style={[s.emptyText, { marginTop: 12 }]}>自制开团 · 无 SKU 排单矩阵</Text>
          <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 8, textAlign: 'center', paddingHorizontal: 32, lineHeight: 18 }}>
            该团为「自制开团」,商品由团长统一定价 / 数量自定,
            {'\n'}没有 SKU 横向比对的排单矩阵。
            {'\n\n'}已有 <Text style={{ color: PURPLE, fontWeight: '800' }}>{group.memberCount}</Text> 位团员加入 ·
            订单状态请去 [我的订单] 查看。
          </Text>
          <Pressable style={[s.emptyBtn, { marginTop: 20 }]} onPress={() => router.back()}>
            <Text style={s.emptyBtnText}>返回拼团详情</Text>
          </Pressable>
          <Pressable
            style={[s.emptyBtn, { marginTop: 10, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#E9D5FF' }]}
            onPress={() => setHelpModalOpen(true)}
          >
            <Text style={[s.emptyBtnText, { color: PURPLE }]}>📖 查看排表说明</Text>
          </Pressable>
        </View>

        {/* —— 📖 排表说明 Modal(自制开团空态也保留入口) —— */}
        {renderHelpModal()}
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* —— 顶栏 —— */}
      <View style={s.topBar}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
        </Pressable>
        <Text style={s.topTitle}>拼团情况</Text>
        <Pressable hitSlop={10} onPress={() => setHelpModalOpen(true)}>
          <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
        </Pressable>
      </View>

      {/* —— 顶部进度卡 —— */}
      <LinearGradient
        colors={['#F5F3FF', '#FFF1F2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.summaryCard}
      >
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={[s.summaryNum, { color: PINK }]}>{matchedBoxes}</Text>
            <Text style={s.summaryLabel}>已成团盒数</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryNum}>72<Text style={s.summaryNumDim}>:14</Text></Text>
            <Text style={s.summaryLabel}>剩余时间</Text>
          </View>
        </View>

        <View style={s.cutoffRow}>
          <Ionicons name="time-outline" size={12} color="#6B7280" />
          <Text style={s.cutoffText}>截团时间：2026-05-21 23:59</Text>
        </View>

        <View style={s.ruleHint}>
          <Ionicons name="information-circle" size={11} color={PURPLE} />
          <Text style={s.ruleHintText}>
            <Text style={{ fontWeight: '800' }}>订单状态:成团中 → 待支付 → (待付尾款) → 待发货 → 待收货 → 已完成</Text>
            {'\n'}付款时间由团长决定 · 截团前团员可继续下单 / 改单;到「收款中」后下单会自动唤起微信支付 · 团长点 <Text style={{ fontWeight: '800', color: PINK }}>📣 一键收款</Text> 后才通知团员付款
          </Text>
        </View>
      </LinearGradient>

      {/* —— 子分组 Tab —— */}
      <View style={s.tabWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
          {skuGroups.map((tab) => (
            <Pressable
              key={tab.key}
              style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>
                {tab.label} <Text style={{ fontSize: 10, opacity: 0.7 }}>({tab.products.length})</Text>
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* —— 团长:砍排模式提示横幅 —— */}
      {isLeader && chopMode && (
        <View style={[s.warnBanner, s.chopBanner]}>
          <Text style={{ fontSize: 14 }}>🪓</Text>
          <Text style={[s.warnText, { color: '#92400E' }]}>砍排模式 · 点 #行号 或行内任意格子,即可取消该整行(再次弹窗确认 · 不可撤回)</Text>
          <Pressable hitSlop={8} onPress={() => setChopMode(false)}>
            <Ionicons name="close" size={14} color="#92400E" />
          </Pressable>
        </View>
      )}

      {/* —— 团长:撤排模式提示横幅 —— */}
      {isLeader && removeMode && (
        <View style={s.warnBanner}>
          <Ionicons name="warning" size={14} color="#92400E" />
          <Text style={s.warnText}>撤排模式 · 点击任意团员头像即可移除</Text>
          <Pressable hitSlop={8} onPress={() => setRemoveMode(false)}>
            <Ionicons name="close" size={14} color="#92400E" />
          </Pressable>
        </View>
      )}

      {/* —— 团长：手动分配模式提示横幅 —— */}
      {isLeader && assignMode && (
        <View style={[s.warnBanner, s.assignBanner]}>
          <Ionicons name="move" size={14} color={PURPLE} />
          <Text style={[s.warnText, { color: PURPLE }]}>
            {selectedCell
              ? `已选中 ${grid[selectedCell.col]?.[selectedCell.row]?.memberName ?? '团员'} · 再点一个格子完成交换/移动`
              : '手动分配模式 · 先点一个团员头像，再点目标位置即可调整'}
          </Text>
          <Pressable hitSlop={8} onPress={() => { setAssignMode(false); setSelectedCell(null); }}>
            <Ionicons name="close" size={14} color={PURPLE} />
          </Pressable>
        </View>
      )}

      {/* —— 手动分配反馈 Toast —— */}
      {assignedHint && (
        <View style={s.toast}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={s.toastText}>{assignedHint}</Text>
        </View>
      )}

      {/* —— 团员：我的位置高亮提示横幅 —— */}
      {!isLeader && showMyPos && (
        <View style={[s.warnBanner, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}>
          <Ionicons name="locate" size={14} color={PURPLE} />
          <Text style={[s.warnText, { color: PURPLE }]}>已高亮你在矩阵中的位置</Text>
          <Pressable hitSlop={8} onPress={() => setShowMyPos(false)}>
            <Ionicons name="close" size={14} color={PURPLE} />
          </Pressable>
        </View>
      )}

      {/* —— 排单矩阵 —— */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }}>
        {COLS === 0 ? (
          <View style={s.emptyMatrix}>
            <Ionicons name="cube-outline" size={36} color="#E5E7EB" />
            <Text style={s.emptyMatrixText}>该分组下暂无 SKU</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12, paddingBottom: 4 }}>
            <View>
              {/* —— 列标题：SKU 名 + 调价系数 —— */}
              <View style={s.matrixHeaderRow}>
                <View style={s.rowLabelCol}>
                  <Text style={s.rowLabelCorner}>位 \ SKU</Text>
                </View>
                {columns.map((col) => (
                  <View key={col.id} style={s.colHeader}>
                    <View style={[s.colMultBadge, { backgroundColor: col.mult >= 1.3 ? PINK : col.mult <= 0.9 ? '#3B82F6' : '#9CA3AF' }]}>
                      <Text style={s.colMultText}>×{col.mult.toFixed(1)}</Text>
                    </View>
                    <Text style={s.colNameText} numberOfLines={1}>{col.name}</Text>
                  </View>
                ))}
              </View>

              {/* —— 行 × 列 —— */}
              {Array.from({ length: ROWS }).map((_, r) => (
                <View key={r} style={s.matrixRow}>
                  {isLeader && chopMode ? (
                    <Pressable style={[s.rowLabelCol, s.rowLabelColChop]} onPress={() => handleRowChop(r)}>
                      <Text style={[s.rowLabel, { color: '#D97706', fontWeight: '800' }]}>#{r + 1}</Text>
                      <Text style={{ fontSize: 10 }}>🪓</Text>
                    </Pressable>
                  ) : (
                    <View style={s.rowLabelCol}>
                      <Text style={s.rowLabel}>#{r + 1}</Text>
                    </View>
                  )}
                  {columns.map((col, c) => {
                    const cell = grid[c]?.[r] ?? { status: 'empty' as const };
                    const isMine = cell.memberName === '我';
                    const isSelected = !!selectedCell && selectedCell.col === c && selectedCell.row === r;
                    return (
                      <View key={col.id} style={s.cellWrap}>
                        <MatrixCellView
                          cell={cell}
                          isLeader={isLeader}
                          removeMode={removeMode}
                          assignMode={assignMode}
                          chopMode={chopMode}
                          chopHighlight={isLeader && chopMode}
                          isSelected={isSelected}
                          isMine={isMine}
                          highlightMine={!isLeader && showMyPos && isMine}
                          pulseScale={pulseScale}
                          pulseOpacity={pulseOpacity}
                          mineScale={mineScale}
                          assignScale={assignScale}
                          onPress={() => handleCellPress(c, r)}
                        />
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </ScrollView>

      {/* —— 图例 + 底部工具栏 —— */}
      <View style={[s.toolbar, { paddingBottom: 8 + insets.bottom }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.legendRow}>
          {(['gathering', 'pending', 'finalPending', 'paid', 'shipped', 'received'] as const).map((st) => {
            const cfg = STATUS_CONFIG[st];
            return (
              <View key={st} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: cfg.color }]} />
                <Text style={s.legendText}>{cfg.label}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={s.toolRow}>
          {isLeader ? (
            <>
              {/* —— 团长专属:砍排(整行取消订单) —— */}
              <Pressable
                style={[s.toolBtn, chopMode && s.toolBtnActiveChop]}
                onPress={enterChop}
              >
                <Text style={[s.toolBtnIcon, chopMode && { color: '#FFF' }]}>🪓</Text>
                <Text style={[s.toolBtnText, chopMode && { color: '#FFF' }]}>{chopMode ? '退出砍排' : '砍排'}</Text>
                {chopMode && (
                  <Animated.View style={[s.toolBtnDot, { opacity: chopBtnDotOpacity, backgroundColor: '#F59E0B' }]} />
                )}
              </Pressable>

              {/* —— 团长专属:撤排 —— */}
              <Pressable
                style={[s.toolBtn, removeMode && s.toolBtnActive]}
                onPress={enterRemove}
              >
                <Text style={[s.toolBtnIcon, removeMode && { color: '#FFF' }]}>🚫</Text>
                <Text style={[s.toolBtnText, removeMode && { color: '#FFF' }]}>{removeMode ? '退出撤排' : '撤排'}</Text>
                {removeMode && (
                  <Animated.View style={[s.toolBtnDot, { opacity: removeBtnDotOpacity }]} />
                )}
              </Pressable>

              {/* —— 团长专属:手动分配 —— */}
              <Pressable
                style={[s.toolBtn, assignMode && s.toolBtnActiveAssign]}
                onPress={enterAssign}
              >
                <Text style={[s.toolBtnIcon, assignMode && { color: '#FFF' }]}>🧩</Text>
                <Text style={[s.toolBtnText, assignMode && { color: '#FFF' }]}>{assignMode ? '完成分配' : '手动分配'}</Text>
              </Pressable>

              {/* —— 团长专属:一键收款(取代旧"一键催款") —— */}
              <Pressable
                style={[s.toolBtn, s.toolBtnActivePay]}
                onPress={() => setCollectModalOpen(true)}
              >
                <Text style={[s.toolBtnIcon, { color: '#FFF' }]}>📣</Text>
                <Text style={[s.toolBtnText, { color: '#FFF' }]}>一键收款</Text>
              </Pressable>

              <Pressable
                style={s.toolBtn}
                onPress={() => setHelpModalOpen(true)}
              >
                <Text style={s.toolBtnIcon}>📖</Text>
                <Text style={s.toolBtnText}>说明</Text>
              </Pressable>
            </>
          ) : (
            <>
              {/* —— 团员专属：我的位置 —— */}
              <Pressable
                style={[s.toolBtn, showMyPos && s.toolBtnActiveMine]}
                onPress={() => setShowMyPos((v) => !v)}
              >
                <Text style={[s.toolBtnIcon, showMyPos && { color: '#FFF' }]}>💡</Text>
                <Text style={[s.toolBtnText, showMyPos && { color: '#FFF' }]}>{showMyPos ? '取消高亮' : '我的位置'}</Text>
              </Pressable>

              <Pressable
                style={s.toolBtn}
                onPress={() => Alert.alert('余量图', '看看自己想要的 SKU 还剩几个空位（V1 后续完善）')}
              >
                <Text style={s.toolBtnIcon}>📊</Text>
                <Text style={s.toolBtnText}>余量图</Text>
              </Pressable>

              <Pressable
                style={s.toolBtn}
                onPress={() => setHelpModalOpen(true)}
              >
                <Text style={s.toolBtnIcon}>📖</Text>
                <Text style={s.toolBtnText}>说明</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* —— 成团弹窗（手动分配凑齐一行触发） —— */}
      <Modal visible={completedRow !== null} transparent animationType="fade" onRequestClose={() => setCompletedRow(null)}>
        <Pressable style={modalS.overlay} onPress={() => setCompletedRow(null)}>
          <Pressable style={modalS.card} onPress={(e) => e.stopPropagation()}>
            <View style={[modalS.iconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
            </View>
            <Text style={modalS.title}>
              <Text style={{ color: '#10B981' }}>已凑满一行</Text> · 第 {(completedRow ?? 0) + 1} 行
            </Text>
            <Text style={modalS.sub}>
              本行已凑齐 1 套 SKU,可立即向以下 {completedRow !== null
                ? columns.filter((_, c) => grid[c]?.[completedRow]?.status !== 'empty').length
                : 0} 位团员发起 <Text style={{ fontWeight: '800', color: PINK }}>一键收定金</Text>。
            </Text>
            <View style={modalS.completeMembers}>
              {completedRow !== null && columns.map((col, c) => {
                const cell = grid[c]?.[completedRow];
                if (!cell || cell.status === 'empty') return null;
                return (
                  <View key={col.id} style={modalS.memberChip}>
                    <View style={modalS.memberAva}><Text style={modalS.memberAvaText}>{cell.memberAvatar}</Text></View>
                    <Text style={modalS.memberName}>{cell.memberName}</Text>
                  </View>
                );
              })}
            </View>

            <View style={modalS.btnRow}>
              <Pressable style={modalS.cancelBtn} onPress={() => setCompletedRow(null)}>
                <Text style={modalS.cancelText}>稍后再说</Text>
              </Pressable>
              <Pressable
                style={[modalS.confirmBtn, { backgroundColor: PINK }]}
                onPress={() => {
                  setCompletedRow(null);
                  setCollectModalOpen(true);
                }}
              >
                <Ionicons name="megaphone" size={14} color="#FFF" />
                <Text style={modalS.confirmText}>一键收定金</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 二次确认弹层 —— */}
      <Modal visible={!!confirmTarget} transparent animationType="fade" onRequestClose={() => setConfirmTarget(null)}>
        <Pressable style={modalS.overlay} onPress={() => setConfirmTarget(null)}>
          <Pressable style={modalS.card} onPress={(e) => e.stopPropagation()}>
            <View style={modalS.iconWrap}>
              <Ionicons name="warning" size={28} color="#F59E0B" />
            </View>
            <Text style={modalS.title}>
              确认撤走 <Text style={{ color: PINK }}>{grid[confirmTarget?.col ?? 0]?.[confirmTarget?.row ?? 0]?.memberName ?? ''}</Text>?
            </Text>
            <Text style={modalS.sub}>
              撤排后该位置变空 · 团员会收到 App 内通知{'\n'}
              该团员可重新下单 / 申诉
            </Text>
            <View style={modalS.btnRow}>
              <Pressable style={modalS.cancelBtn} onPress={() => setConfirmTarget(null)}>
                <Text style={modalS.cancelText}>取消</Text>
              </Pressable>
              <Pressable style={modalS.confirmBtn} onPress={handleConfirmRemove}>
                <Ionicons name="trash" size={14} color="#FFF" />
                <Text style={modalS.confirmText}>确认撤走</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 砍排二次确认弹层(整行取消订单) —— */}
      <Modal visible={chopConfirmRow !== null} transparent animationType="fade" onRequestClose={() => setChopConfirmRow(null)}>
        <Pressable style={modalS.overlay} onPress={() => setChopConfirmRow(null)}>
          <Pressable style={modalS.card} onPress={(e) => e.stopPropagation()}>
            <View style={[modalS.iconWrap, { backgroundColor: '#FFFBEB' }]}>
              <Text style={{ fontSize: 28 }}>🪓</Text>
            </View>
            <Text style={modalS.title}>
              确认砍掉第 <Text style={{ color: '#F59E0B' }}>{(chopConfirmRow ?? 0) + 1}</Text> 行所有订单?
            </Text>
            <Text style={modalS.sub}>
              {(() => {
                if (chopConfirmRow === null) return '';
                const members = grid
                  .map((c) => c[chopConfirmRow])
                  .filter((cell) => cell && cell.status !== 'empty')
                  .map((cell: any) => cell.memberName);
                return members.length === 0
                  ? '本行为空,无需砍排'
                  : `本行有 ${members.length} 位团员订单将被整体取消:\n${members.slice(0, 4).join('、')}${members.length > 4 ? ` 等 ${members.length} 人` : ''}\n\n团员会收到「本次未能成团,订单已取消」通知`;
              })()}
            </Text>
            <View style={modalS.warningBox}>
              <Ionicons name="warning" size={14} color="#DC2626" />
              <Text style={modalS.warningText}>⚠️ 砍掉后不可撤回 · 请谨慎操作</Text>
            </View>
            <View style={modalS.btnRow}>
              <Pressable style={modalS.cancelBtn} onPress={() => setChopConfirmRow(null)}>
                <Text style={modalS.cancelText}>再想想</Text>
              </Pressable>
              <Pressable style={[modalS.confirmBtn, { backgroundColor: '#DC2626' }]} onPress={handleConfirmChop}>
                <Text style={{ fontSize: 14 }}>🪓</Text>
                <Text style={modalS.confirmText}>确认砍掉</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 一键收款 · 二次确认弹层 —— */}
      <Modal visible={collectModalOpen} transparent animationType="fade" onRequestClose={() => setCollectModalOpen(false)}>
        <Pressable style={modalS.overlay} onPress={() => setCollectModalOpen(false)}>
          <Pressable style={modalS.card} onPress={(e) => e.stopPropagation()}>
            <View style={[modalS.iconWrap, { backgroundColor: '#FFF1F2' }]}>
              <Ionicons name="megaphone" size={28} color={PINK} />
            </View>
            <Text style={modalS.title}>一键通知拼团情况里所有团员收款?</Text>
            <Text style={modalS.sub}>
              点击后会向「拼团情况」里 <Text style={{ fontWeight: '800', color: '#F43F5E' }}>当前所有非空位置</Text> 的团员推送付款通知,并把团状态更新为对应收款阶段。{'\n\n'}
              建议先用 <Text style={{ fontWeight: '700' }}>🪓 砍排 / 🚫 撤排</Text> 剔除凑不齐或跑团的位置。
            </Text>
            <View style={modalS.btnRow}>
              <Pressable style={modalS.cancelBtn} onPress={() => setCollectModalOpen(false)}>
                <Text style={modalS.cancelText}>再想想</Text>
              </Pressable>
              <Pressable
                style={[modalS.confirmBtn, { backgroundColor: PINK }]}
                onPress={() => {
                  let cnt = 0;
                  grid.forEach((colCells) => colCells.forEach((cell) => { if (cell.status !== 'empty') cnt += 1; }));
                  setUrgePaidCount(cnt);
                  setCollectModalOpen(false);
                  setUrgePaidVisible(true);
                  if (group) store.updateGroupStage(group.id, 'deposit_collecting');
                }}
              >
                <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                <Text style={modalS.confirmText}>确认通知</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 一键催款 / 一键收款成功提示 —— */}
      <Modal visible={urgePaidVisible} transparent animationType="fade" onRequestClose={() => setUrgePaidVisible(false)}>
        <Pressable style={modalS.overlay} onPress={() => setUrgePaidVisible(false)}>
          <Pressable style={modalS.card} onPress={(e) => e.stopPropagation()}>
            <View style={[modalS.iconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
            </View>
            <Text style={modalS.title}>
              <Text style={{ color: '#10B981' }}>已通知</Text> 拼团情况里的所有团员
            </Text>
            <Text style={modalS.sub}>
              {urgePaidCount > 0
                ? `共 ${urgePaidCount} 位非空位的团员收到 App 内通知 + 微信模板消息\n团状态已切换为「收款阶段」,可在团详情页查看进度`
                : '当前拼团情况里没有非空位的团员,请先让团员下单'}
            </Text>
            <View style={modalS.btnRow}>
              <Pressable
                style={[modalS.confirmBtn, { backgroundColor: '#10B981', flex: 1 }]}
                onPress={() => setUrgePaidVisible(false)}
              >
                <Ionicons name="checkmark" size={14} color="#FFF" />
                <Text style={modalS.confirmText}>知道了</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* —— 📖 排表说明 Modal —— */}
      {renderHelpModal()}
    </View>
  );
}

/* —————— 单元格视图 —————— */
function MatrixCellView({
  cell, isLeader, removeMode, assignMode, chopMode, chopHighlight, isSelected, isMine, highlightMine, pulseScale, pulseOpacity, mineScale, assignScale, onPress,
}: {
  cell: MatrixCell;
  isLeader: boolean;
  removeMode: boolean;
  assignMode: boolean;
  chopMode: boolean;
  chopHighlight: boolean;
  isSelected: boolean;
  isMine: boolean;
  highlightMine: boolean;
  pulseScale: Animated.AnimatedInterpolation<number>;
  pulseOpacity: Animated.AnimatedInterpolation<number>;
  mineScale: Animated.AnimatedInterpolation<number>;
  assignScale: Animated.AnimatedInterpolation<number>;
  onPress: () => void;
}) {
  if (cell.status === 'empty') {
    // 手动分配模式下空位是可点的(作为放置目标)
    if (isLeader && assignMode) {
      return (
        <Pressable style={[cellS.empty, cellS.emptyAssign]} onPress={onPress}>
          <Ionicons name="add" size={16} color={PURPLE} />
          <Text style={[cellS.emptyText, { color: PURPLE }]}>放这里</Text>
        </Pressable>
      );
    }
    // 砍排模式下空位也可点(用于选中整行)
    if (isLeader && chopMode) {
      return (
        <Pressable style={[cellS.empty, cellS.emptyChop]} onPress={onPress}>
          <Text style={{ fontSize: 14 }}>🪓</Text>
          <Text style={[cellS.emptyText, { color: '#D97706', fontWeight: '700' }]}>砍整行</Text>
        </Pressable>
      );
    }
    return (
      <View style={cellS.empty}>
        <Text style={cellS.emptyText}>空位</Text>
      </View>
    );
  }
  const cfg = STATUS_CONFIG[cell.status];
  // 团员视角下"我"的格子用紫色基底高亮
  const memberMineStyle = (!isLeader && isMine) ? {
    borderColor: PURPLE,
    backgroundColor: '#F5F3FF',
    borderWidth: 2,
  } : null;
  // 手动分配模式下"已选中"格子用紫色加粗描边
  const selectedStyle = isSelected ? {
    borderColor: PURPLE, borderWidth: 2.5, backgroundColor: '#EDE9FE',
  } : null;
  // 团长身份徽章(团长视角自加购时进入矩阵)
  const isLeaderCell = cell.memberAvatar === '团';
  // 砍排模式下:整行高亮(每个非空格子加橙色虚线边框 + 半透明遮罩)
  const chopHighlightStyle = chopHighlight ? {
    borderColor: '#F59E0B',
    borderStyle: 'dashed' as const,
    borderWidth: 2,
    backgroundColor: '#FFFBEB',
  } : null;

  const content = (
    <>
      <View style={[cellS.avatar, { backgroundColor: isLeaderCell ? PURPLE : cfg.color }]}>
        <Text style={cellS.avatarText}>{cell.memberAvatar}</Text>
      </View>
      <Text style={cellS.name} numberOfLines={1}>{cell.memberName}</Text>
      <View style={[cellS.statusPill, { backgroundColor: isLeaderCell ? PURPLE : cfg.color }]}>
        <Text style={cellS.statusPillText}>{isLeaderCell ? '团长占位' : cfg.label}</Text>
      </View>

      {/* 团长撤排模式 - 红色 ✗ 角标 */}
      {isLeader && removeMode && (
        <Animated.View
          style={[
            cellS.removeBadge,
            { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
          ]}
        >
          <Ionicons name="close" size={10} color="#FFF" />
        </Animated.View>
      )}

      {/* 手动分配模式 - 紫色 ⇆ 角标 */}
      {isLeader && assignMode && !isSelected && (
        <View style={cellS.assignBadge}>
          <Ionicons name="swap-horizontal" size={10} color="#FFF" />
        </View>
      )}

      {/* 砍排模式 - 橙色 🪓 角标 */}
      {isLeader && chopMode && (
        <Animated.View
          style={[
            cellS.chopBadge,
            { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
          ]}
        >
          <Text style={{ fontSize: 9 }}>🪓</Text>
        </Animated.View>
      )}

      {/* 团员视角下"我"的标识 */}
      {!isLeader && isMine && (
        <View style={cellS.mineBadge}>
          <Text style={cellS.mineBadgeText}>我</Text>
        </View>
      )}

      {/* 团长视角下「我」（团长占位）的角标 */}
      {isLeader && isLeaderCell && !assignMode && !removeMode && (
        <View style={[cellS.mineBadge, { backgroundColor: PURPLE }]}>
          <Text style={cellS.mineBadgeText}>长</Text>
        </View>
      )}
    </>
  );

  if (highlightMine) {
    // 团员开启"我的位置"时，对"我"的格子做脉冲缩放
    return (
      <Animated.View style={{ transform: [{ scale: mineScale }] }}>
        <Pressable
          style={[cellS.cell, { backgroundColor: cfg.bg, borderColor: cfg.color }, memberMineStyle, cellS.mineShadow]}
          onPress={onPress}
          disabled
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }

  if (isSelected) {
    // 手动分配下被选中的格子用脉冲提示
    return (
      <Animated.View style={{ transform: [{ scale: assignScale }] }}>
        <Pressable
          style={[cellS.cell, { backgroundColor: cfg.bg, borderColor: cfg.color }, selectedStyle, cellS.assignShadow]}
          onPress={onPress}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Pressable
      style={[cellS.cell, { backgroundColor: cfg.bg, borderColor: cfg.color }, memberMineStyle, chopHighlightStyle]}
      onPress={onPress}
      disabled={!isLeader || (!removeMode && !assignMode && !chopMode)}
    >
      {content}
    </Pressable>
  );
}

/* —————— Styles —————— */

const CELL_W = 78;
const CELL_H = 88;
const ROW_LABEL_W = 44;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FAFAFE' },
  emptyText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 18, backgroundColor: PURPLE },
  emptyBtnText: { color: '#FFF', fontWeight: '700' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
  },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B4B' },

  // —— 顶部进度卡 ——
  summaryCard: {
    marginHorizontal: 14, marginTop: 10,
    borderRadius: 18, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 22, fontWeight: '800', color: '#1E1B4B' },
  summaryNumDim: { color: '#9CA3AF' },
  summaryLabel: { fontSize: 10, color: '#6B7280', marginTop: 2, fontWeight: '600' },
  summaryDivider: { width: 1, height: 28, backgroundColor: '#E5E7EB' },

  cutoffRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10 },
  cutoffText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  ruleHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 4,
    marginTop: 10, paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: 'rgba(124,58,237,0.08)', borderRadius: 10,
  },
  ruleHintText: { flex: 1, fontSize: 10.5, color: PURPLE, lineHeight: 15 },

  // —— 子分组 Tab ——
  tabWrap: {
    backgroundColor: '#FFF',
    marginTop: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  tabRow: { paddingHorizontal: 12, gap: 8, paddingVertical: 10 },
  tabItem: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 16, backgroundColor: '#F3F4F6',
  },
  tabItemActive: { backgroundColor: PURPLE },
  tabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FFF' },

  // —— 撤排提示 ——
  warnBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 10,
    backgroundColor: '#FEF3C7', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  warnText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600' },
  assignBanner: { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' },
  chopBanner: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#ECFDF5', borderRadius: 12,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  toastText: { fontSize: 11, color: '#065F46', fontWeight: '700' },

  emptyMatrix: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyMatrixText: { fontSize: 12, color: '#9CA3AF' },

  // —— 矩阵 ——
  matrixHeaderRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  rowLabelCol: { width: ROW_LABEL_W, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 8 },
  rowLabelColChop: {
    flexDirection: 'row', gap: 3,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1, borderColor: '#F59E0B', borderStyle: 'dashed',
    marginVertical: 4, marginRight: 2,
  },
  rowLabelCorner: { fontSize: 9, color: '#9CA3AF', textAlign: 'center', fontWeight: '600' },
  rowLabel: { fontSize: 12, fontWeight: '800', color: '#6B7280' },

  colHeader: {
    width: CELL_W, alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 4, paddingBottom: 6,
  },
  colMultBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, marginBottom: 4,
  },
  colMultText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  colNameText: { fontSize: 10, fontWeight: '600', color: '#1E1B4B', textAlign: 'center', maxWidth: CELL_W },

  matrixRow: { flexDirection: 'row', alignItems: 'center' },
  cellWrap: { width: CELL_W, padding: 3, alignItems: 'center' },

  // —— 工具栏 ——
  toolbar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingTop: 10, paddingHorizontal: 14,
    shadowColor: '#1E1B4B', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  legendRow: { gap: 12, alignItems: 'center', paddingHorizontal: 2, paddingBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  toolRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingTop: 4,
  },
  toolBtn: {
    flexDirection: 'column', alignItems: 'center', gap: 2,
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 14,
    minWidth: 60,
    backgroundColor: '#F8F8FC',
    position: 'relative',
  },
  toolBtnActive: {
    backgroundColor: '#F59E0B',
  },
  toolBtnActiveAssign: {
    backgroundColor: PURPLE,
  },
  toolBtnActiveMine: {
    backgroundColor: PURPLE,
  },
  toolBtnActiveChop: {
    backgroundColor: '#EA580C',
  },
  toolBtnActivePay: {
    backgroundColor: PINK,
  },
  toolBtnIcon: { fontSize: 16, color: '#6B7280' },
  toolBtnText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  toolBtnDot: {
    position: 'absolute', top: 4, right: 4,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#FCD34D',
  },
});

const cellS = StyleSheet.create({
  cell: {
    width: CELL_W - 6, height: CELL_H,
    borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, paddingVertical: 6, gap: 4,
    position: 'relative',
  },
  empty: {
    width: CELL_W - 6, height: CELL_H,
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FAFAFE',
    gap: 2,
  },
  emptyAssign: {
    borderColor: PURPLE, backgroundColor: '#F5F3FF',
  },
  emptyChop: {
    borderColor: '#F59E0B', borderStyle: 'dashed', backgroundColor: '#FFFBEB',
  },
  emptyText: { fontSize: 11, color: '#C4C4D4', fontWeight: '500' },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  name: { fontSize: 11, fontWeight: '700', color: '#1E1B4B', maxWidth: CELL_W - 14 },
  statusPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  statusPillText: { fontSize: 8, fontWeight: '700', color: '#FFF' },

  removeBadge: {
    position: 'absolute', top: -6, right: -6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 2, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  assignBadge: {
    position: 'absolute', top: -6, right: -6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: PURPLE,
    borderWidth: 2, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  chopBadge: {
    position: 'absolute', top: -6, right: -6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#F59E0B',
    borderWidth: 2, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  assignShadow: {
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  mineBadge: {
    position: 'absolute', top: -6, right: -6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: PURPLE,
    borderWidth: 2, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  mineBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  mineShadow: {
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
});

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,75,0.45)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: {
    width: '100%', maxWidth: 320,
    backgroundColor: '#FFF', borderRadius: 20,
    paddingVertical: 22, paddingHorizontal: 22,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: '#FFFBEB',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1E1B4B', textAlign: 'center' },
  sub: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  confirmBtn: { flex: 1.4, paddingVertical: 12, borderRadius: 20, backgroundColor: '#EF4444', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  warningBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 14, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10,
    borderWidth: 1, borderColor: '#FECACA',
    width: '100%',
  },
  warningText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },

  completeMembers: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    justifyContent: 'center', marginTop: 14,
    paddingHorizontal: 6,
  },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12,
    backgroundColor: '#ECFDF5',
  },
  memberAva: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvaText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  memberName: { fontSize: 11, fontWeight: '700', color: '#065F46' },
});

const helpS = StyleSheet.create({
  card: {
    width: '100%', maxWidth: 360, maxHeight: '88%',
    backgroundColor: '#FFF', borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 15, fontWeight: '800', color: '#1E1B4B' },
  subTitle: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  body: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, gap: 14 },

  section: { gap: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionEmoji: { fontSize: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#1E1B4B' },

  bulletList: { gap: 6, paddingLeft: 2 },
  bullet: { flexDirection: 'row', gap: 6 },
  bulletDot: { fontSize: 12, color: '#7C3AED', fontWeight: '900', lineHeight: 18 },
  bulletText: { fontSize: 12, color: '#374151', lineHeight: 18, flex: 1 },
  kw: { fontWeight: '800', color: '#1E1B4B' },
  warn: { fontWeight: '700', color: '#DC2626' },

  statusGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, fontWeight: '700' },
  statusFlow: {
    fontSize: 10, fontWeight: '700', color: '#6B7280',
    marginTop: 4, textAlign: 'center',
    paddingVertical: 6, backgroundColor: '#F9FAFB', borderRadius: 8,
  },

  toolCard: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 8,
    gap: 4,
  },
  toolHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolIcon: { fontSize: 14 },
  toolName: { fontSize: 12, fontWeight: '800', color: '#1E1B4B' },
  toolDesc: { fontSize: 11, color: '#374151', lineHeight: 17 },

  footer: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
});
