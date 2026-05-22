import { Order, Member, BundleRule, HeatLevel } from '../types';

interface SortInput {
  orders: Order[];
  members: Member[];
  bundleRules: BundleRule[];
}

interface SortResult {
  sortedOrders: Order[];
  changes: { orderId: string; oldRank: number; newRank: number; reason: string }[];
  summary: string;
}

function getCreditScore(memberId: string, members: Member[]): number {
  return members.find((m) => m.id === memberId)?.creditScore ?? 50;
}

function getColdBalance(order: Order): number {
  const hot = order.items.filter((i) => i.heat === 'hot').length;
  const cold = order.items.filter((i) => i.heat === 'cold').length;
  if (hot === 0) return 1;
  return cold / hot;
}

export function aiSmartSort(input: SortInput): SortResult {
  const { orders, members, bundleRules } = input;
  const coldRequired = bundleRules[0]?.coldCount ?? 2;
  const originalOrder = orders.map((o) => o.id);

  const scored = orders.map((o) => {
    let score = 0;

    if (o.isMawei) score += 10000;

    const credit = getCreditScore(o.memberId, members);
    score += credit * 50;

    const daysSinceOrder = (Date.now() - o.createdAt) / 86400000;
    score += Math.min(daysSinceOrder * 100, 3000);

    const balance = getColdBalance(o);
    score += Math.min(balance, coldRequired) * 500;

    const depositPct = o.depositAmount > 0 ? o.depositPaid / o.depositAmount : 0;
    score += depositPct * 2000;

    return { ...o, aiSortScore: Math.round(score) };
  });

  const sorted = scored.sort((a, b) => (b.aiSortScore ?? 0) - (a.aiSortScore ?? 0));

  const changes = sorted.map((o, newIdx) => {
    const oldIdx = originalOrder.indexOf(o.id);
    const reasons: string[] = [];
    if (o.isMawei) reasons.push('妈位优先');
    const credit = getCreditScore(o.memberId, members);
    if (credit >= 90) reasons.push(`高信用(${credit}分)`);
    if (getColdBalance(o) >= coldRequired) reasons.push('冷热平衡');
    if (o.depositPaid >= o.depositAmount) reasons.push('已付定金');
    return { orderId: o.id, oldRank: oldIdx + 1, newRank: newIdx + 1, reason: reasons.join('、') || '综合排序' };
  });

  const moved = changes.filter((c) => c.oldRank !== c.newRank).length;
  const maweiCount = sorted.filter((o) => o.isMawei).length;
  const summary = `AI已完成智能排表：共${sorted.length}笔订单，${maweiCount}个妈位优先，${moved}笔调整了排序。排序依据：妈位>信用分>下单时间>冷热平衡度>付款进度。`;

  return { sortedOrders: sorted, changes, summary };
}
