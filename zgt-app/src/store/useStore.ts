import { create } from 'zustand';
import {
  Group, Order, Product, Payment, BlacklistEntry, Member, Notification,
  GroupStage, OrderStatus, BundleRule, NotificationType,
} from '../types';
import { generateId } from '../utils/helpers';
import { mockGroups, mockOrders, mockPayments, mockBlacklist, mockMembers } from '../utils/mockData';

interface AppState {
  groups: Group[];
  orders: Order[];
  payments: Payment[];
  blacklist: BlacklistEntry[];
  members: Member[];
  notifications: Notification[];


  addGroup: (g: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'memberCount' | 'totalRevenue' | 'collectedAmount' | 'products' | 'bundleRules'> & { products?: Product[] }) => string;
  updateGroupStage: (groupId: string, stage: GroupStage) => void;
  addProduct: (groupId: string, product: Omit<Product, 'id' | 'groupId' | 'createdAt' | 'sold'>) => void;
  removeProduct: (groupId: string, productId: string) => void;
  updateProductStock: (groupId: string, productId: string, stock: number) => void;
  updateProductPrice: (groupId: string, productId: string, price: number) => void;
  batchUpdateProductPrice: (groupId: string, multiplier: number) => void;
  addBundleRule: (groupId: string, rule: Omit<BundleRule, 'hotProductId'> & { hotProductId?: string }) => void;
  removeBundleRule: (groupId: string, hotProductId: string) => void;

  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  batchUpdateOrderStatus: (orderIds: string[], status: OrderStatus) => void;
  addTrackingNumber: (orderId: string, tracking: string) => void;

  confirmPayment: (paymentId: string) => void;
  rejectPayment: (paymentId: string) => void;
  addPayment: (p: Omit<Payment, 'id' | 'createdAt'>) => void;

  addToBlacklist: (entry: Omit<BlacklistEntry, 'id' | 'createdAt' | 'reportCount'>) => void;
  removeFromBlacklist: (id: string) => void;
  isBlacklisted: (memberId: string) => boolean;

  addMember: (m: Omit<Member, 'id' | 'joinedAt' | 'totalOrders' | 'completedOrders' | 'escapedOrders'> & { id?: string }) => string;
  updateCreditScore: (memberId: string, delta: number) => void;
  getMember: (memberId: string) => Member | undefined;

  addNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: (userId: string) => void;
  getUnreadCount: (userId: string) => number;

  getGroupOrders: (groupId: string) => Order[];
  getGroupFinance: (groupId: string) => {
    totalAmount: number;
    collectedDeposit: number; pendingDeposit: number;
    collectedFinal: number; pendingFinal: number;
    collectedShipping: number; pendingShipping: number;
    totalCollected: number; totalPending: number;
  };
  getAutoSortedOrders: (groupId: string) => Order[];
  sendPaymentReminder: (orderId: string, type: 'deposit' | 'final') => void;
  batchRemind: (groupId: string, type: 'deposit' | 'final') => number;
}

export const useStore = create<AppState>()(
    (set, get) => ({
      groups: mockGroups,
      orders: mockOrders,
      payments: mockPayments,
      blacklist: mockBlacklist,
      members: mockMembers,
      notifications: [],


      addGroup: (g) => {
        const id = generateId();
        const now = Date.now();
        set((s) => ({
          groups: [...s.groups, { ...g, id, products: g.products ?? [], bundleRules: [], memberCount: 0, totalRevenue: 0, collectedAmount: 0, createdAt: now, updatedAt: now }],
        }));
        return id;
      },

      updateGroupStage: (groupId, stage) => {
        set((s) => ({
          groups: s.groups.map((g) => g.id === groupId ? { ...g, stage, updatedAt: Date.now() } : g),
        }));
        const group = get().groups.find((g) => g.id === groupId);
        if (group) {
          get().addNotification({ targetUserId: '*', type: 'stage_update', title: '团进度更新', body: `「${group.name}」已进入新阶段`, groupId });
        }
      },

      addProduct: (groupId, product) =>
        set((s) => ({
          groups: s.groups.map((g) => g.id === groupId
            ? { ...g, products: [...g.products, { ...product, id: generateId(), groupId, sold: 0, createdAt: Date.now() }], updatedAt: Date.now() }
            : g),
        })),

      removeProduct: (groupId, productId) =>
        set((s) => ({
          groups: s.groups.map((g) => g.id === groupId
            ? { ...g, products: g.products.filter((p) => p.id !== productId), updatedAt: Date.now() }
            : g),
        })),

      updateProductStock: (groupId, productId, stock) =>
        set((s) => ({
          groups: s.groups.map((g) => g.id === groupId
            ? { ...g, products: g.products.map((p) => p.id === productId ? { ...p, stock } : p), updatedAt: Date.now() }
            : g),
        })),

      updateProductPrice: (groupId, productId, price) =>
        set((s) => ({
          groups: s.groups.map((g) => g.id === groupId
            ? { ...g, products: g.products.map((p) => p.id === productId ? { ...p, price } : p), updatedAt: Date.now() }
            : g),
        })),

      batchUpdateProductPrice: (groupId, multiplier) =>
        set((s) => ({
          groups: s.groups.map((g) => g.id === groupId
            ? { ...g, products: g.products.map((p) => ({ ...p, price: Math.round(p.price * multiplier * 100) / 100 })), updatedAt: Date.now() }
            : g),
        })),

      addBundleRule: (groupId, rule) =>
        set((s) => ({
          groups: s.groups.map((g) => g.id === groupId
            ? { ...g, bundleRules: [...g.bundleRules, { ...rule, hotProductId: rule.hotProductId ?? '*' }], updatedAt: Date.now() }
            : g),
        })),

      removeBundleRule: (groupId, hotProductId) =>
        set((s) => ({
          groups: s.groups.map((g) => g.id === groupId
            ? { ...g, bundleRules: g.bundleRules.filter((r) => r.hotProductId !== hotProductId), updatedAt: Date.now() }
            : g),
        })),

      addOrder: (order) => {
        const id = generateId();
        const now = Date.now();
        set((s) => ({
          orders: [...s.orders, { ...order, id, createdAt: now, updatedAt: now }],
          groups: s.groups.map((g) => g.id === order.groupId
            ? { ...g, memberCount: g.memberCount + 1, totalRevenue: g.totalRevenue + order.totalAmount, updatedAt: now }
            : g),
        }));
        return id;
      },

      updateOrderStatus: (orderId, status) =>
        set((s) => ({
          orders: s.orders.map((o) => o.id === orderId ? { ...o, status, updatedAt: Date.now() } : o),
        })),

      batchUpdateOrderStatus: (orderIds, status) =>
        set((s) => ({
          orders: s.orders.map((o) => orderIds.includes(o.id) ? { ...o, status, updatedAt: Date.now() } : o),
        })),

      addTrackingNumber: (orderId, tracking) =>
        set((s) => {
          const order = s.orders.find((o) => o.id === orderId);
          if (order) {
            get().addNotification({ targetUserId: order.memberId, type: 'shipped', title: '你的包裹已发出', body: `运单号 ${tracking}，注意查收`, orderId });
          }
          return {
            orders: s.orders.map((o) => o.id === orderId
              ? { ...o, trackingNumbers: [...o.trackingNumbers, tracking], status: 'shipped' as const, updatedAt: Date.now() }
              : o),
          };
        }),

      confirmPayment: (paymentId) =>
        set((s) => ({
          payments: s.payments.map((p) => p.id === paymentId ? { ...p, status: 'confirmed', confirmedAt: Date.now() } : p),
        })),

      rejectPayment: (paymentId) =>
        set((s) => ({
          payments: s.payments.map((p) => p.id === paymentId ? { ...p, status: 'rejected' } : p),
        })),

      addPayment: (p) =>
        set((s) => ({
          payments: [...s.payments, { ...p, id: generateId(), createdAt: Date.now() }],
        })),

      addToBlacklist: (entry) =>
        set((s) => {
          const existing = s.blacklist.find((b) => b.memberId === entry.memberId);
          if (existing) {
            return { blacklist: s.blacklist.map((b) => b.memberId === entry.memberId ? { ...b, reportCount: b.reportCount + 1 } : b) };
          }
          return { blacklist: [...s.blacklist, { ...entry, id: generateId(), reportCount: 1, createdAt: Date.now() }] };
        }),

      removeFromBlacklist: (id) =>
        set((s) => ({ blacklist: s.blacklist.filter((b) => b.id !== id) })),

      isBlacklisted: (memberId) => get().blacklist.some((b) => b.memberId === memberId),

      addMember: (m) => {
        const id = m.id ?? generateId();
        set((s) => ({
          members: [...s.members, { ...m, id, creditScore: m.creditScore ?? 80, totalOrders: 0, completedOrders: 0, escapedOrders: 0, joinedAt: Date.now() }],
        }));
        return id;
      },

      updateCreditScore: (memberId, delta) =>
        set((s) => ({
          members: s.members.map((m) => m.id === memberId ? { ...m, creditScore: Math.max(0, Math.min(100, m.creditScore + delta)) } : m),
        })),

      getMember: (memberId) => get().members.find((m) => m.id === memberId),

      addNotification: (n) =>
        set((s) => ({
          notifications: [{ ...n, id: generateId(), read: false, createdAt: Date.now() }, ...s.notifications],
        })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
        })),

      markAllRead: (userId) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.targetUserId === userId || n.targetUserId === '*') ? { ...n, read: true } : n),
        })),

      getUnreadCount: (userId) =>
        get().notifications.filter((n) => !n.read && (n.targetUserId === userId || n.targetUserId === '*')).length,

      getGroupOrders: (groupId) => get().orders.filter((o) => o.groupId === groupId),

      getGroupFinance: (groupId) => {
        const orders = get().orders.filter((o) => o.groupId === groupId && o.status !== 'cancelled');
        return {
          totalAmount: orders.reduce((s, o) => s + o.totalAmount, 0),
          collectedDeposit: orders.reduce((s, o) => s + o.depositPaid, 0),
          pendingDeposit: orders.reduce((s, o) => s + (o.depositAmount - o.depositPaid), 0),
          collectedFinal: orders.reduce((s, o) => s + o.finalPaid, 0),
          pendingFinal: orders.reduce((s, o) => s + (o.finalAmount - o.finalPaid), 0),
          collectedShipping: orders.reduce((s, o) => s + o.shippingFeePaid, 0),
          pendingShipping: orders.reduce((s, o) => s + (o.shippingFee - o.shippingFeePaid), 0),
          totalCollected: orders.reduce((s, o) => s + o.depositPaid + o.finalPaid + o.shippingFeePaid, 0),
          totalPending: orders.reduce((s, o) => s + (o.totalAmount + o.shippingFee - o.depositPaid - o.finalPaid - o.shippingFeePaid), 0),
        };
      },

      getAutoSortedOrders: (groupId) => {
        const orders = get().orders.filter((o) => o.groupId === groupId);
        return [...orders].sort((a, b) => {
          if (a.isMawei !== b.isMawei) return a.isMawei ? -1 : 1;
          if ((a.aiSortScore ?? 0) !== (b.aiSortScore ?? 0)) return (b.aiSortScore ?? 0) - (a.aiSortScore ?? 0);
          return a.priority - b.priority;
        });
      },

      sendPaymentReminder: (orderId, type) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;
        const amount = type === 'deposit' ? order.depositAmount : order.finalAmount;
        get().addNotification({
          targetUserId: order.memberId,
          type: type === 'deposit' ? 'deposit_remind' : 'final_remind',
          title: type === 'deposit' ? '定金催付提醒' : '尾款催付提醒',
          body: `请尽快支付${type === 'deposit' ? '定金' : '尾款'} ¥${amount.toFixed(2)}`,
          groupId: order.groupId,
          orderId: order.id,
        });
      },

      batchRemind: (groupId, type) => {
        const orders = get().orders.filter((o) => {
          if (o.groupId !== groupId) return false;
          if (type === 'deposit') return o.status === 'pending_deposit';
          return o.status === 'pending_final';
        });
        orders.forEach((o) => get().sendPaymentReminder(o.id, type));
        return orders.length;
      },
    }),
);
