import { Group, Order, Product, Payment, BlacklistEntry, Member } from '../types';
import { generateId } from './helpers';

const now = Date.now();
const DAY = 86400000;

const proxyProducts: Product[] = [
  { id: 'p1', groupId: 'g1', name: '朔间零 吧唧', price: 35, heat: 'hot', stock: 50, sold: 42, weight: 0.05, createdAt: now - 10 * DAY },
  { id: 'p2', groupId: 'g1', name: '天城一彩 吧唧', price: 35, heat: 'hot', stock: 50, sold: 38, weight: 0.05, createdAt: now - 10 * DAY },
  { id: 'p3', groupId: 'g1', name: '�的月永 亚克力', price: 28, heat: 'normal', stock: 50, sold: 20, weight: 0.08, createdAt: now - 10 * DAY },
  { id: 'p4', groupId: 'g1', name: '冰�的�的 吧唧', price: 18, heat: 'cold', stock: 50, sold: 8, weight: 0.05, createdAt: now - 10 * DAY },
  { id: 'p5', groupId: 'g1', name: '明星一号 色纸', price: 15, heat: 'cold', stock: 50, sold: 5, weight: 0.03, createdAt: now - 10 * DAY },
  { id: 'p6', groupId: 'g1', name: '明星二号 色纸', price: 15, heat: 'cold', stock: 50, sold: 3, weight: 0.03, createdAt: now - 10 * DAY },
  { id: 'p7', groupId: 'g1', name: '全员集合 海报', price: 22, heat: 'normal', stock: 30, sold: 15, weight: 0.1, createdAt: now - 10 * DAY },
  { id: 'p8', groupId: 'g1', name: '限定盲盒 挂件', price: 45, heat: 'hot', stock: 30, sold: 28, weight: 0.06, createdAt: now - 10 * DAY },
];

const customProducts: Product[] = [
  { id: 'p10', groupId: 'g2', name: '沈星回 香薰蜡烛', price: 68, heat: 'hot', stock: 200, sold: 156, weight: 0.3, createdAt: now - 5 * DAY },
  { id: 'p11', groupId: 'g2', name: '秦彻 香薰蜡烛', price: 68, heat: 'hot', stock: 200, sold: 142, weight: 0.3, createdAt: now - 5 * DAY },
  { id: 'p12', groupId: 'g2', name: '黎深 香薰蜡烛', price: 68, heat: 'normal', stock: 200, sold: 98, weight: 0.3, createdAt: now - 5 * DAY },
  { id: 'p13', groupId: 'g2', name: '祁煜 香薰蜡烛', price: 68, heat: 'normal', stock: 200, sold: 87, weight: 0.3, createdAt: now - 5 * DAY },
  { id: 'p14', groupId: 'g2', name: '全员套装 礼盒', price: 238, heat: 'hot', stock: 100, sold: 76, weight: 1.2, createdAt: now - 5 * DAY },
];

export const mockGroups: Group[] = [
  {
    id: 'g1',
    name: '偶像梦幻祭 6月新谷代购团',
    type: 'proxy',
    description: '日谷代购，含吧唧/色纸/亚克力/海报/挂件，冷热捆绑1:2',
    ipName: '偶像梦幻祭',
    stage: 'purchasing',
    products: proxyProducts,
    bundleRules: [{ hotProductId: '*', coldCount: 2, coldPoolIds: ['p4', 'p5', 'p6'] }],
    depositRate: 0.5,
    exchangeRate: 0.048,
    currency: 'JPY',
    startDate: now - 15 * DAY,
    endDate: now + 30 * DAY,
    memberCount: 86,
    totalRevenue: 12680,
    collectedAmount: 8950,
    createdAt: now - 15 * DAY,
    updatedAt: now - DAY,
  },
  {
    id: 'g2',
    name: '恋与深空 角色香薰蜡烛团',
    type: 'custom',
    description: '自制周边，手工香薰蜡烛，每款独立调香',
    ipName: '恋与深空',
    stage: 'manufacturing',
    products: customProducts,
    bundleRules: [],
    depositRate: 0.3,
    intentionFee: 5,
    startDate: now - 20 * DAY,
    endDate: now + 45 * DAY,
    memberCount: 312,
    totalRevenue: 48960,
    collectedAmount: 32400,
    createdAt: now - 20 * DAY,
    updatedAt: now - 2 * DAY,
  },
  // —— 团长视角：覆盖全流程所有阶段 ——
  ...buildLeaderStageGroups(),
  // —— 团员视角：覆盖全流程所有阶段 ——
  ...buildMemberStageGroups(),
  // —— 算法推荐档 ——
  ...buildRecommendGroups(),
];

// —— 团长视角全阶段 mock ——
function buildLeaderStageGroups(): Group[] {
  const stages: Array<{ stage: Group['stage']; name: string; ip: string; type: Group['type']; days: number; members: number }> = [
    { stage: 'preparing',          name: '排骨谷子预告',          ip: '排球少年', type: 'proxy',  days: 2,  members: 0 },
    { stage: 'gathering',          name: '蓝锁吧唧拼车',          ip: '蓝锁',     type: 'proxy',  days: 5,  members: 23 },
    { stage: 'gathered',           name: '咒术海报凑齐',          ip: '咒术回战', type: 'proxy',  days: 8,  members: 50 },
    { stage: 'recruiting',         name: '间谍过家家周边',         ip: '间谍过家家', type: 'custom', days: 3,  members: 15 },
    { stage: 'deposit_collecting', name: '鬼灭代购团',            ip: '鬼灭之刃', type: 'proxy',  days: 10, members: 68 },
    { stage: 'full_collecting',    name: '进击巨人最终季',         ip: '进击的巨人', type: 'proxy',  days: 7,  members: 42 },
    { stage: 'closed',             name: '文豪野犬自制本',         ip: '文豪野犬', type: 'custom', days: 15, members: 88 },
    { stage: 'final_collecting',   name: '银魂周边拼车',           ip: '银魂',     type: 'proxy',  days: 20, members: 56 },
    { stage: 'purchasing',         name: '火影忍者日代',           ip: '火影忍者', type: 'proxy',  days: 25, members: 74 },
    { stage: 'producing',          name: '猎人同人本',            ip: '猎人',     type: 'custom', days: 30, members: 120 },
    { stage: 'manufacturing',      name: '灌篮高手痛包',          ip: '灌篮高手', type: 'custom', days: 35, members: 95 },
    { stage: 'sampling',           name: '柯南自制挂件',          ip: '名侦探柯南', type: 'custom', days: 22, members: 63 },
    { stage: 'arrived',            name: '海贼王代购到仓',         ip: '海贼王',   type: 'proxy',  days: 40, members: 110 },
    { stage: 'shipping',           name: '龙珠周边发出',          ip: '龙珠',     type: 'proxy',  days: 45, members: 82 },
    { stage: 'completed',          name: '死神千年篇拼车',         ip: '死神',     type: 'proxy',  days: 60, members: 55 },
  ];
  const descs: (string | undefined)[] = [
    '日代拼车团，包含吧唧/色纸/亚克力/海报/挂件，冷热捆绑1:2，满30件发车',
    undefined,
    '凑车代购，满20件出一车，日本直邮，预计3-4周到货',
    '自制周边团，手工限量，每款限购2件，售完即止',
    undefined,
    '代购拼车，含税含运，按汇率实时结算，支持验货后确认收货',
    '文豪野犬自制合集本，A5尺寸，含特典明信片一套',
    undefined,
    '日代拼车第三期，老团长信誉保证，已成功发车50+次',
    '同人志印刷团，预计8周出货，过程中会更新制作进度',
    undefined,
    '自制挂件团，亚克力双面印刷，尺寸6cm，含独立包装',
    '代购到仓已验货，品质OK，预计3天内全部发出',
    '周边发货中，顺丰包邮，已录单号，请注意查收',
    '本团已完成所有发货与售后，感谢大家支持！',
  ];
  const rules: (string | undefined)[] = [
    '下单后不退不换，截团前可改单\n超时未付款视为弃单',
    '支持截团前退款，截团后不退不换',
    undefined,
    '自制商品不支持退换，色差以实物为准\n下单即视为同意',
    '下单后24h内可取消，超时不退\n补款截止后3天未付视为弃单',
    undefined,
    undefined,
    '不退不换，下单前请确认好想要的商品',
    '支持7天无理由退换，运费买家承担',
    undefined,
    '生产中不可退单，出货后可协商换货',
    undefined,
    '到货后如有破损，24h内联系团长补发\n非质量问题不退',
    '已发货订单不可退款，请确认收货地址无误',
    undefined,
  ];
  return stages.map<Group>((s, i) => ({
    id: `leader_${s.stage}`,
    name: s.name,
    type: s.type,
    description: descs[i] ?? '',
    orderRules: rules[i],
    ipName: s.ip,
    stage: s.stage,
    products: [
      { id: `l${i}_p1`, groupId: `leader_${s.stage}`, name: `${s.ip} · 吧唧`, price: 25 + i * 3, heat: 'hot', stock: 80, sold: Math.min(s.members, 60), weight: 0.05, createdAt: now - s.days * DAY },
      { id: `l${i}_p2`, groupId: `leader_${s.stage}`, name: `${s.ip} · 立牌`, price: 35 + i * 2, heat: 'normal', stock: 60, sold: Math.floor(s.members * 0.4), weight: 0.08, createdAt: now - s.days * DAY },
      { id: `l${i}_p3`, groupId: `leader_${s.stage}`, name: `${s.ip} · 色纸`, price: 15 + i, heat: 'cold', stock: 80, sold: Math.floor(s.members * 0.2), weight: 0.03, createdAt: now - s.days * DAY },
      { id: `l${i}_p4`, groupId: `leader_${s.stage}`, name: `${s.ip} · 挂件`, price: 20 + i * 2, heat: 'normal', stock: 50, sold: Math.floor(s.members * 0.3), weight: 0.04, createdAt: now - s.days * DAY },
      { id: `l${i}_p5`, groupId: `leader_${s.stage}`, name: `${s.ip} · 海报`, price: 18 + i, heat: 'cold', stock: 40, sold: Math.floor(s.members * 0.15), weight: 0.1, createdAt: now - s.days * DAY },
    ],
    bundleRules: [],
    depositRate: 0.3,
    startDate: now - s.days * DAY,
    endDate: now + (30 - i * 2) * DAY,
    memberCount: s.members,
    totalRevenue: s.members * 50,
    collectedAmount: Math.floor(s.members * 50 * 0.6),
    createdAt: now - s.days * DAY,
    updatedAt: now - DAY,
  }));
}

// —— 团员视角全阶段 mock ——
function buildMemberStageGroups(): Group[] {
  const stages: Array<{ stage: Group['stage']; name: string; ip: string; type: Group['type']; days: number; members: number }> = [
    { stage: 'gathering',          name: '原神甘雨拼车',          ip: '原神',       type: 'proxy',  days: 3,  members: 18 },
    { stage: 'recruiting',         name: '崩铁周边拼团',          ip: '崩坏星穹铁道', type: 'proxy',  days: 4,  members: 32 },
    { stage: 'deposit_collecting', name: '明日方舟代购',         ip: '明日方舟',   type: 'proxy',  days: 8,  members: 45 },
    { stage: 'full_collecting',    name: '少前2自制本',          ip: '少女前线2',   type: 'custom', days: 6,  members: 28 },
    { stage: 'closed',             name: 'FGO周边车已满',          ip: 'FGO',        type: 'proxy',  days: 12, members: 60 },
    { stage: 'final_collecting',   name: '碧蓝航线拼车',         ip: '碧蓝航线',   type: 'proxy',  days: 18, members: 72 },
    { stage: 'purchasing',         name: '公主连结代购',           ip: '公主连结',   type: 'proxy',  days: 22, members: 38 },
    { stage: 'producing',          name: 'VOCALOID同人',          ip: 'VOCALOID',   type: 'custom', days: 28, members: 85 },
    { stage: 'manufacturing',      name: '东方Project痛包',       ip: '东方Project', type: 'custom', days: 32, members: 55 },
    { stage: 'arrived',            name: '偶像大师到仓',           ip: '偶像大师',   type: 'proxy',  days: 38, members: 90 },
    { stage: 'shipping',           name: 'LoveLive发出',          ip: 'LoveLive',   type: 'proxy',  days: 42, members: 66 },
    { stage: 'completed',          name: '高达模型代购',           ip: '高达',       type: 'proxy',  days: 55, members: 48 },
  ];
  const mDescs: (string | undefined)[] = [
    '甘雨生日限定周边代购，含立牌/吧唧/明信片，拼车中',
    undefined,
    '明日方舟六周年代购团，品类丰富，团长经验丰富',
    '少前2同人本合集，作者亲签版限量50本',
    undefined,
    '碧蓝航线联动周边拼车，日本会场限定',
    '公主连结周年限定，代购中请耐心等待',
    undefined,
    undefined,
    '偶像大师代购已到仓，正在逐一验货分拣',
    'LL周边已发出，预计2-3天到达',
    '高达RG系列代购已完成，好评如潮',
  ];
  const mRules: (string | undefined)[] = [
    '截团前可退可换，截团后不退不换',
    undefined,
    '付定金后锁单，尾款截止前可减少数量但不可全退',
    '自制本不退不换，印刷色差属正常范围',
    undefined,
    '尾款超时未付自动踢出，定金不退',
    undefined,
    '制作周期内不可退单',
    '生产完成后不退不换',
    '到货后如有瑕疵请24h内反馈',
    undefined,
    undefined,
  ];
  return stages.map<Group>((s, i) => ({
    id: `member_${s.stage}`,
    name: s.name,
    type: s.type,
    description: mDescs[i] ?? '',
    orderRules: mRules[i],
    ipName: s.ip,
    stage: s.stage,
    products: [
      { id: `m${i}_p1`, groupId: `member_${s.stage}`, name: `${s.ip} · 吧唧`, price: 22 + i * 3, heat: 'hot', stock: 80, sold: Math.min(s.members, 50), weight: 0.05, createdAt: now - s.days * DAY },
      { id: `m${i}_p2`, groupId: `member_${s.stage}`, name: `${s.ip} · 立牌`, price: 38 + i * 2, heat: 'normal', stock: 60, sold: Math.floor(s.members * 0.5), weight: 0.08, createdAt: now - s.days * DAY },
      { id: `m${i}_p3`, groupId: `member_${s.stage}`, name: `${s.ip} · 色纸`, price: 12 + i, heat: 'cold', stock: 80, sold: Math.floor(s.members * 0.2), weight: 0.03, createdAt: now - s.days * DAY },
      { id: `m${i}_p4`, groupId: `member_${s.stage}`, name: `${s.ip} · 挂件`, price: 28 + i, heat: 'normal', stock: 50, sold: Math.floor(s.members * 0.35), weight: 0.04, createdAt: now - s.days * DAY },
    ],
    bundleRules: [],
    depositRate: 0.3,
    startDate: now - s.days * DAY,
    endDate: now + (25 - i * 2) * DAY,
    memberCount: s.members,
    totalRevenue: s.members * 45,
    collectedAmount: Math.floor(s.members * 45 * 0.5),
    createdAt: now - s.days * DAY,
    updatedAt: now - DAY,
  }));
}

function buildRecommendGroups(): Group[] {
  const recs: Array<{ id: string; name: string; ip: string; type: 'proxy' | 'custom'; price: number; desc: string }> = [
    { id: 'r1', name: '恋与深空 6 月新谷拼车',        ip: '恋与深空',     type: 'proxy',  price: 28, desc: '日代当周到，含立牌+吧唧+亚克力' },
    { id: 'r2', name: 'EXO 出道纪念 抱枕拼团',        ip: 'EXO',          type: 'custom', price: 78, desc: '自制双面印染 抱枕 ×4 款' },
    { id: 'r3', name: 'BLACKPINK Lisa 周边拼车',      ip: 'BLACKPINK',    type: 'proxy',  price: 45, desc: '北美专辑+小卡+海报' },
    { id: 'r4', name: '周深 演唱会 棉花娃娃定制',      ip: '周深',         type: 'custom', price: 99, desc: '20cm 娃娃 + 4 套衣服' },
    { id: 'r5', name: '咒术回战 五条悟 谷子团',        ip: '咒术回战',     type: 'proxy',  price: 32, desc: '日谷代购 · 含吧唧 / 海报 / 色纸' },
    { id: 'r6', name: 'Taylor Swift 周边拼车',         ip: 'Taylor Swift', type: 'proxy',  price: 58, desc: '北美直邮 · 新专限定周边' },
    { id: 'r7', name: '同人本 原创BL 合集拼团',        ip: '同人本',       type: 'custom', price: 35, desc: '同人志印刷 · A5 48P · 含特典' },
    { id: 'r8', name: '奥特曼 戴拿限定 拼车代购',      ip: '奥特曼',       type: 'proxy',  price: 42, desc: '日版限定手办 · 含运含税' },
    { id: 'r9', name: '棉花娃娃 20cm 定制拼团',        ip: '棉花娃娃',     type: 'custom', price: 88, desc: '定制棉花娃 + 3套娃衣 + 娃包' },
    { id: 'r10', name: 'IVE 应援手幅 拼车',            ip: 'IVE',          type: 'proxy',  price: 22, desc: '韩谷代购 · 应援手幅 / 小卡' },
    { id: 'r11', name: 'Marvel 漫威 限定手办拼车',      ip: 'Marvel',       type: 'proxy',  price: 128, desc: '美版官方限定 · 直邮包税' },
    { id: 'r12', name: '原神 申鹤 周边代购',            ip: '原神',         type: 'proxy',  price: 48, desc: '官店代购 · 立牌 + 挂件' },
    { id: 'r13', name: '宝可梦 皮卡丘 新品拼车',       ip: '宝可梦',       type: 'proxy',  price: 36, desc: '日本PC限定 · 毛绒 + 文具套装' },
    { id: 'r14', name: '蔡徐坤 应援自制 拼团',         ip: '蔡徐坤',       type: 'custom', price: 55, desc: '自制应援扇 + 手幅 + 小卡包' },
  ];
  return recs.map<Group>((r, i) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    description: r.desc,
    ipName: r.ip,
    stage: 'recruiting',
    products: [
      { id: `${r.id}_p1`, groupId: r.id, name: `${r.ip} · 吧唧`, price: r.price, heat: 'hot', stock: 80, sold: 30 + i * 5, weight: 0.05, createdAt: now - (i + 1) * DAY },
      { id: `${r.id}_p2`, groupId: r.id, name: `${r.ip} · 立牌`, price: Math.round(r.price * 1.5), heat: 'normal', stock: 60, sold: 12 + i, weight: 0.08, createdAt: now - (i + 1) * DAY },
      { id: `${r.id}_p3`, groupId: r.id, name: `${r.ip} · 色纸`, price: Math.round(r.price * 0.7), heat: 'cold', stock: 80, sold: 5 + i, weight: 0.03, createdAt: now - (i + 1) * DAY },
    ],
    bundleRules: [],
    depositRate: 0.3,
    exchangeRate: 0.048,
    currency: 'JPY',
    startDate: now - (3 + i) * DAY,
    endDate: now + (5 + i * 2) * DAY,
    memberCount: 40 + i * 10,
    totalRevenue: 800 + i * 200,
    collectedAmount: 400 + i * 100,
    createdAt: now - (3 + i) * DAY,
    updatedAt: now - i * DAY,
  }));
}

const names = ['星月', '七七', '小鹿', '柚子', '棉花糖', '阿澈', '夏目', '初雪', '泡芙', '栗子', '团子', '桃酥'];

export const mockOrders: Order[] = Array.from({ length: 24 }, (_, i) => {
  const isProxy = i < 12;
  const gid = isProxy ? 'g1' : 'g2';
  const prods = isProxy ? proxyProducts : customProducts;
  const itemCount = Math.floor(Math.random() * 3) + 1;
  const items = Array.from({ length: itemCount }, () => {
    const p = prods[Math.floor(Math.random() * prods.length)];
    return { productId: p.id, productName: p.name, quantity: 1, unitPrice: p.price, heat: p.heat };
  });
  const total = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const depositRate = isProxy ? 0.5 : 0.3;
  const deposit = Math.round(total * depositRate);
  const statuses: Order['status'][] = [
    'pending_deposit', 'deposit_paid', 'pending_final', 'final_paid', 'shipping', 'shipped', 'completed',
  ];
  const st = statuses[Math.min(i % 7, 6)];
  const dpaid = ['pending_deposit'].includes(st) ? 0 : deposit;
  const fpaid = ['pending_deposit', 'deposit_paid', 'pending_final'].includes(st) ? 0 : total - deposit;
  return {
    id: `o${i + 1}`,
    groupId: gid,
    memberId: `m${i + 1}`,
    memberName: names[i % names.length],
    items,
    status: st,
    totalAmount: total,
    depositAmount: deposit,
    depositPaid: dpaid,
    finalAmount: total - deposit,
    finalPaid: fpaid,
    shippingFee: 8,
    shippingFeePaid: ['shipped', 'completed'].includes(st) ? 8 : 0,
    isMawei: i % 5 === 0,
    priority: i % 5 === 0 ? 1 : i + 10,
    trackingNumbers: ['shipped', 'completed'].includes(st) ? [`SF${1000000 + i}`] : [],
    createdAt: now - (15 - i) * DAY,
    updatedAt: now - Math.floor(Math.random() * 3) * DAY,
  };
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
  { id: 'bl3', memberName: '嘻嘻哈哈', memberId: 'bm3', reason: '恶意转单后拒绝确认', reportedBy: '团长C', reportCount: 2, createdAt: now - 10 * DAY },
];

export const mockMembers: Member[] = names.map((n, i) => ({
  id: `m${i + 1}`,
  nickname: n,
  creditScore: 60 + Math.floor(Math.random() * 40),
  totalOrders: 3 + Math.floor(Math.random() * 15),
  completedOrders: 2 + Math.floor(Math.random() * 10),
  escapedOrders: Math.random() > 0.8 ? 1 : 0,
  joinedAt: now - (60 + i * 5) * DAY,
}));
