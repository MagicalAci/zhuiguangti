import { Group, Order, Product, Payment, BlacklistEntry, Member } from '../types';

const now = Date.now();
const DAY = 86400000;

// ──────────────────────────────────────────────────
// 5 个拼车代购团 · 每个对应一个规范阶段
// ──────────────────────────────────────────────────

const STAGE_DEFS: Array<{
  id: string;
  stage: Group['stage'];
  name: string;
  ip: string;
  desc: string;
  days: number;
  members: number;
  depositRate: number;
}> = [
  {
    id: 'proxy_gathering',
    stage: 'gathering',
    name: '偶像梦幻祭 6月新谷拼车',
    ip: '偶像梦幻祭',
    desc: '日谷代购拼车，含吧唧/色纸/亚克力/海报/挂件，满30件发车，冷热捆绑1:2',
    days: 5,
    members: 23,
    depositRate: 0.5,
  },
  {
    id: 'proxy_deposit',
    stage: 'deposit_collecting',
    name: '咒术回战 五条悟限定代购',
    ip: '咒术回战',
    desc: '日谷代购，五条悟生日限定周边，含立牌/吧唧/明信片/色纸/海报',
    days: 12,
    members: 45,
    depositRate: 0.5,
  },
  {
    id: 'proxy_final',
    stage: 'final_collecting',
    name: '蓝锁 世界篇周边拼车',
    ip: '蓝锁',
    desc: '蓝锁世界篇新品代购，日本直邮，预计3-4周到货',
    days: 20,
    members: 56,
    depositRate: 0.5,
  },
  {
    id: 'proxy_shipping',
    stage: 'shipping',
    name: '海贼王 25周年代购发货中',
    ip: '海贼王',
    desc: '海贼王25周年限定周边已到仓验货完毕，正在逐一发出，顺丰包邮',
    days: 40,
    members: 82,
    depositRate: 0.5,
  },
  {
    id: 'proxy_closed',
    stage: 'closed',
    name: '鬼灭之刃 最终卷拼车(已截团)',
    ip: '鬼灭之刃',
    desc: '本团已完成所有发货与售后，感谢大家支持！',
    days: 60,
    members: 68,
    depositRate: 0.5,
  },
];

function buildProducts(def: typeof STAGE_DEFS[number], index: number): Product[] {
  const base = 20 + index * 5;
  return [
    { id: `${def.id}_p1`, groupId: def.id, name: `${def.ip} · 吧唧`, price: base + 15, heat: 'hot', stock: 80, sold: Math.min(def.members, 60), weight: 0.05, createdAt: now - def.days * DAY },
    { id: `${def.id}_p2`, groupId: def.id, name: `${def.ip} · 色纸`, price: base, heat: 'cold', stock: 80, sold: Math.floor(def.members * 0.3), weight: 0.03, createdAt: now - def.days * DAY },
    { id: `${def.id}_p3`, groupId: def.id, name: `${def.ip} · 亚克力立牌`, price: base + 10, heat: 'normal', stock: 60, sold: Math.floor(def.members * 0.5), weight: 0.08, createdAt: now - def.days * DAY },
    { id: `${def.id}_p4`, groupId: def.id, name: `${def.ip} · 海报`, price: base - 2, heat: 'cold', stock: 50, sold: Math.floor(def.members * 0.2), weight: 0.1, createdAt: now - def.days * DAY },
    { id: `${def.id}_p5`, groupId: def.id, name: `${def.ip} · 限定挂件`, price: base + 20, heat: 'hot', stock: 40, sold: Math.floor(def.members * 0.6), weight: 0.06, createdAt: now - def.days * DAY },
  ];
}

export const mockGroups: Group[] = STAGE_DEFS.map((def, i) => ({
  id: def.id,
  name: def.name,
  type: 'proxy' as const,
  payMode: 'deposit' as const,
  description: def.desc,
  ipName: def.ip,
  stage: def.stage,
  products: buildProducts(def, i),
  bundleRules: i === 0 ? [{ hotProductId: '*', coldCount: 2, coldPoolIds: [`${def.id}_p2`, `${def.id}_p4`] }] : [],
  depositRate: def.depositRate,
  exchangeRate: 0.048,
  currency: 'JPY',
  startDate: now - def.days * DAY,
  endDate: now + Math.max(5, 30 - i * 5) * DAY,
  memberCount: def.members,
  totalRevenue: def.members * 55,
  collectedAmount: Math.floor(def.members * 55 * (0.3 + i * 0.15)),
  createdAt: now - def.days * DAY,
  updatedAt: now - DAY,
}));

// ──────────────────────────────────────────────────
// 团员 mock
// ──────────────────────────────────────────────────

const names = ['星月', '七七', '小鹿', '柚子', '棉花糖', '阿澈', '夏目', '初雪', '泡芙', '栗子', '团子', '桃酥'];
const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '重庆', '长沙', '西安', '苏州'];
const addresses = [
  '朝阳区望京SOHO T3',
  '浦东新区陆家嘴环路1288号',
  '天河区体育西路123号',
  '南山区科技园南路18号',
  '西湖区文三路555号',
  '高新区天府三街69号',
  '洪山区光谷大道70号',
  '鼓楼区中山北路200号',
  '渝中区解放碑步行街',
  '岳麓区麓山南路1号',
  '雁塔区小寨西路98号',
  '工业园区星湖街328号',
];
const notes = [
  '要求代拍最右边的那一款',
  '如果有瑕疵可接受 不用补发',
  '',
  '帮我多问问有没有特典',
  '地址下周可能会改 到时候联系你',
  '',
  '快递不要放驿站 送上门',
  '',
  '祝团长生意兴隆！',
  '希望能尽快发货～',
  '',
  '麻烦团长备注一下我要的是A款',
];

// 每个团分配不同状态的订单
type StageOrderStatus = {
  statuses: Order['status'][];
};

const stageOrderMap: Record<string, StageOrderStatus> = {
  proxy_gathering:  { statuses: ['pending_deposit', 'pending_deposit', 'pending_deposit', 'pending_deposit'] },
  proxy_deposit:    { statuses: ['pending_deposit', 'pending_deposit', 'deposit_paid', 'deposit_paid', 'pending_deposit'] },
  proxy_final:      { statuses: ['deposit_paid', 'pending_final', 'pending_final', 'final_paid', 'pending_final'] },
  proxy_shipping:   { statuses: ['final_paid', 'final_paid', 'shipping', 'shipped', 'shipping', 'shipped'] },
  proxy_closed:     { statuses: ['completed', 'completed', 'completed', 'shipped', 'completed'] },
};

export const mockOrders: Order[] = mockGroups.flatMap((group) => {
  const cfg = stageOrderMap[group.id];
  if (!cfg) return [];
  const prods = group.products;

  return cfg.statuses.map((st, i) => {
    const memberIdx = i % names.length;
    const itemCount = 1 + (i % 3);
    const items = Array.from({ length: itemCount }, (_, j) => {
      const p = prods[(i + j) % prods.length];
      return { productId: p.id, productName: p.name, quantity: 1, unitPrice: p.price, heat: p.heat };
    });
    const total = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const deposit = Math.round(total * group.depositRate);
    const dpaid = st === 'pending_deposit' ? 0 : deposit;
    const fpaid = ['pending_deposit', 'deposit_paid', 'pending_final'].includes(st) ? 0 : total - deposit;

    return {
      id: `${group.id}_o${i + 1}`,
      groupId: group.id,
      memberId: `m${memberIdx + 1}`,
      memberName: names[memberIdx],
      items,
      status: st,
      totalAmount: total,
      depositAmount: deposit,
      depositPaid: dpaid,
      finalAmount: total - deposit,
      finalPaid: fpaid,
      shippingFee: 8,
      shippingFeePaid: ['shipped', 'completed'].includes(st) ? 8 : 0,
      isMawei: i === 0,
      priority: i === 0 ? 1 : i + 10,
      trackingNumbers: ['shipped', 'completed'].includes(st) ? [`SF${1000000 + i}`] : [],
      createdAt: now - (group.memberCount - i) * DAY,
      updatedAt: now - (i % 3) * DAY,
    } satisfies Order;
  });
});

export const mockPayments: Payment[] = mockOrders
  .filter((o) => o.depositPaid > 0)
  .map((o) => ({
    id: `pay_${o.id}`,
    orderId: o.id,
    groupId: o.groupId,
    memberId: o.memberId,
    memberName: o.memberName,
    type: 'deposit' as const,
    amount: o.depositPaid,
    method: (['wechat', 'alipay', 'bank'] as const)[Math.floor(Math.random() * 3)],
    status: 'confirmed' as const,
    createdAt: o.createdAt + DAY,
    confirmedAt: o.createdAt + DAY + 3600000,
  }));

export const mockBlacklist: BlacklistEntry[] = [
  { id: 'bl1', memberName: '跑路小王', memberId: 'bm1', reason: '连续3次逃单不付尾款', reportedBy: '团长A', reportCount: 5, createdAt: now - 30 * DAY },
  { id: 'bl2', memberName: '白嫖怪', memberId: 'bm2', reason: '定金付了但尾款拖延2个月', reportedBy: '团长B', reportCount: 3, createdAt: now - 20 * DAY },
];

export const mockMembers: Member[] = names.map((n, i) => ({
  id: `m${i + 1}`,
  nickname: n,
  avatar: n.charAt(0),
  city: cities[i % cities.length],
  address: addresses[i % addresses.length],
  note: notes[i % notes.length],
  creditScore: 60 + Math.floor(Math.random() * 40),
  totalOrders: 3 + Math.floor(Math.random() * 15),
  completedOrders: 2 + Math.floor(Math.random() * 10),
  escapedOrders: Math.random() > 0.8 ? 1 : 0,
  joinedAt: now - (60 + i * 5) * DAY,
}));
