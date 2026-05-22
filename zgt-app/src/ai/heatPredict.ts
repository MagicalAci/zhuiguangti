import { Product, HeatLevel } from '../types';

interface HeatPrediction {
  productId: string;
  name: string;
  currentHeat: HeatLevel;
  predictedScore: number;
  recommendedHeat: HeatLevel;
  reason: string;
}

interface HeatAnalysis {
  predictions: HeatPrediction[];
  recommendedColdPerHot: number;
  hotCount: number;
  coldCount: number;
  normalCount: number;
  summary: string;
  warnings: string[];
}

export function aiPredictHeat(products: Product[]): HeatAnalysis {
  const predictions: HeatPrediction[] = products.map((p) => {
    let score = 50;

    if (p.stock > 0) {
      const sellRate = p.sold / p.stock;
      score += sellRate * 40;
    }

    if (p.price > 0) {
      if (p.price > 100) score += 5;
      else if (p.price < 20) score -= 5;
    }

    const daysSinceCreated = (Date.now() - p.createdAt) / 86400000;
    if (daysSinceCreated > 0 && p.sold > 0) {
      const dailySellRate = p.sold / daysSinceCreated;
      score += Math.min(dailySellRate * 10, 20);
    }

    if (p.name.includes('限定') || p.name.includes('全员')) score += 10;
    if (p.name.includes('盲盒') || p.name.includes('盲袋')) score += 8;

    score = Math.round(Math.max(0, Math.min(100, score)));

    let recommendedHeat: HeatLevel = 'normal';
    if (score >= 70) recommendedHeat = 'hot';
    else if (score <= 35) recommendedHeat = 'cold';

    const reasons: string[] = [];
    if (p.stock > 0 && p.sold / p.stock > 0.7) reasons.push('销售率高');
    if (p.stock > 0 && p.sold / p.stock < 0.2) reasons.push('销售率低');
    if (recommendedHeat !== p.heat) reasons.push(`建议调整为${recommendedHeat === 'hot' ? '热门' : recommendedHeat === 'cold' ? '冷门' : '普通'}`);
    if (reasons.length === 0) reasons.push('热度适中');

    return {
      productId: p.id,
      name: p.name,
      currentHeat: p.heat,
      predictedScore: score,
      recommendedHeat,
      reason: reasons.join('、'),
    };
  });

  const hotCount = predictions.filter((p) => p.recommendedHeat === 'hot').length;
  const coldCount = predictions.filter((p) => p.recommendedHeat === 'cold').length;
  const normalCount = predictions.filter((p) => p.recommendedHeat === 'normal').length;

  const recommendedColdPerHot = hotCount > 0 ? Math.max(1, Math.round(coldCount / hotCount)) : 2;

  const mismatch = predictions.filter((p) => p.currentHeat !== p.recommendedHeat);
  const warnings: string[] = [];
  if (mismatch.length > 0) {
    warnings.push(`${mismatch.length}个商品的冷热标签建议调整`);
  }
  if (hotCount > 0 && coldCount < hotCount) {
    warnings.push(`冷门商品不足：${hotCount}个热门但只有${coldCount}个冷门，捆绑可能失衡`);
  }
  if (coldCount > hotCount * 3) {
    warnings.push('冷门商品过多，可能导致难以出货');
  }

  const summary = `AI热度分析：${products.length}款商品中，预测${hotCount}款热门、${normalCount}款普通、${coldCount}款冷门。推荐冷热比1:${recommendedColdPerHot}。`;

  return { predictions, recommendedColdPerHot, hotCount, coldCount, normalCount, summary, warnings };
}
