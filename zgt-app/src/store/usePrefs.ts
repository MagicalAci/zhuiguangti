import { create } from 'zustand';

/**
 * 偏好分类 → 标签字典
 * V1 mock 数据，未来可由后台下发
 */
export type CategoryKey = 'acg' | 'kpop' | 'cpop' | 'western' | 'cp' | 'kids' | 'cotton';

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  tags: string[];
}

export const PREF_CATEGORIES: CategoryDef[] = [
  {
    key: 'acg',
    label: '二次元',
    emoji: '🎴',
    color: '#7C3AED',
    bg: '#F5F3FF',
    tags: ['恋与深空', '咒术回战', '原神', '崩坏：星穹铁道', '鬼灭之刃', '间谍过家家', '排球少年', '蓝锁', '进击的巨人', '海贼王', '火影忍者', '龙珠', '死神', '猎人', '灌篮高手', '名侦探柯南', '文豪野犬', '银魂'],
  },
  {
    key: 'kpop',
    label: '韩娱',
    emoji: '💜',
    color: '#F43F5E',
    bg: '#FFF1F2',
    tags: ['EXO', 'BLACKPINK', 'BTS', 'TXT', 'NCT', 'TWICE', 'SEVENTEEN', 'aespa', 'IVE', 'LE SSERAFIM', 'Stray Kids', 'ENHYPEN'],
  },
  {
    key: 'cpop',
    label: '内娱',
    emoji: '🎤',
    color: '#F59E0B',
    bg: '#FFFBEB',
    tags: ['周深', '蔡徐坤', '时代少年团', '王源', '王俊凯', '易烊千玺', 'INTO1', 'TF家族', '硬糖少女', 'R1SE'],
  },
  {
    key: 'western',
    label: '欧美',
    emoji: '🌎',
    color: '#3B82F6',
    bg: '#EFF6FF',
    tags: ['Taylor Swift', 'Harry Styles', 'Olivia Rodrigo', 'Billie Eilish', 'Marvel', 'DC', 'Harry Potter', 'Disney'],
  },
  {
    key: 'cp',
    label: '同人CP',
    emoji: '💕',
    color: '#EC4899',
    bg: '#FDF2F8',
    tags: ['同人本', '同人周边', 'BL', 'GL', '乙女向', '原创CP', '二创', '同人志'],
  },
  {
    key: 'kids',
    label: '少儿',
    emoji: '🌟',
    color: '#10B981',
    bg: '#ECFDF5',
    tags: ['奥特曼', '宝可梦', '精灵宝可梦', '假面骑士', '小马宝莉', '汪汪队', '超级飞侠', '小猪佩奇'],
  },
  {
    key: 'cotton',
    label: '棉花娃娃',
    emoji: '🧸',
    color: '#A855F7',
    bg: '#FAF5FF',
    tags: ['棉花娃娃', '娃衣', '娃包', '娃配', '20cm棉花', '15cm棉花', '10cm棉花', '换装'],
  },
];

export interface CredImage {
  id: string;
  label: string;        // 凭证简介，如「2024 春拼车凭证」
  type: '下单证明' | '官店截图' | '粉籍证明' | '拿货凭证' | '其他';
}

interface PrefsState {
  /** 是否已完成首次偏好设置 */
  prefsDone: boolean;
  /** 用户选中的若干个子标签 */
  selectedTags: string[];
  /** 用户选中标签所属的分类 key（用于过滤展示） */
  selectedCategoryKeys: CategoryKey[];

  /** 团长「我的-信誉凭证」沉淀 */
  leaderCredImages: CredImage[];
  leaderCredDesc: string;

  setPrefs: (tags: string[], categories: CategoryKey[]) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  resetPrefs: () => void;

  setLeaderCredDesc: (s: string) => void;
  addLeaderCred: (c: Omit<CredImage, 'id'>) => void;
  removeLeaderCred: (id: string) => void;
}

export const usePrefs = create<PrefsState>((set, get) => ({
  prefsDone: false,
  selectedTags: [],
  selectedCategoryKeys: [],

  leaderCredImages: [
    { id: 'c1', label: '2024 春 · 偶像梦幻祭拼车凭证', type: '下单证明' },
    { id: 'c2', label: '官方店铺粉籍认证截图',         type: '粉籍证明' },
  ],
  leaderCredDesc: '本人为 偶像梦幻祭 / 偶像大师 粉籍 3 年 · 已经营拼车 23 次，0 跑单 · 长期与日亚 / 官店合作',

  setPrefs: (tags, categories) =>
    set({
      prefsDone: true,
      selectedTags: tags,
      selectedCategoryKeys: categories,
    }),
  addTag: (tag) => {
    const cur = get().selectedTags;
    if (cur.includes(tag)) return;
    set({ selectedTags: [...cur, tag] });
  },
  removeTag: (tag) => set({ selectedTags: get().selectedTags.filter((t) => t !== tag) }),
  resetPrefs: () => set({ prefsDone: false, selectedTags: [], selectedCategoryKeys: [] }),

  setLeaderCredDesc: (s) => set({ leaderCredDesc: s }),
  addLeaderCred: (c) =>
    set((st) => ({
      leaderCredImages: [...st.leaderCredImages, { ...c, id: `c_${Date.now()}` }],
    })),
  removeLeaderCred: (id) =>
    set((st) => ({ leaderCredImages: st.leaderCredImages.filter((x) => x.id !== id) })),
}));
