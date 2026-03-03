import { create } from 'zustand';

export type PageKey = 'task-config' | 'pipeline' | 'code-view' | 'history' | 'settings';

interface NavigationStore {
  currentPage: PageKey;
  navigate: (page: PageKey) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  currentPage: 'task-config',
  navigate: (page) => set({ currentPage: page }),
}));
