import { GroupType, HeatLevel } from '../types';

interface TemplateProduct {
  name: string;
  price: number;
  heat: HeatLevel;
  stock: number;
}

interface TemplateResult {
  products: TemplateProduct[];
  recommendedDepositRate: number;
  recommendedColdPerHot: number;
  description: string;
  tips: string[];
}

const IP_DATABASE: Record<string, { characters: { name: string; heat: HeatLevel; basePrice: number }[]; avgDeposit: number; avgCold: number }> = {
  '偶像梦幻祭': {
    characters: [
      { name: '朔间零 吧唧', heat: 'hot', basePrice: 35 },
      { name: '天城一彩 吧唧', heat: 'hot', basePrice: 35 },
      { name: '逆先夏目 吧唧', heat: 'hot', basePrice: 32 },
      { name: '月永レオ 亚克力', heat: 'normal', basePrice: 28 },
      { name: '游木真 色纸', heat: 'normal', basePrice: 22 },
      { name: '仁兔成鸣 挂件', heat: 'normal', basePrice: 25 },
      { name: '守沢千秋 色纸', heat: 'cold', basePrice: 15 },
      { name: '�的场梨的 色纸', heat: 'cold', basePrice: 15 },
      { name: '全员集合 海报', heat: 'normal', basePrice: 20 },
      { name: '限定 盲盒挂件', heat: 'hot', basePrice: 45 },
    ],
    avgDeposit: 0.5,
    avgCold: 2,
  },
  '恋与深空': {
    characters: [
      { name: '沈星回 香薰蜡烛', heat: 'hot', basePrice: 68 },
      { name: '秦彻 香薰蜡烛', heat: 'hot', basePrice: 68 },
      { name: '黎深 香薰蜡烛', heat: 'normal', basePrice: 68 },
      { name: '祁煜 香薰蜡烛', heat: 'normal', basePrice: 68 },
      { name: '全员套装 礼盒', heat: 'hot', basePrice: 238 },
      { name: '角色立牌', heat: 'cold', basePrice: 25 },
      { name: '角色书签', heat: 'cold', basePrice: 15 },
    ],
    avgDeposit: 0.3,
    avgCold: 1,
  },
  '世界之外': {
    characters: [
      { name: '角色A 徽章', heat: 'hot', basePrice: 18 },
      { name: '角色B 亚克力', heat: 'hot', basePrice: 28 },
      { name: '角色C 贴纸', heat: 'normal', basePrice: 12 },
      { name: '角色D 明信片', heat: 'cold', basePrice: 10 },
      { name: '全员 海报', heat: 'normal', basePrice: 20 },
      { name: '盲袋 挂件', heat: 'hot', basePrice: 35 },
    ],
    avgDeposit: 0.3,
    avgCold: 2,
  },
};

export function aiGenerateTemplate(ipName: string, groupType: GroupType): TemplateResult {
  const db = IP_DATABASE[ipName];

  if (db) {
    const products: TemplateProduct[] = db.characters.map((c) => ({
      name: c.name,
      price: groupType === 'proxy' ? c.basePrice : Math.round(c.basePrice * 1.3),
      heat: c.heat,
      stock: c.heat === 'hot' ? 30 : c.heat === 'cold' ? 80 : 50,
    }));

    return {
      products,
      recommendedDepositRate: db.avgDeposit,
      recommendedColdPerHot: db.avgCold,
      description: `${ipName} ${groupType === 'proxy' ? '代购团' : '自制团'} — AI根据历史数据自动推荐`,
      tips: [
        `该IP热门角色${products.filter((p) => p.heat === 'hot').length}个，建议冷热比1:${db.avgCold}`,
        `推荐定金比例${(db.avgDeposit * 100).toFixed(0)}%，基于同类团历史数据`,
        groupType === 'proxy' ? '代购团建议预留汇率浮动空间5%' : '自制团建议先收意向金¥5-10验证需求',
      ],
    };
  }

  const defaultProducts: TemplateProduct[] = [
    { name: `${ipName} 角色A 吧唧`, price: 25, heat: 'hot', stock: 50 },
    { name: `${ipName} 角色B 吧唧`, price: 25, heat: 'normal', stock: 50 },
    { name: `${ipName} 角色C 色纸`, price: 15, heat: 'cold', stock: 50 },
    { name: `${ipName} 全员 海报`, price: 20, heat: 'normal', stock: 30 },
  ];

  return {
    products: defaultProducts,
    recommendedDepositRate: groupType === 'proxy' ? 0.5 : 0.3,
    recommendedColdPerHot: 2,
    description: `${ipName} — AI生成的默认模板，请根据实际商品修改`,
    tips: [
      'AI未找到该IP的历史数据，已生成通用模板',
      '请根据实际商品信息修改名称和价格',
      '建议设置冷热比1:2以保证冷门出货',
    ],
  };
}

export function getKnownIPs(): string[] {
  return Object.keys(IP_DATABASE);
}
