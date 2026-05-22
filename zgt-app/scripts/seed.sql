-- =====================================================
-- 追光体 APP · Seed Data (5 个拼车代购团 × 5 阶段)
-- =====================================================

-- 清空旧数据
truncate payments, orders, products, bundle_rules, blacklist, members, groups cascade;

-- ──────── 团员 (12人) ────────
insert into members (id, nickname, avatar, city, address, note, credit_score) values
  ('m1',  '星月',   '星', '北京', '朝阳区望京SOHO T3',          '要求代拍最右边的那一款',           92),
  ('m2',  '七七',   '七', '上海', '浦东新区陆家嘴环路1288号',      '如果有瑕疵可接受 不用补发',        85),
  ('m3',  '小鹿',   '鹿', '广州', '天河区体育西路123号',           '',                               78),
  ('m4',  '柚子',   '柚', '深圳', '南山区科技园南路18号',           '帮我多问问有没有特典',             90),
  ('m5',  '棉花糖', '棉', '杭州', '西湖区文三路555号',              '地址下周可能会改 到时候联系你',     88),
  ('m6',  '阿澈',   '澈', '成都', '高新区天府三街69号',            '',                               75),
  ('m7',  '夏目',   '夏', '武汉', '洪山区光谷大道70号',             '快递不要放驿站 送上门',            95),
  ('m8',  '初雪',   '初', '南京', '鼓楼区中山北路200号',            '',                               82),
  ('m9',  '泡芙',   '泡', '重庆', '渝中区解放碑步行街',             '祝团长生意兴隆！',                87),
  ('m10', '栗子',   '栗', '长沙', '岳麓区麓山南路1号',              '希望能尽快发货～',                91),
  ('m11', '团子',   '团', '西安', '雁塔区小寨西路98号',              '',                               80),
  ('m12', '桃酥',   '桃', '苏州', '工业园区星湖街328号',             '麻烦团长备注一下我要的是A款',     86);

-- ──────── 团1: 凑车中 ────────
insert into groups (id, name, type, pay_mode, description, ip_name, stage, deposit_rate, exchange_rate, currency, start_date, end_date, member_count, total_revenue, collected_amount)
values ('proxy_gathering', '偶像梦幻祭 6月新谷拼车', 'proxy', 'deposit',
  '日谷代购拼车，含吧唧/色纸/亚克力/海报/挂件，满30件发车，冷热捆绑1:2',
  '偶像梦幻祭', 'gathering', 0.5, 0.048, 'JPY',
  extract(epoch from now() - interval '5 days')::bigint * 1000,
  extract(epoch from now() + interval '30 days')::bigint * 1000,
  23, 1265, 379);

insert into products (id, group_id, name, price, original_price, heat, stock, sold, weight) values
  ('pg_p1', 'proxy_gathering', '偶像梦幻祭 · 吧唧',     35, 35, 'hot',    80, 23, 0.05),
  ('pg_p2', 'proxy_gathering', '偶像梦幻祭 · 色纸',     20, 20, 'cold',   80, 6,  0.03),
  ('pg_p3', 'proxy_gathering', '偶像梦幻祭 · 亚克力立牌', 30, 30, 'normal', 60, 11, 0.08),
  ('pg_p4', 'proxy_gathering', '偶像梦幻祭 · 海报',     18, 18, 'cold',   50, 4,  0.10),
  ('pg_p5', 'proxy_gathering', '偶像梦幻祭 · 限定挂件', 40, 40, 'hot',    40, 13, 0.06);

insert into bundle_rules (group_id, hot_product_id, cold_count, cold_pool_ids)
values ('proxy_gathering', '*', 2, '{pg_p2,pg_p4}');

-- 凑车中 → 订单全是 pending_deposit
insert into orders (id, group_id, member_id, member_name, items, status, total_amount, deposit_amount, deposit_paid, final_amount, final_paid, shipping_fee, is_mawei, priority) values
  ('pg_o1', 'proxy_gathering', 'm1', '星月', '[{"productId":"pg_p1","productName":"偶像梦幻祭 · 吧唧","quantity":2,"unitPrice":35,"heat":"hot"}]', 'pending_deposit', 70, 35, 0, 35, 0, 8, true,  1),
  ('pg_o2', 'proxy_gathering', 'm2', '七七', '[{"productId":"pg_p3","productName":"偶像梦幻祭 · 亚克力立牌","quantity":1,"unitPrice":30,"heat":"normal"}]', 'pending_deposit', 30, 15, 0, 15, 0, 8, false, 10),
  ('pg_o3', 'proxy_gathering', 'm3', '小鹿', '[{"productId":"pg_p5","productName":"偶像梦幻祭 · 限定挂件","quantity":1,"unitPrice":40,"heat":"hot"},{"productId":"pg_p2","productName":"偶像梦幻祭 · 色纸","quantity":2,"unitPrice":20,"heat":"cold"}]', 'pending_deposit', 80, 40, 0, 40, 0, 8, false, 11),
  ('pg_o4', 'proxy_gathering', 'm4', '柚子', '[{"productId":"pg_p1","productName":"偶像梦幻祭 · 吧唧","quantity":1,"unitPrice":35,"heat":"hot"}]', 'pending_deposit', 35, 17, 0, 18, 0, 8, false, 12);

-- ──────── 团2: 收定金 ────────
insert into groups (id, name, type, pay_mode, description, ip_name, stage, deposit_rate, exchange_rate, currency, start_date, end_date, member_count, total_revenue, collected_amount)
values ('proxy_deposit', '咒术回战 五条悟限定代购', 'proxy', 'deposit',
  '日谷代购，五条悟生日限定周边，含立牌/吧唧/明信片/色纸/海报',
  '咒术回战', 'deposit_collecting', 0.5, 0.048, 'JPY',
  extract(epoch from now() - interval '12 days')::bigint * 1000,
  extract(epoch from now() + interval '20 days')::bigint * 1000,
  45, 2475, 990);

insert into products (id, group_id, name, price, original_price, heat, stock, sold, weight) values
  ('pd_p1', 'proxy_deposit', '咒术回战 · 吧唧',     40, 40, 'hot',    80, 45, 0.05),
  ('pd_p2', 'proxy_deposit', '咒术回战 · 色纸',     25, 25, 'cold',   80, 13, 0.03),
  ('pd_p3', 'proxy_deposit', '咒术回战 · 亚克力立牌', 35, 35, 'normal', 60, 22, 0.08),
  ('pd_p4', 'proxy_deposit', '咒术回战 · 海报',     23, 23, 'cold',   50, 9,  0.10),
  ('pd_p5', 'proxy_deposit', '咒术回战 · 限定挂件', 45, 45, 'hot',    40, 27, 0.06);

insert into orders (id, group_id, member_id, member_name, items, status, total_amount, deposit_amount, deposit_paid, final_amount, final_paid, shipping_fee, is_mawei, priority) values
  ('pd_o1', 'proxy_deposit', 'm5', '棉花糖', '[{"productId":"pd_p1","productName":"咒术回战 · 吧唧","quantity":2,"unitPrice":40,"heat":"hot"}]', 'pending_deposit', 80, 40, 0, 40, 0, 8, true, 1),
  ('pd_o2', 'proxy_deposit', 'm6', '阿澈',   '[{"productId":"pd_p5","productName":"咒术回战 · 限定挂件","quantity":1,"unitPrice":45,"heat":"hot"}]', 'pending_deposit', 45, 22, 0, 23, 0, 8, false, 10),
  ('pd_o3', 'proxy_deposit', 'm7', '夏目',   '[{"productId":"pd_p3","productName":"咒术回战 · 亚克力立牌","quantity":1,"unitPrice":35,"heat":"normal"}]', 'deposit_paid', 35, 17, 17, 18, 0, 8, false, 11),
  ('pd_o4', 'proxy_deposit', 'm8', '初雪',   '[{"productId":"pd_p1","productName":"咒术回战 · 吧唧","quantity":1,"unitPrice":40,"heat":"hot"},{"productId":"pd_p2","productName":"咒术回战 · 色纸","quantity":1,"unitPrice":25,"heat":"cold"}]', 'deposit_paid', 65, 32, 32, 33, 0, 8, false, 12),
  ('pd_o5', 'proxy_deposit', 'm9', '泡芙',   '[{"productId":"pd_p4","productName":"咒术回战 · 海报","quantity":1,"unitPrice":23,"heat":"cold"}]', 'pending_deposit', 23, 11, 0, 12, 0, 8, false, 13);

-- ──────── 团3: 收尾款 ────────
insert into groups (id, name, type, pay_mode, description, ip_name, stage, deposit_rate, exchange_rate, currency, start_date, end_date, member_count, total_revenue, collected_amount)
values ('proxy_final', '蓝锁 世界篇周边拼车', 'proxy', 'deposit',
  '蓝锁世界篇新品代购，日本直邮，预计3-4周到货',
  '蓝锁', 'final_collecting', 0.5, 0.048, 'JPY',
  extract(epoch from now() - interval '20 days')::bigint * 1000,
  extract(epoch from now() + interval '15 days')::bigint * 1000,
  56, 3080, 1848);

insert into products (id, group_id, name, price, original_price, heat, stock, sold, weight) values
  ('pf_p1', 'proxy_final', '蓝锁 · 吧唧',       45, 45, 'hot',    80, 56, 0.05),
  ('pf_p2', 'proxy_final', '蓝锁 · 色纸',       30, 30, 'cold',   80, 16, 0.03),
  ('pf_p3', 'proxy_final', '蓝锁 · 亚克力立牌',  40, 40, 'normal', 60, 28, 0.08),
  ('pf_p4', 'proxy_final', '蓝锁 · 海报',       28, 28, 'cold',   50, 11, 0.10),
  ('pf_p5', 'proxy_final', '蓝锁 · 限定挂件',   50, 50, 'hot',    40, 33, 0.06);

insert into orders (id, group_id, member_id, member_name, items, status, total_amount, deposit_amount, deposit_paid, final_amount, final_paid, shipping_fee, is_mawei, priority) values
  ('pf_o1', 'proxy_final', 'm1',  '星月',   '[{"productId":"pf_p1","productName":"蓝锁 · 吧唧","quantity":2,"unitPrice":45,"heat":"hot"}]', 'deposit_paid', 90, 45, 45, 45, 0, 8, true, 1),
  ('pf_o2', 'proxy_final', 'm10', '栗子',   '[{"productId":"pf_p5","productName":"蓝锁 · 限定挂件","quantity":1,"unitPrice":50,"heat":"hot"}]', 'pending_final', 50, 25, 25, 25, 0, 8, false, 10),
  ('pf_o3', 'proxy_final', 'm11', '团子',   '[{"productId":"pf_p3","productName":"蓝锁 · 亚克力立牌","quantity":1,"unitPrice":40,"heat":"normal"}]', 'pending_final', 40, 20, 20, 20, 0, 8, false, 11),
  ('pf_o4', 'proxy_final', 'm12', '桃酥',   '[{"productId":"pf_p1","productName":"蓝锁 · 吧唧","quantity":1,"unitPrice":45,"heat":"hot"},{"productId":"pf_p2","productName":"蓝锁 · 色纸","quantity":1,"unitPrice":30,"heat":"cold"}]', 'final_paid', 75, 37, 37, 38, 38, 8, false, 12),
  ('pf_o5', 'proxy_final', 'm4',  '柚子',   '[{"productId":"pf_p4","productName":"蓝锁 · 海报","quantity":1,"unitPrice":28,"heat":"cold"}]', 'pending_final', 28, 14, 14, 14, 0, 8, false, 13);

-- ──────── 团4: 发货中 ────────
insert into groups (id, name, type, pay_mode, description, ip_name, stage, deposit_rate, exchange_rate, currency, start_date, end_date, member_count, total_revenue, collected_amount)
values ('proxy_shipping', '海贼王 25周年代购发货中', 'proxy', 'deposit',
  '海贼王25周年限定周边已到仓验货完毕，正在逐一发出，顺丰包邮',
  '海贼王', 'shipping', 0.5, 0.048, 'JPY',
  extract(epoch from now() - interval '40 days')::bigint * 1000,
  extract(epoch from now() + interval '5 days')::bigint * 1000,
  82, 4510, 4059);

insert into products (id, group_id, name, price, original_price, heat, stock, sold, weight) values
  ('ps_p1', 'proxy_shipping', '海贼王 · 吧唧',       55, 55, 'hot',    80, 60, 0.05),
  ('ps_p2', 'proxy_shipping', '海贼王 · 色纸',       40, 40, 'cold',   80, 24, 0.03),
  ('ps_p3', 'proxy_shipping', '海贼王 · 亚克力立牌',  50, 50, 'normal', 60, 41, 0.08),
  ('ps_p4', 'proxy_shipping', '海贼王 · 海报',       38, 38, 'cold',   50, 16, 0.10),
  ('ps_p5', 'proxy_shipping', '海贼王 · 限定挂件',   60, 60, 'hot',    40, 49, 0.06);

insert into orders (id, group_id, member_id, member_name, items, status, total_amount, deposit_amount, deposit_paid, final_amount, final_paid, shipping_fee, shipping_fee_paid, is_mawei, priority, tracking_numbers) values
  ('ps_o1', 'proxy_shipping', 'm2', '七七',   '[{"productId":"ps_p1","productName":"海贼王 · 吧唧","quantity":2,"unitPrice":55,"heat":"hot"}]', 'final_paid', 110, 55, 55, 55, 55, 8, 0, true, 1, '{}'),
  ('ps_o2', 'proxy_shipping', 'm3', '小鹿',   '[{"productId":"ps_p5","productName":"海贼王 · 限定挂件","quantity":1,"unitPrice":60,"heat":"hot"}]', 'final_paid', 60, 30, 30, 30, 30, 8, 0, false, 10, '{}'),
  ('ps_o3', 'proxy_shipping', 'm5', '棉花糖', '[{"productId":"ps_p3","productName":"海贼王 · 亚克力立牌","quantity":1,"unitPrice":50,"heat":"normal"}]', 'shipping', 50, 25, 25, 25, 25, 8, 8, false, 11, '{}'),
  ('ps_o4', 'proxy_shipping', 'm7', '夏目',   '[{"productId":"ps_p1","productName":"海贼王 · 吧唧","quantity":1,"unitPrice":55,"heat":"hot"}]', 'shipped', 55, 27, 27, 28, 28, 8, 8, false, 12, '{SF1000001}'),
  ('ps_o5', 'proxy_shipping', 'm9', '泡芙',   '[{"productId":"ps_p2","productName":"海贼王 · 色纸","quantity":1,"unitPrice":40,"heat":"cold"}]', 'shipping', 40, 20, 20, 20, 20, 8, 0, false, 13, '{}'),
  ('ps_o6', 'proxy_shipping', 'm10','栗子',   '[{"productId":"ps_p4","productName":"海贼王 · 海报","quantity":1,"unitPrice":38,"heat":"cold"}]', 'shipped', 38, 19, 19, 19, 19, 8, 8, false, 14, '{SF1000002}');

-- ──────── 团5: 已截团 ────────
insert into groups (id, name, type, pay_mode, description, ip_name, stage, deposit_rate, exchange_rate, currency, start_date, end_date, member_count, total_revenue, collected_amount)
values ('proxy_closed', '鬼灭之刃 最终卷拼车(已截团)', 'proxy', 'deposit',
  '本团已完成所有发货与售后，感谢大家支持！',
  '鬼灭之刃', 'closed', 0.5, 0.048, 'JPY',
  extract(epoch from now() - interval '60 days')::bigint * 1000,
  extract(epoch from now() - interval '5 days')::bigint * 1000,
  68, 3740, 3740);

insert into products (id, group_id, name, price, original_price, heat, stock, sold, weight) values
  ('pc_p1', 'proxy_closed', '鬼灭之刃 · 吧唧',       60, 60, 'hot',    80, 60, 0.05),
  ('pc_p2', 'proxy_closed', '鬼灭之刃 · 色纸',       40, 40, 'cold',   80, 20, 0.03),
  ('pc_p3', 'proxy_closed', '鬼灭之刃 · 亚克力立牌',  50, 50, 'normal', 60, 34, 0.08),
  ('pc_p4', 'proxy_closed', '鬼灭之刃 · 海报',       38, 38, 'cold',   50, 13, 0.10),
  ('pc_p5', 'proxy_closed', '鬼灭之刃 · 限定挂件',   65, 65, 'hot',    40, 40, 0.06);

insert into orders (id, group_id, member_id, member_name, items, status, total_amount, deposit_amount, deposit_paid, final_amount, final_paid, shipping_fee, shipping_fee_paid, is_mawei, priority, tracking_numbers) values
  ('pc_o1', 'proxy_closed', 'm1',  '星月',   '[{"productId":"pc_p1","productName":"鬼灭之刃 · 吧唧","quantity":2,"unitPrice":60,"heat":"hot"}]', 'completed', 120, 60, 60, 60, 60, 8, 8, false, 1, '{SF2000001}'),
  ('pc_o2', 'proxy_closed', 'm6',  '阿澈',   '[{"productId":"pc_p5","productName":"鬼灭之刃 · 限定挂件","quantity":1,"unitPrice":65,"heat":"hot"}]', 'completed', 65, 32, 32, 33, 33, 8, 8, false, 10, '{SF2000002}'),
  ('pc_o3', 'proxy_closed', 'm8',  '初雪',   '[{"productId":"pc_p3","productName":"鬼灭之刃 · 亚克力立牌","quantity":1,"unitPrice":50,"heat":"normal"}]', 'completed', 50, 25, 25, 25, 25, 8, 8, false, 11, '{SF2000003}'),
  ('pc_o4', 'proxy_closed', 'm11', '团子',   '[{"productId":"pc_p1","productName":"鬼灭之刃 · 吧唧","quantity":1,"unitPrice":60,"heat":"hot"},{"productId":"pc_p2","productName":"鬼灭之刃 · 色纸","quantity":1,"unitPrice":40,"heat":"cold"}]', 'shipped', 100, 50, 50, 50, 50, 8, 8, false, 12, '{SF2000004}'),
  ('pc_o5', 'proxy_closed', 'm12', '桃酥',   '[{"productId":"pc_p4","productName":"鬼灭之刃 · 海报","quantity":1,"unitPrice":38,"heat":"cold"}]', 'completed', 38, 19, 19, 19, 19, 8, 8, false, 13, '{SF2000005}');

-- ──────── 黑名单 ────────
insert into blacklist (member_name, member_id, reason, reported_by, report_count) values
  ('跑路小王', 'bm1', '连续3次逃单不付尾款', '团长A', 5),
  ('白嫖怪',   'bm2', '定金付了但尾款拖延2个月', '团长B', 3);

-- ──────── 付款记录 ────────
insert into payments (order_id, group_id, member_id, member_name, type, amount, method, status, confirmed_at) values
  ('pd_o3', 'proxy_deposit',  'm7',  '夏目', 'deposit', 17, 'wechat', 'confirmed', extract(epoch from now() - interval '2 days')::bigint * 1000),
  ('pd_o4', 'proxy_deposit',  'm8',  '初雪', 'deposit', 32, 'alipay', 'confirmed', extract(epoch from now() - interval '1 day')::bigint * 1000),
  ('pf_o1', 'proxy_final',    'm1',  '星月', 'deposit', 45, 'wechat', 'confirmed', extract(epoch from now() - interval '10 days')::bigint * 1000),
  ('pf_o2', 'proxy_final',    'm10', '栗子', 'deposit', 25, 'alipay', 'confirmed', extract(epoch from now() - interval '8 days')::bigint * 1000),
  ('pf_o3', 'proxy_final',    'm11', '团子', 'deposit', 20, 'wechat', 'confirmed', extract(epoch from now() - interval '9 days')::bigint * 1000),
  ('pf_o4', 'proxy_final',    'm12', '桃酥', 'deposit', 37, 'bank',   'confirmed', extract(epoch from now() - interval '7 days')::bigint * 1000),
  ('pf_o4', 'proxy_final',    'm12', '桃酥', 'final',   38, 'wechat', 'confirmed', extract(epoch from now() - interval '3 days')::bigint * 1000),
  ('pf_o5', 'proxy_final',    'm4',  '柚子', 'deposit', 14, 'alipay', 'confirmed', extract(epoch from now() - interval '6 days')::bigint * 1000);
