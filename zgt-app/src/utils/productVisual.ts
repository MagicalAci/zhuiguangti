import { HeatLevel } from '../types';

const PRODUCT_ICONS: Record<string, string> = {
  '吧唧': '🎀',
  '色纸': '🎨',
  '亚克力': '💎',
  '海报': '🖼️',
  '挂件': '🔑',
  '盲盒': '🎁',
  '盲袋': '🎁',
  '蜡烛': '🕯️',
  '香薰': '🕯️',
  '礼盒': '🎊',
  '套装': '🎊',
  '徽章': '📌',
  '贴纸': '⭐',
  '明信片': '💌',
  '立牌': '🏆',
  '书签': '📑',
  '手办': '🧸',
  '抱枕': '🛋️',
  '钥匙扣': '🔑',
  '杯子': '☕',
  '帆布包': '👜',
  '文件夹': '📁',
  '笔记本': '📓',
  '手机壳': '📱',
  '纸巾盒': '🧻',
  '鼠标垫': '🖱️',
};

const GRADIENT_PALETTES = [
  ['#FF6B6B', '#FFB4B4'],
  ['#845EC2', '#D5CABD'],
  ['#FF9671', '#FFC75F'],
  ['#00C9A7', '#92FE9D'],
  ['#4B7BEC', '#A5B1C2'],
  ['#FC5C7D', '#6A82FB'],
  ['#F77062', '#FE5196'],
  ['#667EEA', '#764BA2'],
  ['#43E97B', '#38F9D7'],
  ['#FA709A', '#FEE140'],
  ['#A18CD1', '#FBC2EB'],
  ['#FDDB92', '#D1FDFF'],
];

export function getProductIcon(name: string): string {
  for (const [keyword, icon] of Object.entries(PRODUCT_ICONS)) {
    if (name.includes(keyword)) return icon;
  }
  return '🎀';
}

export function getProductGradient(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[idx] as [string, string];
}

export function getHeatEmoji(heat: HeatLevel): string {
  if (heat === 'hot') return '🔥';
  if (heat === 'cold') return '❄️';
  return '⭐';
}
