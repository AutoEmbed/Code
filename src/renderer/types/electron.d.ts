interface ElectronAPI {
  selectFile: () => Promise<string | null>
  selectDirectory: () => Promise<string | null>
  saveFile: (content: string, defaultName: string) => Promise<boolean>
  getBackendPort: () => Promise<number>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
