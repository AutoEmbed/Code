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
  error: string | null;
  selectedItem: HistoryItem | null;
  fetchHistory: (port?: number) => Promise<void>;
  selectItem: (item: HistoryItem | null) => void;
  deleteItem: (taskId: string, port?: number) => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  selectedItem: null,

  fetchHistory: async (port = 8765) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`http://localhost:${port}/api/history`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ items: Array.isArray(data) ? data : [], loading: false });
    } catch (err: any) {
      console.error('Failed to fetch history:', err);
      set({ loading: false, error: err.message ?? 'Failed to fetch history' });
    }
  },

  selectItem: (item) => set({ selectedItem: item }),

  deleteItem: async (taskId, port = 8765) => {
    try {
      const res = await fetch(`http://localhost:${port}/api/history/${taskId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Clear selection if the deleted item was selected
      const { selectedItem } = get();
      if (selectedItem?.task_id === taskId) {
        set({ selectedItem: null });
      }
      await get().fetchHistory(port);
    } catch (err: any) {
      console.error('Failed to delete history item:', err);
      throw err; // Re-throw so UI can handle it
    }
  },
}));
