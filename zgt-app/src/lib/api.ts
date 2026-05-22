import { supabase } from './supabase';
import type { Group, Product, Order, Payment, Member, BlacklistEntry, BundleRule, GroupStage, OrderStatus } from '../types';

// ──────────────────────────────────────────────────
// DB row ↔ App type 转换
// ──────────────────────────────────────────────────

function rowToGroup(r: any, products: Product[] = [], bundleRules: BundleRule[] = []): Group {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    payMode: r.pay_mode,
    coverImage: r.cover_image,
    description: r.description,
    ipName: r.ip_name,
    stage: r.stage as GroupStage,
    products,
    bundleRules,
    depositRate: r.deposit_rate,
    intentionFee: r.intention_fee,
    exchangeRate: r.exchange_rate,
    currency: r.currency,
    startDate: r.start_date,
    endDate: r.end_date,
    maxMembers: r.max_members,
    memberCount: r.member_count,
    totalRevenue: r.total_revenue,
    collectedAmount: r.collected_amount,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToProduct(r: any): Product {
  return {
    id: r.id,
    groupId: r.group_id,
    name: r.name,
    image: r.image,
    price: r.price,
    originalPrice: r.original_price,
    heat: r.heat,
    stock: r.stock,
    sold: r.sold,
    bundleRequired: r.bundle_required,
    weight: r.weight,
    aiHeatScore: r.ai_heat_score,
    createdAt: r.created_at,
  };
}

function rowToOrder(r: any): Order {
  return {
    id: r.id,
    groupId: r.group_id,
    memberId: r.member_id,
    memberName: r.member_name,
    items: r.items ?? [],
    status: r.status as OrderStatus,
    totalAmount: r.total_amount,
    depositAmount: r.deposit_amount,
    depositPaid: r.deposit_paid,
    finalAmount: r.final_amount,
    finalPaid: r.final_paid,
    shippingFee: r.shipping_fee,
    shippingFeePaid: r.shipping_fee_paid,
    isMawei: r.is_mawei,
    priority: r.priority,
    address: r.address,
    trackingNumbers: r.tracking_numbers ?? [],
    note: r.note,
    aiSortScore: r.ai_sort_score,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToMember(r: any): Member {
  return {
    id: r.id,
    nickname: r.nickname,
    avatar: r.avatar,
    city: r.city,
    address: r.address,
    note: r.note,
    creditScore: r.credit_score,
    totalOrders: r.total_orders,
    completedOrders: r.completed_orders,
    escapedOrders: r.escaped_orders,
    joinedAt: r.joined_at,
  };
}

function rowToPayment(r: any): Payment {
  return {
    id: r.id,
    orderId: r.order_id,
    groupId: r.group_id,
    memberId: r.member_id,
    memberName: r.member_name,
    type: r.type,
    amount: r.amount,
    method: r.method,
    status: r.status,
    proofImage: r.proof_image,
    createdAt: r.created_at,
    confirmedAt: r.confirmed_at,
  };
}

function rowToBlacklist(r: any): BlacklistEntry {
  return {
    id: r.id,
    memberName: r.member_name,
    memberId: r.member_id,
    reason: r.reason,
    reportedBy: r.reported_by,
    reportCount: r.report_count,
    createdAt: r.created_at,
  };
}

// ──────────────────────────────────────────────────
// 读
// ──────────────────────────────────────────────────

export async function fetchAllGroups(): Promise<Group[]> {
  const [{ data: gRows }, { data: pRows }, { data: bRows }] = await Promise.all([
    supabase.from('groups').select('*').order('created_at', { ascending: false }),
    supabase.from('products').select('*'),
    supabase.from('bundle_rules').select('*'),
  ]);
  if (!gRows) return [];

  const prodMap = new Map<string, Product[]>();
  (pRows ?? []).forEach((r: any) => {
    const p = rowToProduct(r);
    const arr = prodMap.get(p.groupId) ?? [];
    arr.push(p);
    prodMap.set(p.groupId, arr);
  });

  const bundleMap = new Map<string, BundleRule[]>();
  (bRows ?? []).forEach((r: any) => {
    const gid = r.group_id;
    const arr = bundleMap.get(gid) ?? [];
    arr.push({ hotProductId: r.hot_product_id, coldCount: r.cold_count, coldPoolIds: r.cold_pool_ids ?? [] });
    bundleMap.set(gid, arr);
  });

  return gRows.map((r: any) => rowToGroup(r, prodMap.get(r.id) ?? [], bundleMap.get(r.id) ?? []));
}

export async function fetchOrders(): Promise<Order[]> {
  const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  return (data ?? []).map(rowToOrder);
}

export async function fetchMembers(): Promise<Member[]> {
  const { data } = await supabase.from('members').select('*');
  return (data ?? []).map(rowToMember);
}

export async function fetchPayments(): Promise<Payment[]> {
  const { data } = await supabase.from('payments').select('*');
  return (data ?? []).map(rowToPayment);
}

export async function fetchBlacklist(): Promise<BlacklistEntry[]> {
  const { data } = await supabase.from('blacklist').select('*');
  return (data ?? []).map(rowToBlacklist);
}

// ──────────────────────────────────────────────────
// 写
// ──────────────────────────────────────────────────

export async function insertGroup(g: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'products' | 'bundleRules' | 'memberCount' | 'totalRevenue' | 'collectedAmount'>) {
  const now = Date.now();
  const { data, error } = await supabase.from('groups').insert({
    name: g.name,
    type: g.type,
    pay_mode: g.payMode ?? 'deposit',
    description: g.description,
    ip_name: g.ipName,
    stage: g.stage,
    deposit_rate: g.depositRate,
    intention_fee: g.intentionFee,
    exchange_rate: g.exchangeRate,
    currency: g.currency,
    start_date: g.startDate ?? now,
    end_date: g.endDate,
    max_members: g.maxMembers,
    member_count: 0,
    total_revenue: 0,
    collected_amount: 0,
    created_at: now,
    updated_at: now,
  }).select().single();

  if (error) throw error;
  return data.id as string;
}

export async function updateGroupStage(groupId: string, stage: GroupStage) {
  await supabase.from('groups').update({ stage, updated_at: Date.now() }).eq('id', groupId);
}

export async function insertOrder(o: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Date.now();
  const { data, error } = await supabase.from('orders').insert({
    group_id: o.groupId,
    member_id: o.memberId,
    member_name: o.memberName,
    items: o.items,
    status: o.status,
    total_amount: o.totalAmount,
    deposit_amount: o.depositAmount,
    deposit_paid: o.depositPaid,
    final_amount: o.finalAmount,
    final_paid: o.finalPaid,
    shipping_fee: o.shippingFee,
    shipping_fee_paid: o.shippingFeePaid,
    is_mawei: o.isMawei,
    priority: o.priority,
    tracking_numbers: o.trackingNumbers ?? [],
    created_at: now,
    updated_at: now,
  }).select().single();

  if (error) throw error;

  await supabase.rpc('increment_group_member_count', { gid: o.groupId });

  return data.id as string;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await supabase.from('orders').update({ status, updated_at: Date.now() }).eq('id', orderId);
}

export async function insertPayment(p: Omit<Payment, 'id' | 'createdAt'>) {
  const { data, error } = await supabase.from('payments').insert({
    order_id: p.orderId,
    group_id: p.groupId,
    member_id: p.memberId,
    member_name: p.memberName,
    type: p.type,
    amount: p.amount,
    method: p.method,
    status: p.status,
    created_at: Date.now(),
  }).select().single();

  if (error) throw error;
  return data.id as string;
}
