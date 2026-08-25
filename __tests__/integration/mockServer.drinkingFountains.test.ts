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

import {environmentManager} from '../../lib/environment'
import {fetchDrinkingFountains} from '../../lib/payload'
import {Service, DrinkingFountainsService, MockServer} from '../helpers/mockServerlib'
import {addFetchShim, removeFetchShim} from '../helpers/fetchShim'

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

const server = new MockServer(4123)

describe('fetchDrinkingFountains against the generated OpenAPI mock server', () => {
  beforeAll(async () => {
    // The generator's default stub just echoes request params back — replace it
    // with realistic, schema-shaped data for this suite.
    DrinkingFountainsService.listDrinkingFountains = () =>
      Promise.resolve(Service.successResponse({docs: FIXTURE_DOCS}))

    jest.spyOn(environmentManager, 'getApiUrl').mockReturnValue(server.getUrl())
    addFetchShim()

    await server.listen()
  })

  afterAll(async () => {
    await server.close()

    jest.restoreAllMocks()
    removeFetchShim()
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
