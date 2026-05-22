export type GroupType = 'proxy' | 'custom';
export type HeatLevel = 'hot' | 'cold' | 'normal';
export type OrderStatus =
  | 'pending_deposit'
  | 'deposit_paid'
  | 'pending_final'
  | 'final_paid'
  | 'shipping'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'escaped';
export type GroupStage =
  | 'preparing'            // 准备
  | 'gathering'            // 成团中(凑车阶段,V1 demo 新)
  | 'gathered'             // 已成团(凑齐 1 套 SKU,等团长收款)
  | 'recruiting'           // 兼容旧值:开团中 / 招募中(等价于 gathering)
  | 'deposit_collecting'   // 定金团 · 收定金
  | 'final_collecting'     // 定金团 · 收尾款
  | 'full_collecting'      // 全款团 · 收款中
  | 'purchasing'
  | 'producing'
  | 'sampling'
  | 'manufacturing'
  | 'arrived'
  | 'shipping'             // 发货中
  | 'closed'               // 截团
  | 'completed';
export type PaymentType = 'intention' | 'deposit' | 'final' | 'shipping_extra';
export type NotificationType = 'deposit_remind' | 'final_remind' | 'shipped' | 'stage_update' | 'system';

export interface Product {
  id: string;
  groupId: string;
  name: string;
  image?: string;
  price: number;
  originalPrice?: number;
  heat: HeatLevel;
  stock: number;
  sold: number;
  bundleRequired?: number;
  weight?: number;
  aiHeatScore?: number;
  createdAt: number;
}

export interface BundleRule {
  hotProductId: string;
  coldCount: number;
  coldPoolIds: string[];
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  heat: HeatLevel;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
}

export interface Order {
  id: string;
  groupId: string;
  memberId: string;
  memberName: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  depositAmount: number;
  depositPaid: number;
  finalAmount: number;
  finalPaid: number;
  shippingFee: number;
  shippingFeePaid: number;
  isMawei: boolean;
  priority: number;
  address?: ShippingAddress;
  trackingNumbers: string[];
  note?: string;
  aiSortScore?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Payment {
  id: string;
  orderId: string;
  groupId: string;
  memberId: string;
  memberName: string;
  type: PaymentType;
  amount: number;
  method: 'wechat' | 'alipay' | 'bank';
  status: 'pending' | 'confirmed' | 'rejected';
  proofImage?: string;
  createdAt: number;
  confirmedAt?: number;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  /** 'deposit' 定金团(含 30~50% 定金 + 尾款) · 'full' 全款团(一次付清) */
  payMode?: 'deposit' | 'full';
  coverImage?: string;
  description: string;
  orderRules?: string;
  ipName: string;
  stage: GroupStage;
  products: Product[];
  bundleRules: BundleRule[];
  depositRate: number;
  intentionFee?: number;
  exchangeRate?: number;
  currency?: string;
  startDate: number;
  endDate?: number;
  maxMembers?: number;
  memberCount: number;
  totalRevenue: number;
  collectedAmount: number;
  createdAt: number;
  updatedAt: number;
}

export interface BlacklistEntry {
  id: string;
  memberName: string;
  memberId: string;
  reason: string;
  reportedBy: string;
  reportCount: number;
  createdAt: number;
}

export interface Member {
  id: string;
  nickname: string;
  avatar?: string;
  city?: string;
  address?: string;
  note?: string;
  creditScore: number;
  totalOrders: number;
  completedOrders: number;
  escapedOrders: number;
  joinedAt: number;
}

export interface Notification {
  id: string;
  targetUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  groupId?: string;
  orderId?: string;
  read: boolean;
  createdAt: number;
}

export interface AIRecommendation {
  type: 'sort' | 'reconcile' | 'template' | 'heat' | 'promo' | 'chat';
  title: string;
  description: string;
  data: any;
  confidence: number;
  createdAt: number;
}

export interface ReconcileResult {
  orderId: string;
  memberName: string;
  expected: number;
  received: number;
  status: 'matched' | 'overpaid' | 'underpaid' | 'missing' | 'duplicate';
  diff: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface FinanceSummary {
  totalOrderAmount: number;
  totalDeposit: number;
  totalFinal: number;
  totalShipping: number;
  collectedDeposit: number;
  collectedFinal: number;
  collectedShipping: number;
  pendingDeposit: number;
  pendingFinal: number;
  pendingShipping: number;
  profit: number;
}

export interface StageInfo {
  stage: GroupStage;
  label: string;
  icon: string;
  color: string;
}
