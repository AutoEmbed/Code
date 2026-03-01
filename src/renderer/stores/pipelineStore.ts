import { create } from 'zustand';

export interface StageInfo {
  stage: number;
  stage_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  elapsed_ms: number;
  detail?: Record<string, any>;
}

interface PipelineStore {
  taskId: string | null;
  isRunning: boolean;
  stages: StageInfo[];
  currentStage: number;
  viewMode: 'simple' | 'detail';
  result: any | null;
  error: string | null;

  setTaskId: (id: string) => void;
  setIsRunning: (running: boolean) => void;
  updateStage: (update: StageInfo) => void;
  setResult: (result: any) => void;
  setError: (error: string) => void;
  toggleViewMode: () => void;
  reset: () => void;
}

const STAGE_NAMES = [
  'Library Discovery',
  'API Extraction',
  'Task Decomposition',
  'Semantic Matching',
  'Code Generation',
  'Compilation',
  'Upload',
  'Validation',
];

const initialStages: StageInfo[] = STAGE_NAMES.map((name, i) => ({
  stage: i,
  stage_name: name,
  status: 'pending' as const,
  progress: 0,
  message: '',
  elapsed_ms: 0,
}));

export const usePipelineStore = create<PipelineStore>((set) => ({
  taskId: null,
  isRunning: false,
  stages: [...initialStages],
  currentStage: -1,
  viewMode: 'simple',
  result: null,
  error: null,

  setTaskId: (taskId) => set({ taskId }),
  setIsRunning: (isRunning) => set({ isRunning }),
  updateStage: (update) =>
    set((state) => {
      const stages = [...state.stages];
      stages[update.stage] = { ...stages[update.stage], ...update };
      return {
        stages,
        currentStage:
          update.status === 'running' ? update.stage : state.currentStage,
      };
    }),
  setResult: (result) => set({ result, isRunning: false }),
  setError: (error) => set({ error, isRunning: false }),
  toggleViewMode: () =>
    set((state) => ({
      viewMode: state.viewMode === 'simple' ? 'detail' : 'simple',
    })),
  reset: () =>
    set({
      taskId: null,
      isRunning: false,
      stages: initialStages.map((s) => ({ ...s })),
      currentStage: -1,
      result: null,
      error: null,
    }),
}));
