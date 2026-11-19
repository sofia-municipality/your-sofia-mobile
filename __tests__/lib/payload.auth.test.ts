import * as payload from '../../lib/payload'

jest.mock('../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

const fetchMock = jest.fn()
const onAuthError = jest.fn()

function errorResponse(status: number, statusText: string) {
  return {
    ok: false,
    status,
    statusText,
    json: async () => ({}),
    text: async () => '',
  }
}

const okResponse = {
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({docs: []}),
  text: async () => '',
}

beforeEach(() => {
  fetchMock.mockReset()
  onAuthError.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
  payload.setAuthErrorHandler(onAuthError)
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

const container = {
  publicNumber: 'WC-1',
  wasteType: 'general' as const,
  capacityVolume: 1.1,
  capacitySize: 'standard' as const,
  location: {latitude: 42.69, longitude: 23.32},
}

const callsThatLogOut: [string, () => Promise<unknown>][] = [
  ['fetchNews', () => payload.fetchNews()],
  ['fetchNewsById', () => payload.fetchNewsById('1')],
  ['fetchContainersWithSignals', () => payload.fetchContainersWithSignals()],
  ['fetchDrinkingFountains', () => payload.fetchDrinkingFountains()],
  [
    'createDrinkingFountain',
    () =>
      payload.createDrinkingFountain(
        {address: 'a', isActive: true, location: {latitude: 1, longitude: 2}},
        'jwt'
      ),
  ],
  ['fetchWasteContainers', () => payload.fetchWasteContainers()],
  [
    'fetchNearbyWasteContainers',
    () => payload.fetchNearbyWasteContainers({latitude: 1, longitude: 2}),
  ],
  ['fetchWasteContainerById', () => payload.fetchWasteContainerById('1')],
  ['cleanContainer', () => payload.cleanContainer('1', 'jwt')],
  ['fetchSignals', () => payload.fetchSignals()],
  ['fetchSignalById', () => payload.fetchSignalById('1')],
  ['updateSignal', () => payload.updateSignal('1', {title: 'x'}, 'jwt')],
  ['createWasteContainer', () => payload.createWasteContainer(container, 'jwt')],
  ['updateWasteContainer', () => payload.updateWasteContainer('1', container, 'jwt')],
  ['fetchAssignments', () => payload.fetchAssignments()],
  ['fetchAssignmentById', () => payload.fetchAssignmentById('1')],
  [
    'createAssignment',
    () =>
      payload.createAssignment(
        {title: 't', containers: ['1'], assignedTo: 1, activities: ['full']},
        'jwt'
      ),
  ],
  ['updateAssignment', () => payload.updateAssignment('1', {title: 't'}, 'jwt')],
  ['updateSubscription (JWT)', () => payload.updateSubscription(1, {enabled: true}, 'jwt')],
  ['fetchMissionProfileMe', () => payload.fetchMissionProfileMe('jwt')],
  [
    'createMission',
    () =>
      payload.createMission(
        {
          signal: '1',
          title: 't',
          level: 'good-first-mission',
          status: 'open',
          pointsReward: 10,
          generalInstructions: 'g',
          tasks: [],
        },
        'jwt'
      ),
  ],
  ['fetchMissionsFeed', () => payload.fetchMissionsFeed('jwt')],
  ['fetchMissionById', () => payload.fetchMissionById('1', 'jwt')],
  ['claimMission', () => payload.claimMission('1', 'jwt')],
  ['submitMissionTask', () => payload.submitMissionTask('1', 't1', {}, 'jwt')],
  ['submitMissionOverallPhotos', () => payload.submitMissionOverallPhotos('1', {}, 'jwt')],
  ['submitMissionForReview', () => payload.submitMissionForReview('1', 'jwt')],
  ['fetchVerifiableMissions', () => payload.fetchVerifiableMissions('jwt')],
  [
    'submitMissionVerification',
    () => payload.submitMissionVerification('1', 'approve', undefined, 'jwt'),
  ],
]

describe('setAuthErrorHandler', () => {
  it.each(callsThatLogOut)('triggers the handler when %s gets a 401', async (_name, call) => {
    fetchMock.mockResolvedValue(errorResponse(401, 'Unauthorized'))

    await expect(call()).rejects.toThrow()

    expect(onAuthError).toHaveBeenCalledTimes(1)
  })

  it.each([400, 403, 404, 500])('does not trigger the handler on a %d', async (status) => {
    fetchMock.mockResolvedValue(errorResponse(status, 'Nope'))

    await expect(payload.fetchSignals()).rejects.toThrow('Failed to fetch signals: Nope')

    expect(onAuthError).not.toHaveBeenCalled()
  })

  it('does not trigger the handler on success', async () => {
    fetchMock.mockResolvedValue(okResponse)

    await payload.fetchSignals()

    expect(onAuthError).not.toHaveBeenCalled()
  })

  it('uses the most recently registered handler', async () => {
    const replacement = jest.fn()
    payload.setAuthErrorHandler(replacement)
    fetchMock.mockResolvedValue(errorResponse(401, 'Unauthorized'))

    await expect(payload.fetchSignals()).rejects.toThrow()

    expect(replacement).toHaveBeenCalledTimes(1)
    expect(onAuthError).not.toHaveBeenCalled()
  })

  it('still throws the request error when no handler is registered', async () => {
    fetchMock.mockResolvedValue(errorResponse(401, 'Unauthorized'))

    let fresh!: typeof payload
    jest.isolateModules(() => {
      fresh = require('../../lib/payload')
    })

    await expect(fresh.fetchSignals()).rejects.toThrow('Failed to fetch signals: Unauthorized')
    expect(onAuthError).not.toHaveBeenCalled()
  })
})
