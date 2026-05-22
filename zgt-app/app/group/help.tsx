import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const PURPLE = '#7C3AED';

const SECTIONS = [
  {
    title: '什么是拼团矩阵？',
    icon: '📊',
    body: '拼团矩阵是追光体独创的可视化拼团管理工具。它以表格的形式清晰展示每个团员的占位情况，让团长和团员都能一目了然地看到当前拼团进度。',
    hasImage: true,
  },
  {
    title: '矩阵怎么看？',
    icon: '👀',
    body: '矩阵的每一行代表一车，每一列代表一个 SKU（商品变体）。当一行中所有位置都被占满时，即为"凑满一车"。',
    bullets: [
      '横轴 = SKU（商品变体），按调价系数从高到低排列',
      '纵轴 = 车号，第1车、第2车 依次排列',
      '每个格子 = 一个团员的占位',
      '整行占满 = 凑满一车',
    ],
  },
  {
    title: '状态说明',
    icon: '🏷️',
    body: '格子的颜色代表当前的团状态，统一显示团的当前阶段：',
    statuses: [
      { color: '#3B82F6', label: '凑车中', desc: '还在凑人，位置未满' },
      { color: '#F43F5E', label: '待付定金', desc: '团长已发起收定金' },
      { color: '#A855F7', label: '待付尾款', desc: '定金已付，等补尾款' },
      { color: '#10B981', label: '已支付', desc: '全部款项已到位' },
      { color: '#6B7280', label: '已完成', desc: '订单已完成交付' },
    ],
  },
  {
    title: '团长操作指南',
    icon: '🛠️',
    body: '团长拥有以下管理权限，帮助高效管理拼团：',
    features: [
      {
        name: '🪓 砍排',
        desc: '当某一车无法凑齐时，团长可以砍掉整行或移除单个团员。点击车号砍整行，点击头像砍个人。',
      },
      {
        name: '🧩 调配',
        desc: '手动调整团员位置。先点击要移动的团员头像，再点击目标位置即可完成交换或移动。',
      },
    ],
  },
  {
    title: '团员视角',
    icon: '👤',
    body: '作为团员，你可以在矩阵中看到：',
    bullets: [
      '自己的位置会用紫色边框高亮 + 右上角"我"标识',
      '你可以看到整团的拼团进度',
      '凑满一车后状态会自动同步更新',
      '底部有图例说明各颜色含义',
    ],
  },
  {
    title: '常见问题',
    icon: '❓',
    qa: [
      { q: '为什么我的格子变了颜色？', a: '因为团长推进了团的阶段（如从凑车中→收定金），格子颜色会统一更新。' },
      { q: '我可以自己换位置吗？', a: '不可以，只有团长可以通过"调配"功能调整位置。如需调整请联系团长。' },
      { q: '空位是什么意思？', a: '表示该位置还没有团员占位，正在等待新成员加入。' },
      { q: '被砍排了怎么办？', a: '团长砍排时会通知你，你的订单会自动取消并退款。' },
    ],
  },
];

function MatrixDemo() {
  const cols = ['吧唧', '色纸', '立牌', '挂件'];
  const rows = [
    [PURPLE, PURPLE, PURPLE, PURPLE],
    [PURPLE, '#10B981', '#10B981', ''],
    ['#10B981', '', '', ''],
  ];
  return (
    <View style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        <View style={{ width: 32 }} />
        {cols.map((c) => (
          <View key={c} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '700' }}>{c}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', marginBottom: 4, alignItems: 'center' }}>
          <Text style={{ width: 32, fontSize: 10, color: '#9CA3AF', fontWeight: '700' }}>组{ri + 1}</Text>
          {row.map((color, ci) => (
            <View key={ci} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: color || '#F3F4F6',
                borderWidth: color ? 0 : 1, borderColor: '#E5E7EB', borderStyle: color ? 'solid' : 'dashed',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {color ? <Text style={{ fontSize: 9, color: '#FFF', fontWeight: '800' }}>
                  {['星', '七', '鹿', '柚', '棉', '澈', '夏', '初', '泡', '栗', '团', '桃'][(ri * 4 + ci) % 12]}
                </Text> : null}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function MatrixHelpPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* 顶栏 */}
      <View style={s.topBar}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
        </Pressable>
        <Text style={s.topTitle}>拼团矩阵说明</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* 顶部 Hero */}
        <View style={s.hero}>
          <Text style={{ fontSize: 40 }}>📊</Text>
          <Text style={s.heroTitle}>拼团矩阵</Text>
          <Text style={s.heroSub}>可视化拼团管理 · 一目了然</Text>
        </View>

        {SECTIONS.map((sec, idx) => (
          <View key={idx} style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={{ fontSize: 18 }}>{sec.icon}</Text>
              <Text style={s.sectionTitle}>{sec.title}</Text>
            </View>

            <Text style={s.body}>{sec.body}</Text>

            {sec.hasImage && (
              <View style={s.imgWrap}>
                <MatrixDemo />
                <Text style={s.imgCaption}>矩阵示意：横轴 SKU，纵轴组号</Text>
              </View>
            )}

            {sec.bullets && (
              <View style={s.bulletList}>
                {sec.bullets.map((b, i) => (
                  <View key={i} style={s.bulletItem}>
                    <View style={s.bulletDot} />
                    <Text style={s.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            )}

            {sec.statuses && (
              <View style={s.statusList}>
                {sec.statuses.map((st, i) => (
                  <View key={i} style={s.statusRow}>
                    <View style={[s.statusDot, { backgroundColor: st.color }]} />
                    <Text style={[s.statusLabel, { color: st.color }]}>{st.label}</Text>
                    <Text style={s.statusDesc}>{st.desc}</Text>
                  </View>
                ))}
              </View>
            )}

            {sec.features && (
              <View style={s.featureList}>
                {sec.features.map((f, i) => (
                  <View key={i} style={s.featureCard}>
                    <Text style={s.featureName}>{f.name}</Text>
                    <Text style={s.featureDesc}>{f.desc}</Text>
                  </View>
                ))}
              </View>
            )}

            {sec.qa && (
              <View style={s.qaList}>
                {sec.qa.map((item, i) => (
                  <View key={i} style={s.qaItem}>
                    <View style={s.qaQ}>
                      <Ionicons name="help-circle" size={14} color={PURPLE} />
                      <Text style={s.qaQText}>{item.q}</Text>
                    </View>
                    <Text style={s.qaA}>{item.a}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEEAF5',
  },
  topTitle: { fontSize: 16, fontWeight: '800', color: '#1E1B4B' },

  hero: {
    alignItems: 'center', paddingVertical: 24,
    backgroundColor: '#FFF', borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1, borderColor: '#EEEAF5',
  },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#1E1B4B', marginTop: 8 },
  heroSub: { fontSize: 13, color: '#9CA3AF', marginTop: 4, fontWeight: '600' },

  section: {
    backgroundColor: '#FFF', borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E1B4B' },

  body: { fontSize: 13, color: '#4B5563', lineHeight: 20 },

  imgWrap: {
    marginTop: 12, borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#F5F3FF',
  },
  imgCaption: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8, fontWeight: '600' },

  bulletList: { marginTop: 10, gap: 6 },
  bulletItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PURPLE, marginTop: 6 },
  bulletText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 19 },

  statusList: { marginTop: 10, gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 13, fontWeight: '700', width: 70 },
  statusDesc: { flex: 1, fontSize: 12, color: '#6B7280' },

  featureList: { marginTop: 10, gap: 8 },
  featureCard: {
    backgroundColor: '#F5F3FF', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#EDE9FE',
  },
  featureName: { fontSize: 14, fontWeight: '800', color: '#1E1B4B', marginBottom: 4 },
  featureDesc: { fontSize: 12, color: '#6B7280', lineHeight: 18 },

  qaList: { marginTop: 10, gap: 10 },
  qaItem: {
    backgroundColor: '#FAFAFE', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  qaQ: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  qaQText: { fontSize: 13, fontWeight: '700', color: '#1E1B4B', flex: 1 },
  qaA: { fontSize: 12, color: '#6B7280', lineHeight: 18, paddingLeft: 20 },
});
