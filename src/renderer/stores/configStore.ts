import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppConfig {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  arduinoCliPath: string;
  serialPort: string;
  boardFqbn: string;
  boardName: string;
  librariesDir: string;
}

interface ConfigStore {
  config: AppConfig;
  updateConfig: (partial: Partial<AppConfig>) => void;
  resetConfig: () => void;
}

const defaultConfig: AppConfig = {
  apiKey: '',
  apiBaseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  arduinoCliPath: '',
  serialPort: '',
  boardFqbn: 'arduino:avr:uno',
  boardName: 'Arduino Uno',
  librariesDir: '',
};

export { defaultConfig };

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      config: { ...defaultConfig },
      updateConfig: (partial) =>
        set((state) => ({ config: { ...state.config, ...partial } })),
      resetConfig: () => set({ config: { ...defaultConfig } }),
    }),
    { name: 'autoembed-config' }
  )
);
