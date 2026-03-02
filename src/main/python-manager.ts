import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { app } from 'electron'
import http from 'http'

export class PythonManager {
  private process: ChildProcess | null = null
  private port: number = 8765
  private isReady: boolean = false

  getPort(): number {
    return this.port
  }

  async start(): Promise<number> {
    const pythonPath = this.getPythonPath()
    const scriptPath = this.getScriptPath()

    console.log(`Starting Python backend: ${pythonPath} ${scriptPath} --port ${this.port}`)

    const projectRoot = app.isPackaged ? process.resourcesPath : app.getAppPath()

    this.process = spawn(pythonPath, ['-m', 'backend.main_api', '--port', String(this.port)], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: projectRoot,
      env: { ...process.env }
    })

    this.process.stdout?.on('data', (data: Buffer) => {
      console.log(`[Python] ${data.toString().trim()}`)
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      console.error(`[Python] ${data.toString().trim()}`)
    })

    this.process.on('error', (err: Error) => {
      console.error(`Python process error: ${err.message}`)
    })

    this.process.on('exit', (code: number | null) => {
      console.log(`Python process exited with code ${code}`)
      this.isReady = false
    })

    await this.waitForHealth()
    this.isReady = true
    console.log(`Python backend ready on port ${this.port}`)
    return this.port
  }

  async stop(): Promise<void> {
    if (this.process) {
      console.log('Stopping Python backend...')
      this.process.kill('SIGTERM')
      // Wait briefly for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 1000))
      if (this.process && !this.process.killed) {
        this.process.kill('SIGKILL')
      }
      this.process = null
      this.isReady = false
    }
  }

  private getPythonPath(): string {
    if (app.isPackaged) {
      // In production: use bundled Python environment
      const platform = process.platform
      const pythonEnv = path.join(process.resourcesPath, 'python-env')
      return platform === 'win32'
        ? path.join(pythonEnv, 'python.exe')
        : path.join(pythonEnv, 'bin', 'python')
    }
    // In dev: use system python
    return 'python3'
  }

  private getScriptPath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'backend', 'main_api.py')
    }
    // In dev: relative to project root
    return path.join(app.getAppPath(), 'backend', 'main_api.py')
  }

  private waitForHealth(timeout: number = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      const check = (): void => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Python backend health check timeout'))
          return
        }

        const req = http.get(`http://127.0.0.1:${this.port}/health`, (res) => {
          if (res.statusCode === 200) {
            resolve()
          } else {
            setTimeout(check, 500)
          }
        })

        req.on('error', () => {
          setTimeout(check, 500)
        })

        req.setTimeout(2000, () => {
          req.destroy()
          setTimeout(check, 500)
        })
      }

      // Start checking after a brief delay to let the server initialize
      setTimeout(check, 1000)
    })
  }
}
