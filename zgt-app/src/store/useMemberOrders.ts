import { create } from 'zustand';

/**
 * 团员当前会话内"已下单"的拼团集合（前端 mock）
 * 用于在「拼团情况」矩阵中把团员头像填进第一辆车的第一个空位
 */
interface MemberOrdersState {
  /** 已下单拼团 groupId -> 下单件数（用于决定占位数） */
  placed: Record<string, number>;
  /** 标记某团已下单（增量） */
  markPlaced: (groupId: string, qty: number) => void;
  /** 清空某团（撤单等场景） */
  clearPlaced: (groupId: string) => void;
}

export const useMemberOrders = create<MemberOrdersState>((set, get) => ({
  placed: {},
  markPlaced: (groupId, qty) => {
    const cur = get().placed[groupId] ?? 0;
    set({ placed: { ...get().placed, [groupId]: cur + qty } });
  },
  clearPlaced: (groupId) => {
    const next = { ...get().placed };
    delete next[groupId];
    set({ placed: next });
  },
}));
