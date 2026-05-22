import { Group, Order, ChatMessage } from '../types';
import { formatCurrency, GROUP_STAGES, getStageIndex } from '../utils/helpers';

interface ChatContext {
  group?: Group;
  order?: Order;
  role: 'leader' | 'member';
}

interface Intent {
  type: 'progress' | 'rules' | 'shipping_calc' | 'refund' | 'bundle' | 'payment' | 'general';
  confidence: number;
}

const KEYWORDS: Record<Intent['type'], string[]> = {
  progress: ['进度', '到哪了', '什么时候', '多久', '发货了吗', '到货', '阶段', '状态'],
  rules: ['规则', '冷热', '捆绑', '妈位', '怎么买', '怎么选', '优先'],
  shipping_calc: ['邮费', '运费', '超重', '补邮', '多少钱寄', '快递费'],
  refund: ['退', '退款', '不要了', '取消', '逃单'],
  bundle: ['搭配', '配几个', '冷门', '热门', '必须买'],
  payment: ['付款', '定金', '尾款', '怎么付', '支付', '转账', '收款'],
  general: [],
};

function detectIntent(text: string): Intent {
  let best: Intent = { type: 'general', confidence: 0.3 };
  for (const [type, keywords] of Object.entries(KEYWORDS)) {
    if (type === 'general') continue;
    const matches = keywords.filter((k) => text.includes(k)).length;
    if (matches > 0) {
      const conf = Math.min(0.5 + matches * 0.2, 0.95);
      if (conf > best.confidence) best = { type: type as Intent['type'], confidence: conf };
    }
  }
  return best;
}

export function aiChat(text: string, context: ChatContext): ChatMessage {
  const intent = detectIntent(text);
  let reply = '';

  switch (intent.type) {
    case 'progress': {
      if (context.order) {
        const statusMap: Record<string, string> = {
          pending_deposit: '等待付定金',
          deposit_paid: '定金已收，等待团长进货/制作',
          pending_final: '尾款待付，商品已准备好',
          final_paid: '全款已付，等待发货',
          shipping: '正在准备发货',
          shipped: `已发货，运单号：${context.order.trackingNumbers.join('、') || '待填写'}`,
          completed: '已完成！宝贝已签收',
        };
        reply = `你的订单当前状态：${statusMap[context.order.status] ?? context.order.status}。`;
      }
      if (context.group) {
        const stage = GROUP_STAGES[getStageIndex(context.group.stage)];
        reply += `\n团「${context.group.name}」当前阶段：${stage?.label ?? ''}。`;
        if (['purchasing', 'producing', 'manufacturing'].includes(context.group.stage)) {
          reply += '团长正在处理中，有进展会及时通知你哦~';
        }
      }
      if (!reply) reply = '请提供订单号或团名，我帮你查进度。';
      break;
    }
    case 'rules': {
      if (context.group) {
        const rule = context.group.bundleRules[0];
        if (rule) {
          reply = `「${context.group.name}」的规则：\n`;
          reply += `· 冷热捆绑：每选1个热门需搭配${rule.coldCount}个冷门\n`;
          reply += `· 定金比例：${(context.group.depositRate * 100).toFixed(0)}%\n`;
          if (context.group.intentionFee) reply += `· 意向金：¥${context.group.intentionFee}\n`;
          reply += `· 妈位享有热门优先购买权，但需搭配所有冷门`;
        } else {
          reply = `「${context.group.name}」暂无特殊冷热捆绑规则，正常选购即可。定金比例${(context.group.depositRate * 100).toFixed(0)}%。`;
        }
      } else {
        reply = '一般规则：选热门需搭配冷门（比例由团长设定），妈位有优先权但要承担冷门。具体规则请查看团详情。';
      }
      break;
    }
    case 'shipping_calc': {
      reply = '邮费计算规则：\n· 普通地区：首重1kg ¥8，续重¥5/kg\n· 偏远地区（西藏/新疆/内蒙古/青海/宁夏）：首重¥15，续重¥12/kg\n· 超重会自动生成补邮订单，团长会通知你补差价';
      break;
    }
    case 'refund': {
      if (context.role === 'member') {
        reply = '退款说明：\n· 定金一般不可退（具体看团长规则）\n· 成团前可联系团长协商退款\n· 成团后退单可能影响你的信用分\n· 建议先和团长沟通，避免产生纠纷';
      } else {
        reply = '处理退款建议：\n· 未付款订单可直接取消\n· 已付定金的退款需手动处理\n· 恶意逃单建议标记并加入黑名单\n· 频繁退单的团员会被系统降低信用分';
      }
      break;
    }
    case 'bundle': {
      if (context.group) {
        const rule = context.group.bundleRules[0];
        const hot = context.group.products.filter((p) => p.heat === 'hot');
        const cold = context.group.products.filter((p) => p.heat === 'cold');
        reply = `捆绑规则：每选1个热门需搭配${rule?.coldCount ?? 2}个冷门。\n`;
        reply += `当前热门${hot.length}款：${hot.map((p) => p.name).join('、')}\n`;
        reply += `当前冷门${cold.length}款：${cold.map((p) => p.name).join('、')}\n`;
        reply += '选购时系统会自动校验是否满足搭配要求。';
      } else {
        reply = '冷热捆绑是团长为了保证冷门商品也能出掉而设置的规则。每买一个热门，需搭配若干冷门。';
      }
      break;
    }
    case 'payment': {
      if (context.role === 'member') {
        reply = '付款流程：\n1. 选好商品提交订单\n2. 系统自动计算定金\n3. 在订单详情页支付定金\n4. 团长确认后等待进度\n5. 商品准备好后支付尾款\n6. 如有超重会生成补邮订单';
      } else {
        reply = '收款管理：\n· 团员下单后自动生成待收款记录\n· 可一键批量催付定金/尾款\n· AI对账帮你自动匹配收支\n· 异常款项（多付/少付/未付）红色标记';
      }
      break;
    }
    default:
      reply = context.role === 'member'
        ? '你好！我是追光体AI助手，可以帮你：\n· 查询订单进度\n· 解释团购规则\n· 计算邮费\n· 解答付款问题\n\n请告诉我你想了解什么？'
        : '你好！我是追光体AI助手，可以帮你：\n· 智能排表\n· 一键对账\n· 生成宣传文案\n· 自动回复团员问题\n\n请告诉我你需要什么？';
  }

  return {
    id: Date.now().toString(36),
    role: 'ai',
    text: reply,
    timestamp: Date.now(),
  };
}

export function getQuickReplies(role: 'leader' | 'member'): string[] {
  if (role === 'member') {
    return ['我的订单到哪了？', '冷热捆绑怎么选？', '邮费怎么算？', '能退款吗？', '怎么付款？'];
  }
  return ['帮我排表', '对账有异常吗？', '生成宣传文案', '怎么处理逃单？', '怎么设置冷热捆绑？'];
}
