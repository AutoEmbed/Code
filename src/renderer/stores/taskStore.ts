import { create } from 'zustand';

interface TaskStore {
  components: string[];
  taskDescription: string;
  pinConnections: Record<string, string>;
  boardName: string;
  boardFqbn: string;
  baudRate: number | null;
  setComponents: (components: string[]) => void;
  setTaskDescription: (desc: string) => void;
  setPinConnection: (component: string, pin: string) => void;
  setBoardName: (name: string) => void;
  setBoardFqbn: (fqbn: string) => void;
  setBaudRate: (rate: number | null) => void;
  reset: () => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  components: [],
  taskDescription: '',
  pinConnections: {},
  boardName: 'Arduino Uno',
  boardFqbn: 'arduino:avr:uno',
  baudRate: null,
  setComponents: (components) => set({ components }),
  setTaskDescription: (taskDescription) => set({ taskDescription }),
  setPinConnection: (component, pin) =>
    set((state) => ({
      pinConnections: { ...state.pinConnections, [component]: pin },
    })),
  setBoardName: (boardName) => set({ boardName }),
  setBoardFqbn: (boardFqbn) => set({ boardFqbn }),
  setBaudRate: (baudRate) => set({ baudRate }),
  reset: () =>
    set({
      components: [],
      taskDescription: '',
      pinConnections: {},
      boardName: 'Arduino Uno',
      boardFqbn: 'arduino:avr:uno',
      baudRate: null,
    }),
}));
