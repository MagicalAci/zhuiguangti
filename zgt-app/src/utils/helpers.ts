import { GroupStage, HeatLevel, OrderStatus, StageInfo } from '../types';

export const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const formatCurrency = (amount: number, currency = '¥'): string =>
  `${currency}${amount.toFixed(2)}`;

export const formatDate = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const formatDateTime = (ts: number): string => {
  const d = new Date(ts);
  return `${formatDate(ts)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const ORDER_STATUS_MAP: Record<OrderStatus, { label: string; color: string }> = {
  pending_deposit: { label: '待付定金', color: '#E17055' },
  deposit_paid: { label: '已付定金', color: '#FDCB6E' },
  pending_final: { label: '待付尾款', color: '#E17055' },
  final_paid: { label: '已付尾款', color: '#00B894' },
  shipping: { label: '发货中', color: '#0984E3' },
  shipped: { label: '已发货', color: '#6C5CE7' },
  completed: { label: '已完成', color: '#00B894' },
  cancelled: { label: '已取消', color: '#B2BEC3' },
  escaped: { label: '逃单', color: '#D63031' },
};

export const HEAT_MAP: Record<HeatLevel, { label: string; color: string; bg: string }> = {
  hot: { label: '热门', color: '#D63031', bg: '#FFEAA7' },
  cold: { label: '冷门', color: '#0984E3', bg: '#DFE6E9' },
  normal: { label: '普通', color: '#636E72', bg: '#F5F5F5' },
};

export const GROUP_STAGES: StageInfo[] = [
  { stage: 'preparing', label: '筹备中', icon: 'pencil', color: '#B2BEC3' },
  { stage: 'recruiting', label: '招募中', icon: 'account-group', color: '#FDCB6E' },
  { stage: 'deposit_collecting', label: '收定金', icon: 'cash', color: '#E17055' },
  { stage: 'purchasing', label: '采购中', icon: 'cart', color: '#0984E3' },
  { stage: 'producing', label: '制作中', icon: 'hammer-wrench', color: '#6C5CE7' },
  { stage: 'sampling', label: '打样中', icon: 'palette', color: '#A29BFE' },
  { stage: 'manufacturing', label: '大货中', icon: 'factory', color: '#00CEC9' },
  { stage: 'arrived', label: '已到货', icon: 'package-variant', color: '#00B894' },
  { stage: 'shipping', label: '发货中', icon: 'truck-delivery', color: '#0984E3' },
  { stage: 'completed', label: '已完成', icon: 'check-circle', color: '#00B894' },
];

export const getStageIndex = (stage: GroupStage): number =>
  GROUP_STAGES.findIndex((s) => s.stage === stage);

/** V1 demo · 团状态归一化（区分定金/全款两条路径） */
export type CanonicalGroupStage =
  | 'gathering'
  | 'deposit_collecting'
  | 'final_collecting'
  | 'full_collecting'
  | 'shipping'
  | 'closed';

export function canonicalGroupStage(
  stage: GroupStage,
  payMode?: 'deposit' | 'full',
): CanonicalGroupStage {
  switch (stage) {
    case 'preparing':
    case 'gathering':
    case 'gathered':
    case 'recruiting':
      return 'gathering';
    case 'deposit_collecting':
      return 'deposit_collecting';
    case 'full_collecting':
      return 'full_collecting';
    case 'final_collecting':
    case 'purchasing':
    case 'producing':
    case 'sampling':
    case 'manufacturing':
      return 'final_collecting';
    case 'arrived':
    case 'shipping':
      return 'shipping';
    case 'closed':
    case 'completed':
      return 'closed';
    default:
      return 'gathering';
  }
}

export const CANONICAL_STAGE_META: Record<
  CanonicalGroupStage,
  { label: string; color: string; bg: string; icon: string; hint: string }
> = {
  gathering:           { label: '凑车中', color: '#10B981', bg: '#ECFDF5', icon: 'people-outline',      hint: '团长还在凑人 · 你可以继续修改 / 加购订单' },
  deposit_collecting:  { label: '收定金', color: '#F59E0B', bg: '#FFFBEB', icon: 'card-outline',        hint: '团长已发起收款 · 请在倒计时内付完保留排位' },
  final_collecting:    { label: '收尾款', color: '#F97316', bg: '#FFF7ED', icon: 'wallet-outline',      hint: '团长已发起补尾款 · 补齐后等待到货发货' },
  full_collecting:     { label: '收款中', color: '#F43F5E', bg: '#FFF1F2', icon: 'card-outline',        hint: '团长已发起收款 · 请在倒计时内付完保留排位' },
  shipping:            { label: '发货中', color: '#3B82F6', bg: '#EFF6FF', icon: 'cube-outline',        hint: '货已到手 · 团长可能根据真实邮费发起补邮' },
  closed:              { label: '已截团', color: '#7C3AED', bg: '#F5F3FF', icon: 'lock-closed-outline', hint: '本团已结束 · 不再接单 / 不再补款' },
};

export function calcShippingFee(
  totalWeight: number,
  province: string,
): number {
  const remoteProvinces = ['西藏', '新疆', '内蒙古', '青海', '宁夏'];
  const isRemote = remoteProvinces.some((p) => province.includes(p));
  const baseWeight = 1;
  const basePrice = isRemote ? 15 : 8;
  const extraPerKg = isRemote ? 12 : 5;
  if (totalWeight <= baseWeight) return basePrice;
  return basePrice + Math.ceil(totalWeight - baseWeight) * extraPerKg;
}

export function validateBundle(
  items: { productId: string; heat: HeatLevel }[],
  coldRequired: number,
): { valid: boolean; message: string } {
  const hotItems = items.filter((i) => i.heat === 'hot');
  const coldItems = items.filter((i) => i.heat === 'cold');
  if (hotItems.length > 0 && coldItems.length < hotItems.length * coldRequired) {
    return {
      valid: false,
      message: `每选1个热门商品需搭配${coldRequired}个冷门商品，当前还差${hotItems.length * coldRequired - coldItems.length}个冷门`,
    };
  }
  return { valid: true, message: '' };
}
