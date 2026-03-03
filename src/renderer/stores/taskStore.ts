import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TaskTemplate {
  name: string;
  components: string[];
  taskDescription: string;
  boardFqbn: string;
  boardName: string;
  baudRate: number | null;
  codeOnly: boolean;
}

interface TaskStore {
  components: string[];
  taskDescription: string;
  pinConnections: Record<string, string>;
  boardName: string;
  boardFqbn: string;
  baudRate: number | null;
  codeOnly: boolean;
  setComponents: (components: string[]) => void;
  setTaskDescription: (desc: string) => void;
  setPinConnection: (component: string, pin: string) => void;
  setBoardName: (name: string) => void;
  setBoardFqbn: (fqbn: string) => void;
  setBaudRate: (rate: number | null) => void;
  setCodeOnly: (v: boolean) => void;
  reset: () => void;
  templates: TaskTemplate[];
  saveTemplate: (name: string) => void;
  deleteTemplate: (name: string) => void;
  loadTemplate: (template: TaskTemplate) => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      components: [],
      taskDescription: '',
      pinConnections: {},
      boardName: 'Arduino Uno',
      boardFqbn: 'arduino:avr:uno',
      baudRate: null,
      codeOnly: false,
      setComponents: (components) => set({ components }),
      setTaskDescription: (taskDescription) => set({ taskDescription }),
      setPinConnection: (component, pin) =>
        set((state) => ({
          pinConnections: { ...state.pinConnections, [component]: pin },
        })),
      setBoardName: (boardName) => set({ boardName }),
      setBoardFqbn: (boardFqbn) => set({ boardFqbn }),
      setBaudRate: (baudRate) => set({ baudRate }),
      setCodeOnly: (codeOnly) => set({ codeOnly }),
      reset: () =>
        set({
          components: [],
          taskDescription: '',
          pinConnections: {},
          boardName: 'Arduino Uno',
          boardFqbn: 'arduino:avr:uno',
          baudRate: null,
          codeOnly: false,
        }),
      templates: [],
      saveTemplate: (name) => {
        const state = get();
        const template: TaskTemplate = {
          name,
          components: state.components,
          taskDescription: state.taskDescription,
          boardFqbn: state.boardFqbn,
          boardName: state.boardName,
          baudRate: state.baudRate,
          codeOnly: state.codeOnly,
        };
        set((s) => ({
          templates: [...s.templates.filter((t) => t.name !== name), template],
        }));
      },
      deleteTemplate: (name) =>
        set((s) => ({ templates: s.templates.filter((t) => t.name !== name) })),
      loadTemplate: (template) =>
        set({
          components: template.components,
          taskDescription: template.taskDescription,
          boardFqbn: template.boardFqbn,
          boardName: template.boardName,
          baudRate: template.baudRate,
          codeOnly: template.codeOnly,
        }),
    }),
    {
      name: 'autoembed-task-templates',
      partialize: (state) => ({ templates: state.templates }),
    }
  )
);
