import {spawn, ChildProcess} from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'

const MOCK_SERVER_DIR = path.join(__dirname, '..', 'mock-server')
const PID_FILE = path.join(__dirname, '..', 'mock-server', '.e2e-mock-server.pid')
const HEALTH_URL = 'http://127.0.0.1:3000/api/health'
const READY_URL = 'http://127.0.0.1:3000/api/city-districts'

function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume()
        resolve()
      })
      req.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error(`E2E mock server did not become reachable within ${timeoutMs}ms`))
          return
        }
        setTimeout(attempt, 300)
      })
    }
    attempt()
  })
}

/**
 * Starts the OpenAPI-generated mock server (mock-server/) so authenticated
 * and fixture-dependent Detox scenarios don't need a real backend — see
 * mock-server/fixtures.js for the seeded test user/signal/districts.
 */
export async function startMockServer(): Promise<void> {
  const child: ChildProcess = spawn('node', ['index.js'], {
    cwd: MOCK_SERVER_DIR,
    detached: true,
    stdio: 'ignore',
  })
  child.unref()

  if (typeof child.pid === 'number') {
    fs.writeFileSync(PID_FILE, String(child.pid))
  }

  // /api/city-districts isn't a real readiness probe (the health endpoint
  // isn't defined in this generated server's OpenAPI spec, unlike the real
  // backend's), but any route the validator recognizes proves the HTTP
  // server is actually accepting connections.
  await waitForServer(READY_URL, 30000).catch(() => waitForServer(HEALTH_URL, 5000))
}

export function stopMockServer(): void {
  if (!fs.existsSync(PID_FILE)) return
  const pid = Number(fs.readFileSync(PID_FILE, 'utf8'))
  fs.unlinkSync(PID_FILE)
  if (!Number.isFinite(pid)) return
  try {
    process.kill(-pid) // negative pid: kill the whole detached process group
  } catch {
    // already gone
  }
}
