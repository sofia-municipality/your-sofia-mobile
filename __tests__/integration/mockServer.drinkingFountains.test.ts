/**
 * Integration test against the real OpenAPI-generated mock server.
 *
 * Regenerate the server from the spec with `pnpm run generate:mock` (it's
 * gitignored — see api.yaml / package.json for the pipeline). This suite
 * boots the generated Express app unmodified, only swapping the one
 * endpoint's stub handler for schema-shaped fixture data via the
 * generator's own `Service.successResponse()` helper, then drives it
 * through the real `fetchDrinkingFountains()` client code — exercising the
 * full HTTP round trip instead of mocking `fetch` directly.
 */
import path from 'path'
import http from 'http'
import {environmentManager} from '../../lib/environment'
import {fetchDrinkingFountains} from '../../lib/payload'

const MOCK_SERVER_DIR = path.join(__dirname, '../../mock-server')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExpressServer = require('../../mock-server/expressServer')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Service = require('../../mock-server/services/Service')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DrinkingFountainsService = require('../../mock-server/services/DrinkingFountainsService')

const PORT = 4123

const FIXTURE_DOCS = [
  {
    id: 1,
    publicNumber: 'DF-RTR-0001',
    address: 'ул. Раковски 1',
    location: [23.3238, 42.6953],
    isActive: true,
    protectionStatus: null,
    externalLink: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

let httpServer: http.Server
let originalFetch: typeof fetch

interface ShimResponse {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<any>
  text: () => Promise<string>
}

// jest-expo's test environment stubs out React Native's fetch (there's no native
// bridge in a Jest process, so it never touches the network) — real Node fetch
// isn't reachable from inside the test either, since jest-expo's setup replaces
// the global before this file runs. This is a plain Node `http` shim that's just
// enough to exercise a real HTTP round trip against the mock server.
function nodeFetchShim(url: string): Promise<ShimResponse> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          const status = res.statusCode ?? 0
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: res.statusMessage ?? '',
            json: async () => JSON.parse(data),
            text: async () => data,
          })
        })
      })
      .on('error', reject)
  })
}

describe('fetchDrinkingFountains against the generated OpenAPI mock server', () => {
  beforeAll(async () => {
    // The generator's default stub just echoes request params back — replace it
    // with realistic, schema-shaped data for this suite.
    DrinkingFountainsService.listDrinkingFountains = () =>
      Promise.resolve(Service.successResponse({docs: FIXTURE_DOCS}))

    const server = new ExpressServer(PORT, path.join(MOCK_SERVER_DIR, 'api/openapi.yaml'))
    // Reproduce launch()'s two side effects ourselves so we can keep a handle on
    // the underlying http.Server to close it afterwards — the generated
    // launch()/close() pair never actually stores that reference.
    server.app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || 500).json({message: err.message || err, errors: err.errors || ''})
    })
    httpServer = http.createServer(server.app).listen(PORT)

    jest.spyOn(environmentManager, 'getApiUrl').mockReturnValue(`http://localhost:${PORT}`)
    originalFetch = globalThis.fetch
    globalThis.fetch = nodeFetchShim as unknown as typeof fetch
  })

  afterAll(async () => {
    jest.restoreAllMocks()
    globalThis.fetch = originalFetch
    await new Promise((resolve) => httpServer.close(() => resolve(undefined)))
  })

  it('fetches and flattens the fountain docs returned by the mock endpoint', async () => {
    const fountains = await fetchDrinkingFountains()

    expect(fountains).toHaveLength(1)
    expect(fountains[0]).toMatchObject({
      id: 1,
      publicNumber: 'DF-RTR-0001',
      address: 'ул. Раковски 1',
      latitude: 42.6953,
      longitude: 23.3238,
      isActive: true,
    })
  })
})
