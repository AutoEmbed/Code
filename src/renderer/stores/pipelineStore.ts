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
  editedCode: { debug: string; clean: string } | null;

  setTaskId: (id: string) => void;
  setIsRunning: (running: boolean) => void;
  initStages: (totalStages: number) => void;
  updateStage: (update: StageInfo) => void;
  setResult: (result: any) => void;
  setError: (error: string) => void;
  toggleViewMode: () => void;
  loadResult: (result: any) => void;
  setEditedCode: (tab: 'debug' | 'clean', code: string) => void;
  clearEditedCode: () => void;
  reset: () => void;
}

const ALL_STAGE_NAMES = [
  'Library Discovery',
  'API Extraction',
  'Task Decomposition',
  'Semantic Matching',
  'Code Generation',
  'Compilation',
  'Upload',
  'Validation',
];

function buildStages(count: number): StageInfo[] {
  return ALL_STAGE_NAMES.slice(0, count).map((name, i) => ({
    stage: i,
    stage_name: name,
    status: 'pending' as const,
    progress: 0,
    message: '',
    elapsed_ms: 0,
  }));
}

const initialStages: StageInfo[] = buildStages(8);

export const usePipelineStore = create<PipelineStore>((set) => ({
  taskId: null,
  isRunning: false,
  stages: [...initialStages],
  currentStage: -1,
  viewMode: 'simple',
  result: null,
  error: null,
  editedCode: null,

  setTaskId: (taskId) => set({ taskId }),
  setIsRunning: (isRunning) => set({ isRunning }),
  initStages: (totalStages) =>
    set({ stages: buildStages(totalStages), currentStage: -1, error: null, result: null, editedCode: null }),
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
  loadResult: (result) => set({ result, isRunning: false, error: null }),
  toggleViewMode: () =>
    set((state) => ({
      viewMode: state.viewMode === 'simple' ? 'detail' : 'simple',
    })),
  setEditedCode: (tab, code) =>
    set((state) => ({
      editedCode: {
        ...(state.editedCode ?? {
          debug: state.result?.code_debug ?? '',
          clean: state.result?.code_clean ?? '',
        }),
        [tab]: code,
      },
    })),
  clearEditedCode: () => set({ editedCode: null }),
  reset: () =>
    set({
      taskId: null,
      isRunning: false,
      stages: initialStages.map((s) => ({ ...s })),
      currentStage: -1,
      result: null,
      error: null,
      editedCode: null,
    }),
}));
