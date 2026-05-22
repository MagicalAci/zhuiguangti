import { create } from 'zustand';

export type UserRole = 'leader' | 'member';

interface RoleState {
  role: UserRole;
  switchRole: (r: UserRole) => void;
  toggleRole: () => void;
}

export const useRole = create<RoleState>((set, get) => ({
  role: 'member',
  switchRole: (role) => set({ role }),
  toggleRole: () => set({ role: get().role === 'leader' ? 'member' : 'leader' }),
}));
