import { create } from 'zustand';

export interface HistoryItem {
  task_id: string;
  timestamp: string;
  task_description: string;
  components: string[];
  status: string;
  code_clean?: string;
  code_debug?: string;
}

interface HistoryStore {
  items: HistoryItem[];
  loading: boolean;
  selectedItem: HistoryItem | null;
  fetchHistory: (port?: number) => Promise<void>;
  selectItem: (item: HistoryItem | null) => void;
  deleteItem: (taskId: string, port?: number) => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  items: [],
  loading: false,
  selectedItem: null,

  fetchHistory: async (port = 8765) => {
    set({ loading: true });
    try {
      const res = await fetch(`http://localhost:${port}/api/history`);
      const data = await res.json();
      set({ items: Array.isArray(data) ? data : [], loading: false });
    } catch (err) {
      console.error('Failed to fetch history:', err);
      set({ loading: false });
    }
  },

  selectItem: (item) => set({ selectedItem: item }),

  deleteItem: async (taskId, port = 8765) => {
    try {
      await fetch(`http://localhost:${port}/api/history/${taskId}`, {
        method: 'DELETE',
      });
      // Clear selection if the deleted item was selected
      const { selectedItem } = get();
      if (selectedItem?.task_id === taskId) {
        set({ selectedItem: null });
      }
      await get().fetchHistory(port);
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  },
}));
