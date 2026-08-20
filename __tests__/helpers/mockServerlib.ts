import path from 'path'
import http from 'http'

let httpServer: http.Server
const MOCK_SERVER_DIR = path.join(process.cwd(), 'mock-server')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExpressServer = require(path.join(MOCK_SERVER_DIR, 'expressServer'))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Service = require(path.join(MOCK_SERVER_DIR, 'services', 'Service'))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DrinkingFountainsService = require(
  path.join(MOCK_SERVER_DIR, 'services', 'DrinkingFountainsService')
)

class MockServer {
  constructor(private port: number) {}

  async listen(): Promise<void> {
    const server = new ExpressServer(this.port, path.join(MOCK_SERVER_DIR, 'api/openapi.yaml'))
    // Reproduce launch()'s two side effects ourselves so we can keep a handle on
    // the underlying http.Server to close it afterwards — the generated
    // launch()/close() pair never actually stores that reference.
    server.app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || 500).json({message: err.message || err, errors: err.errors || ''})
    })

    httpServer = http.createServer(server.app)

    return new Promise((resolve) => httpServer.listen(this.port, () => resolve(undefined)))
  }
  getUrl(): string {
    return `http://localhost:${this.port}`
  }
  async close(): Promise<void> {
    return new Promise((resolve) => httpServer.close(() => resolve(undefined)))
  }
}

export {ExpressServer, Service, DrinkingFountainsService, MockServer}
