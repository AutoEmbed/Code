import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs'

export function registerIpcHandlers(): void {
  // Select a file (for Arduino CLI path)
  ipcMain.handle('select-file', async (_event) => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return null
    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Select a directory (for libraries dir)
  ipcMain.handle('select-directory', async (_event) => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return null
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Save a file (for downloading .ino)
  ipcMain.handle('save-file', async (_event, content: string, defaultName: string) => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return false
    const result = await dialog.showSaveDialog(window, {
      defaultPath: defaultName,
      filters: [
        { name: 'Arduino Sketch', extensions: ['ino'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (result.canceled || !result.filePath) return false
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return true
  })

  // Get backend port
  let backendPort = 8765
  ipcMain.handle('get-backend-port', () => backendPort)

  // Allow setting the port from main process
  ipcMain.handle('set-backend-port', (_event, port: number) => {
    backendPort = port
  })
}
