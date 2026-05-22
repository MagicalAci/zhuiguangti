-- =====================================================
-- 追光体 APP · Supabase Schema
-- =====================================================

-- 团 (groups)
create table if not exists groups (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  type          text not null default 'proxy',         -- proxy | custom
  pay_mode      text default 'deposit',                -- deposit | full
  cover_image   text,
  description   text not null default '',
  ip_name       text not null default '',
  stage         text not null default 'gathering',
  deposit_rate  real not null default 0.5,
  intention_fee real,
  exchange_rate real,
  currency      text,
  start_date    bigint not null default (extract(epoch from now()) * 1000)::bigint,
  end_date      bigint,
  max_members   integer,
  member_count  integer not null default 0,
  total_revenue real not null default 0,
  collected_amount real not null default 0,
  created_at    bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at    bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- 商品 (products)
create table if not exists products (
  id            text primary key default gen_random_uuid()::text,
  group_id      text not null references groups(id) on delete cascade,
  name          text not null,
  image         text,
  price         real not null,
  original_price real,
  heat          text not null default 'normal',        -- hot | cold | normal
  stock         integer not null default 0,
  sold          integer not null default 0,
  bundle_required integer,
  weight        real,
  ai_heat_score real,
  created_at    bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_products_group on products(group_id);

-- 团员 (members)
create table if not exists members (
  id              text primary key default gen_random_uuid()::text,
  nickname        text not null,
  avatar          text,
  city            text,
  address         text,
  note            text,
  credit_score    integer not null default 80,
  total_orders    integer not null default 0,
  completed_orders integer not null default 0,
  escaped_orders  integer not null default 0,
  joined_at       bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- 订单 (orders)
create table if not exists orders (
  id              text primary key default gen_random_uuid()::text,
  group_id        text not null references groups(id) on delete cascade,
  member_id       text not null references members(id),
  member_name     text not null,
  items           jsonb not null default '[]'::jsonb,   -- OrderItem[]
  status          text not null default 'pending_deposit',
  total_amount    real not null default 0,
  deposit_amount  real not null default 0,
  deposit_paid    real not null default 0,
  final_amount    real not null default 0,
  final_paid      real not null default 0,
  shipping_fee    real not null default 0,
  shipping_fee_paid real not null default 0,
  is_mawei        boolean not null default false,
  priority        integer not null default 99,
  address         jsonb,                                -- ShippingAddress
  tracking_numbers text[] not null default '{}',
  note            text,
  ai_sort_score   real,
  created_at      bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at      bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_orders_group on orders(group_id);
create index if not exists idx_orders_member on orders(member_id);

-- 支付 (payments)
create table if not exists payments (
  id            text primary key default gen_random_uuid()::text,
  order_id      text not null references orders(id) on delete cascade,
  group_id      text not null references groups(id) on delete cascade,
  member_id     text not null references members(id),
  member_name   text not null,
  type          text not null,                         -- intention | deposit | final | shipping_extra
  amount        real not null,
  method        text not null default 'wechat',        -- wechat | alipay | bank
  status        text not null default 'pending',       -- pending | confirmed | rejected
  proof_image   text,
  created_at    bigint not null default (extract(epoch from now()) * 1000)::bigint,
  confirmed_at  bigint
);

create index if not exists idx_payments_order on payments(order_id);
create index if not exists idx_payments_group on payments(group_id);

-- 黑名单 (blacklist)
create table if not exists blacklist (
  id            text primary key default gen_random_uuid()::text,
  member_name   text not null,
  member_id     text not null,
  reason        text not null,
  reported_by   text not null,
  report_count  integer not null default 1,
  created_at    bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- 捆绑规则 (bundle_rules) — 存在 group 侧的 JSON，但也有独立表方便查询
create table if not exists bundle_rules (
  id              text primary key default gen_random_uuid()::text,
  group_id        text not null references groups(id) on delete cascade,
  hot_product_id  text not null default '*',
  cold_count      integer not null default 2,
  cold_pool_ids   text[] not null default '{}'
);

create index if not exists idx_bundle_rules_group on bundle_rules(group_id);

-- RLS 暂时全开（demo 阶段）
alter table groups enable row level security;
alter table products enable row level security;
alter table members enable row level security;
alter table orders enable row level security;
alter table payments enable row level security;
alter table blacklist enable row level security;
alter table bundle_rules enable row level security;

create policy "public read groups" on groups for select using (true);
create policy "public write groups" on groups for all using (true) with check (true);

create policy "public read products" on products for select using (true);
create policy "public write products" on products for all using (true) with check (true);

create policy "public read members" on members for select using (true);
create policy "public write members" on members for all using (true) with check (true);

create policy "public read orders" on orders for select using (true);
create policy "public write orders" on orders for all using (true) with check (true);

create policy "public read payments" on payments for select using (true);
create policy "public write payments" on payments for all using (true) with check (true);

create policy "public read blacklist" on blacklist for select using (true);
create policy "public write blacklist" on blacklist for all using (true) with check (true);

create policy "public read bundle_rules" on bundle_rules for select using (true);
create policy "public write bundle_rules" on bundle_rules for all using (true) with check (true);
