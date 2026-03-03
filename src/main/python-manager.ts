import { spawn, ChildProcess, execFile } from 'child_process'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import http from 'http'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export class PythonManager {
  private process: ChildProcess | null = null
  private port: number = 8765
  private isReady: boolean = false

  getPort(): number {
    return this.port
  }

  async start(): Promise<number> {
    const pythonPath = await this.getPythonPath()
    const scriptPath = this.getScriptPath()

    console.log(`Starting Python backend: ${pythonPath} ${scriptPath} --port ${this.port}`)

    const projectRoot = app.isPackaged ? process.resourcesPath : app.getAppPath()

    this.process = spawn(pythonPath, ['-m', 'backend.main_api', '--port', String(this.port)], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: projectRoot,
      env: { ...process.env }
    })

    let stderrOutput = ''

    this.process.stdout?.on('data', (data: Buffer) => {
      console.log(`[Python] ${data.toString().trim()}`)
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      console.error(`[Python] ${text.trim()}`)
      stderrOutput += text
    })

    // Detect early crash
    const earlyExit = new Promise<never>((_, reject) => {
      this.process!.on('error', (err: Error) => {
        console.error(`Python process error: ${err.message}`)
        reject(new Error(`Python process failed to start: ${err.message}`))
      })
      this.process!.on('exit', (code: number | null) => {
        console.log(`Python process exited with code ${code}`)
        this.isReady = false
        if (!this.isReady) {
          const hint = stderrOutput.includes('ModuleNotFoundError')
            ? '\n\nMissing Python dependencies. Run:\npip install -r backend/requirements.txt'
            : ''
          reject(new Error(
            `Python backend exited with code ${code}${hint}\n\n${stderrOutput.slice(-500)}`
          ))
        }
      })
    })

    // Race: health check vs early crash
    await Promise.race([this.waitForHealth(), earlyExit])
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

  private async getPythonPath(): Promise<string> {
    if (app.isPackaged) {
      const pythonEnv = path.join(process.resourcesPath, 'python-env')
      const candidate = process.platform === 'win32'
        ? path.join(pythonEnv, 'python.exe')
        : path.join(pythonEnv, 'bin', 'python')
      if (fs.existsSync(candidate)) {
        await this.ensureDependencies(candidate, pythonEnv)
        return candidate
      }
      console.warn('Bundled python-env not found, searching system Python...')
    }
    return this.findSystemPython()
  }

  private async ensureDependencies(pythonPath: string, pythonEnv: string): Promise<void> {
    // Check if pip is bootstrapped by looking for pip in Lib/site-packages
    const sitePackages = path.join(pythonEnv, 'Lib', 'site-packages')
    const pipDir = path.join(sitePackages, 'pip')

    if (!fs.existsSync(pipDir)) {
      // Bootstrap pip using get-pip.py
      const getPipPath = path.join(pythonEnv, 'get-pip.py')
      if (fs.existsSync(getPipPath)) {
        console.log('Bootstrapping pip for bundled Python...')
        try {
          await execFileAsync(pythonPath, [getPipPath, '--no-warn-script-location'], {
            timeout: 120000,
          })
          console.log('pip bootstrapped successfully')
        } catch (e: any) {
          console.error('Failed to bootstrap pip:', e.message)
          return
        }
      }
    }

    // Check if key dependencies are installed
    const fastapiDir = path.join(sitePackages, 'fastapi')
    const openaiDir = path.join(sitePackages, 'openai')
    if (!fs.existsSync(fastapiDir) || !fs.existsSync(openaiDir)) {
      const reqPath = path.join(process.resourcesPath, 'backend', 'requirements.txt')
      if (fs.existsSync(reqPath)) {
        const missing = [
          !fs.existsSync(fastapiDir) && 'fastapi',
          !fs.existsSync(openaiDir) && 'openai',
        ].filter(Boolean).join(', ')
        console.log(`Installing Python dependencies (missing: ${missing})...`)
        try {
          await execFileAsync(pythonPath, [
            '-m', 'pip', 'install', '-r', reqPath,
            '--no-warn-script-location', '--quiet',
          ], { timeout: 300000 })
          console.log('Dependencies installed successfully')
        } catch (e: any) {
          console.error('Failed to install dependencies:', e.message)
        }
      }
    }
  }

  private getScriptPath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'backend', 'main_api.py')
    }
    // In dev: relative to project root
    return path.join(app.getAppPath(), 'backend', 'main_api.py')
  }

  private async findSystemPython(): Promise<string> {
    const candidates = process.platform === 'win32'
      ? ['python', 'python3', 'py']
      : ['python3', 'python']

    for (const cmd of candidates) {
      try {
        await execFileAsync(cmd, ['--version'])
        console.log(`Found system Python: ${cmd}`)
        return cmd
      } catch {
        continue
      }
    }
    throw new Error(
      'Python not found. Please install Python 3.10+ and add it to PATH.\n' +
      'Download: https://www.python.org/downloads/'
    )
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
