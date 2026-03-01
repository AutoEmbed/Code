import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Placeholder for future IPC APIs
  ping: (): Promise<string> => ipcRenderer.invoke('ping')
}

// Electron IPC APIs for file dialogs and backend communication
const electronIpcAPI = {
  selectFile: (): Promise<string | null> => ipcRenderer.invoke('select-file'),
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('select-directory'),
  saveFile: (content: string, defaultName: string): Promise<boolean> =>
    ipcRenderer.invoke('save-file', content, defaultName),
  getBackendPort: (): Promise<number> => ipcRenderer.invoke('get-backend-port')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('electronAPI', electronIpcAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.electronAPI = electronIpcAPI
}
