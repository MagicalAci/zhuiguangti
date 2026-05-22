import { Group, Product } from '../types';
import { formatCurrency } from '../utils/helpers';

interface PromoResult {
  xiaohongshu: string;
  qqZone: string;
  wechat: string;
  plain: string;
}

export function aiGeneratePromo(group: Group): PromoResult {
  const hot = group.products.filter((p) => p.heat === 'hot');
  const priceRange = group.products.length > 0
    ? `${formatCurrency(Math.min(...group.products.map((p) => p.price)))}~${formatCurrency(Math.max(...group.products.map((p) => p.price)))}`
    : '';
  const isProxy = group.type === 'proxy';

  const xiaohongshu = [
    `${isProxy ? '🇯🇵' : '🎨'} ${group.name}`,
    '',
    `📣 ${isProxy ? '代购团来啦！' : '自制周边开团啦！'}`,
    `💜 IP：${group.ipName}`,
    `📦 共${group.products.length}款商品`,
    hot.length > 0 ? `🔥 热门：${hot.map((p) => p.name).join(' / ')}` : '',
    `💰 价格区间：${priceRange}`,
    `👥 已有${group.memberCount}人跟团`,
    '',
    `✅ 团长信誉认证 | 全程进度透明`,
    isProxy ? `✅ 支持冷热捆绑 | 妈位优先` : `✅ 三段收费 | 定金可退`,
    `✅ 黑名单共享 | 安全有保障`,
    '',
    `⏰ 名额有限，速来！`,
    '',
    `#${group.ipName} #谷子 #${isProxy ? '代购' : '自制周边'} #追光体开团`,
  ].filter(Boolean).join('\n');

  const qqZone = [
    `【${group.name}】`,
    ``,
    `${isProxy ? '日谷代购' : '自制周边'}开团~`,
    `IP：${group.ipName}`,
    `${group.products.length}款商品 | ${priceRange}`,
    hot.length > 0 ? `热门：${hot.map((p) => p.name).join('、')}` : '',
    ``,
    `定金${(group.depositRate * 100).toFixed(0)}% | 信誉团长 | 进度全透明`,
    `已有${group.memberCount}人上车~快来！`,
  ].filter(Boolean).join('\n');

  const wechat = [
    `${isProxy ? '🇯🇵' : '🎨'}${group.name}`,
    `${group.products.length}款 | ${priceRange}`,
    hot.length > 0 ? `🔥${hot.map((p) => p.name).join('/')}` : '',
    `定金${(group.depositRate * 100).toFixed(0)}% | ${group.memberCount}人已跟团`,
    `👇点击链接直接下单`,
  ].filter(Boolean).join('\n');

  const plain = `${group.name}\nIP: ${group.ipName}\n${group.products.length}款商品，${priceRange}\n${group.memberCount}人已跟团`;

  return { xiaohongshu, qqZone, wechat, plain };
}
