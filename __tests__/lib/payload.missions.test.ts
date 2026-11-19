import {
  claimMission,
  createMission,
  fetchMissionById,
  fetchMissionProfileMe,
  fetchMissionsFeed,
  fetchVerifiableMissions,
  submitMissionForReview,
  submitMissionOverallPhotos,
  submitMissionTask,
  submitMissionVerification,
  type CreateMissionInput,
} from '../../lib/payload'

jest.mock('../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

const API = 'https://api.test'
const fetchMock = jest.fn()

function jsonResponse(body: unknown) {
  return {ok: true, status: 200, statusText: 'OK', json: async () => body}
}

function errorResponse(status: number, statusText: string, body?: unknown) {
  return {
    ok: false,
    status,
    statusText,
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input')
      return body
    },
  }
}

function requestAt(index = 0) {
  const [url, init] = fetchMock.mock.calls[index]
  return {url: new URL(url as string), init: (init ?? {}) as RequestInit}
}

function bodyAt(index = 0) {
  return JSON.parse(requestAt(index).init.body as string)
}

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  jest.restoreAllMocks()
})

/** A mission as Payload stores it, with relative media URLs. */
const storedMission = {
  id: 'm1',
  title: 'Clean the park bench',
  status: 'in_progress',
  level: 'good-first-mission',
  pointsReward: 20,
  pointsAwarded: null,
  generalInstructions: 'Bring gloves',
  inspectorReviewNotes: 'Retake the after photo',
  citizen: {id: 7, name: 'Citizen'},
  signal: {id: 3, title: 'Dirty bench', location: [23.32, 42.69]},
  tasks: [
    {
      id: 't1',
      title: 'Before',
      beforePhoto: {id: 1, url: '/media/before.jpg'},
      afterPhoto: {id: 2, url: '/media/after.jpg'},
    },
    {id: 't2', title: 'Pending', beforePhoto: null},
  ],
  missionBeforePhotos: [{id: 5, url: '/media/overall-before.jpg'}],
  missionAfterPhotos: [{id: 6, url: '/media/overall-after.jpg'}],
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
}

/** The same mission after the client makes its media URLs absolute. */
const clientMission = {
  ...storedMission,
  tasks: [
    {
      id: 't1',
      title: 'Before',
      beforePhoto: {id: 1, url: `${API}/media/before.jpg`},
      afterPhoto: {id: 2, url: `${API}/media/after.jpg`},
    },
    {id: 't2', title: 'Pending', beforePhoto: null, afterPhoto: undefined},
  ],
  missionBeforePhotos: [{id: 5, url: `${API}/media/overall-before.jpg`}],
  missionAfterPhotos: [{id: 6, url: `${API}/media/overall-after.jpg`}],
}

const photo = (name: string) => ({uri: `file:///${name}`, type: 'image/jpeg', name})

describe('fetchMissionProfileMe', () => {
  it('loads the signed-in user’s profile', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({darPoints: 120, contributorLevel: 'guardian'}))

    await expect(fetchMissionProfileMe('jwt')).resolves.toEqual({
      darPoints: 120,
      contributorLevel: 'guardian',
    })

    const {url, init} = requestAt()
    expect(url.href).toBe(`${API}/api/mission-profiles/me`)
    expect(init.headers).toEqual({Authorization: 'JWT jwt'})
  })

  it.each([
    [{}, {darPoints: 0, contributorLevel: 'beginner'}],
    [
      {darPoints: '50', contributorLevel: 'admin'},
      {darPoints: 0, contributorLevel: 'beginner'},
    ],
    [
      {darPoints: 0, contributorLevel: 'contributor'},
      {darPoints: 0, contributorLevel: 'contributor'},
    ],
  ])('normalises %j', async (body, profile) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(body))

    await expect(fetchMissionProfileMe('jwt')).resolves.toEqual(profile)
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(fetchMissionProfileMe('jwt')).rejects.toThrow(
      'Failed to fetch mission profile: Internal Server Error'
    )
  })
})

describe('createMission', () => {
  const input: CreateMissionInput = {
    signal: '3',
    title: 'Clean the park bench',
    level: 'good-first-mission',
    status: 'open',
    pointsReward: 20,
    generalInstructions: 'Bring gloves',
    tasks: [{title: 'Before', instructions: 'Photo', acceptanceCriteria: 'Visible'}],
  }

  it('posts the mission with the user’s token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: storedMission, message: 'Created'}))

    await createMission(input, 'jwt')

    const {url, init} = requestAt()
    expect(url.href).toBe(`${API}/api/missions`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({'Content-Type': 'application/json', Authorization: 'JWT jwt'})
    expect(bodyAt()).toEqual(input)
  })

  it.each([
    [{message: 'Top', errors: [{message: 'Nested'}], error: 'Plain'}, 'Top'],
    [
      {errors: [{message: 'The following field is invalid: tasks'}], error: 'x'},
      'field is invalid',
    ],
    [{error: 'Only admins can create missions'}, 'Only admins can create missions'],
    [undefined, 'Failed to create mission: Forbidden'],
  ])('throws the most specific error from %j', async (body, message) => {
    fetchMock.mockResolvedValueOnce(errorResponse(403, 'Forbidden', body))

    await expect(createMission(input, 'jwt')).rejects.toThrow(message)
  })

  // BUG (latent, the result is not used yet): lib/payload.ts:1601-1602 treats the response as
  // the mission, but Payload's REST create returns {doc, message}. The media transform runs on
  // the envelope, so callers get {doc, message, tasks: [], ...} instead of the new mission.
  it.failing('returns the created mission', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({doc: storedMission, message: 'Mission successfully created.'})
    )

    await expect(createMission(input, 'jwt')).resolves.toEqual(clientMission)
  })
})

describe('fetchMissionsFeed', () => {
  it('loads the quest board with absolute media URLs', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        missions: [storedMission, {...storedMission, id: 'm2', tasks: undefined}],
        completedMissionsCount: 4,
        contributorLevel: 'contributor',
      })
    )

    await expect(fetchMissionsFeed('jwt')).resolves.toEqual({
      missions: [clientMission, {...clientMission, id: 'm2', tasks: []}],
      completedMissionsCount: 4,
      contributorLevel: 'contributor',
    })

    const {url, init} = requestAt()
    expect(url.href).toBe(`${API}/api/missions/feed`)
    expect(init.headers).toEqual({Authorization: 'JWT jwt'})
  })

  it('returns no missions when the feed has none', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({completedMissionsCount: 0}))

    await expect(fetchMissionsFeed('jwt')).resolves.toEqual({
      missions: [],
      completedMissionsCount: 0,
    })
  })

  it('throws the server error or the status text', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(403, 'Forbidden', {error: 'Profile missing'}))
      .mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(fetchMissionsFeed('jwt')).rejects.toThrow('Profile missing')
    await expect(fetchMissionsFeed('jwt')).rejects.toThrow(
      'Failed to load missions feed: Internal Server Error'
    )
  })
})

describe('fetchMissionById', () => {
  /**
   * Answers like Payload's REST findByID: when the query has `select[...]` params, only the
   * selected top-level fields (plus `id`) are returned.
   */
  function serveMission(mission: Record<string, unknown>) {
    fetchMock.mockImplementation(async (rawUrl: string) => {
      const selected = new Set<string>()
      new URL(rawUrl).searchParams.forEach((_value, key) => {
        const match = /^select\[([^\]]+)\]/.exec(key)
        if (match) selected.add(match[1])
      })
      if (selected.size === 0) return jsonResponse(mission)
      return jsonResponse(
        Object.fromEntries(
          Object.entries(mission).filter(([field]) => field === 'id' || selected.has(field))
        )
      )
    })
  }

  it('requests the mission with the fields the detail screen needs', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(storedMission))

    await fetchMissionById('m1', 'jwt')

    const {url, init} = requestAt()
    expect(url.pathname).toBe('/api/missions/m1')
    expect(url.searchParams.get('depth')).toBe('2')
    for (const field of [
      'id',
      'title',
      'status',
      'description',
      'level',
      'pointsReward',
      'generalInstructions',
      'tasks',
      'signal][id',
      'signal][title',
      'signal][location',
      'signal][cityObject][type',
      'signal][cityObject][referenceId',
      'inspector][id',
      'inspector][name',
      'inspector][email',
    ]) {
      expect(url.searchParams.get(`select[${field}]`)).toBe('true')
    }
    expect(init.headers).toEqual({Authorization: 'JWT jwt'})
  })

  it('sends no Authorization header without a token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(storedMission))

    await fetchMissionById('m1')

    expect(requestAt().init.headers).toEqual({})
  })

  it('makes the mission’s media URLs absolute', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(storedMission))

    await expect(fetchMissionById('m1', 'jwt')).resolves.toEqual(clientMission)
  })

  it('defaults missing photo lists to empty ones', async () => {
    const {missionBeforePhotos, missionAfterPhotos, ...rest} = storedMission
    fetchMock.mockResolvedValueOnce(jsonResponse(rest))

    const mission = await fetchMissionById('m1', 'jwt')

    expect(mission.missionBeforePhotos).toEqual([])
    expect(mission.missionAfterPhotos).toEqual([])
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(404, 'Not Found'))

    await expect(fetchMissionById('m1', 'jwt')).rejects.toThrow(
      'Failed to fetch mission: Not Found'
    )
  })

  // BUG: lib/payload.ts:1633-1648 selects only some fields, and Payload returns only selected
  // fields. `citizen`, `missionBeforePhotos`, `missionAfterPhotos`, `pointsAwarded` and
  // `inspectorReviewNotes` are left out, so app/(tabs)/missions/[id].tsx never sees who
  // claimed the mission: the owner gets no photo slots, no editable tasks and no
  // "submit for review" button, and review notes are never shown.
  it.failing('returns who claimed the mission, its overall photos and review details', async () => {
    serveMission(storedMission)

    const mission = await fetchMissionById('m1', 'jwt')

    expect(mission).toMatchObject({
      citizen: {id: 7, name: 'Citizen'},
      missionBeforePhotos: [{id: 5, url: `${API}/media/overall-before.jpg`}],
      missionAfterPhotos: [{id: 6, url: `${API}/media/overall-after.jpg`}],
      pointsAwarded: null,
      inspectorReviewNotes: 'Retake the after photo',
    })
  })
})

describe.each([
  ['claimMission', claimMission, 'claim', 'Failed to claim mission'],
  [
    'submitMissionForReview',
    submitMissionForReview,
    'submit-for-review',
    'Failed to submit mission for review',
  ],
])('%s', (_name, action, path, failure) => {
  it('posts to the mission endpoint and returns the updated mission', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({success: true, mission: storedMission}))

    await expect(action('m1', 'jwt')).resolves.toEqual(clientMission)

    const {url, init} = requestAt()
    expect(url.href).toBe(`${API}/api/missions/m1/${path}`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({Authorization: 'JWT jwt'})
  })

  it('throws the server error or the status text', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(409, 'Conflict', {error: 'Mission is locked'}))
      .mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(action('m1', 'jwt')).rejects.toThrow('Mission is locked')
    await expect(action('m1', 'jwt')).rejects.toThrow(`${failure}: Internal Server Error`)
  })
})

describe('submitMissionTask', () => {
  it('submits a task without photos', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({mission: storedMission}))

    await expect(submitMissionTask('m1', 't2', {}, 'jwt')).resolves.toEqual(clientMission)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const {url, init} = requestAt()
    expect(url.href).toBe(`${API}/api/missions/m1/submit-task`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({'Content-Type': 'application/json', Authorization: 'JWT jwt'})
    expect(bodyAt()).toEqual({taskId: 't2'})
  })

  it('uploads the before and after photos and submits their ids', async () => {
    const append = jest.spyOn(FormData.prototype, 'append')
    fetchMock
      .mockResolvedValueOnce(jsonResponse({doc: {id: 11}}))
      .mockResolvedValueOnce(jsonResponse({doc: {id: 12}}))
      .mockResolvedValueOnce(jsonResponse({mission: storedMission}))

    await submitMissionTask(
      'm1',
      't1',
      {before: photo('before.jpg'), after: photo('after.jpg')},
      'jwt'
    )

    for (const index of [0, 1]) {
      expect(requestAt(index).url.href).toBe(`${API}/api/media`)
      expect(requestAt(index).init).toMatchObject({
        method: 'POST',
        headers: {Authorization: 'JWT jwt'},
      })
    }
    expect(append.mock.calls).toEqual([
      ['file', photo('before.jpg')],
      ['file', photo('after.jpg')],
    ])
    expect(bodyAt(2)).toEqual({taskId: 't1', beforePhotoId: 11, afterPhotoId: 12})
  })

  it('submits only the after photo when there is no before photo', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({doc: {id: 12}}))
      .mockResolvedValueOnce(jsonResponse({mission: storedMission}))

    await submitMissionTask('m1', 't1', {after: photo('after.jpg')}, 'jwt')

    expect(bodyAt(1)).toEqual({taskId: 't1', afterPhotoId: 12})
  })

  it('does not submit the task when an upload fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(413, 'Payload Too Large', {message: 'Too big'}))

    await expect(
      submitMissionTask('m1', 't1', {before: photo('before.jpg')}, 'jwt')
    ).rejects.toThrow('Too big')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('names the photo when the failed upload has no message', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(
      submitMissionTask('m1', 't1', {before: photo('before.jpg')}, 'jwt')
    ).rejects.toThrow('Failed to upload photo: before.jpg')
  })

  it('throws the server error or the status text', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(409, 'Conflict', {error: 'Task already locked'}))
      .mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(submitMissionTask('m1', 't1', {}, 'jwt')).rejects.toThrow('Task already locked')
    await expect(submitMissionTask('m1', 't1', {}, 'jwt')).rejects.toThrow(
      'Failed to submit task: Internal Server Error'
    )
  })
})

describe('submitMissionOverallPhotos', () => {
  it('uploads every photo and attaches them to the mission', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({doc: {id: 31}}))
      .mockResolvedValueOnce(jsonResponse({doc: {id: 32}}))
      .mockResolvedValueOnce(jsonResponse({doc: {id: 41}}))
      .mockResolvedValueOnce(jsonResponse({success: true, mission: storedMission}))

    await expect(
      submitMissionOverallPhotos(
        'm1',
        {before: [photo('b1.jpg'), photo('b2.jpg')], after: [photo('a1.jpg')]},
        'jwt'
      )
    ).resolves.toEqual(clientMission)

    expect(fetchMock).toHaveBeenCalledTimes(4)
    const {url, init} = requestAt(3)
    expect(url.href).toBe(`${API}/api/missions/m1/photos`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({'Content-Type': 'application/json', Authorization: 'JWT jwt'})
    expect(bodyAt(3)).toEqual({beforePhotoIds: [31, 32], afterPhotoIds: [41]})
  })

  it('sends an empty list for the side without photos', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({doc: {id: 41}}))
      .mockResolvedValueOnce(jsonResponse({mission: storedMission}))

    await submitMissionOverallPhotos('m1', {after: [photo('a1.jpg')]}, 'jwt')

    expect(bodyAt(1)).toEqual({beforePhotoIds: [], afterPhotoIds: [41]})
  })

  it('does not attach anything when an upload fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(
      submitMissionOverallPhotos('m1', {before: [photo('b1.jpg')]}, 'jwt')
    ).rejects.toThrow('Failed to upload photo: b1.jpg')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws the server error or the status text', async () => {
    fetchMock
      .mockResolvedValueOnce(
        errorResponse(409, 'Conflict', {error: 'Mission is not currently in an editable state'})
      )
      .mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(submitMissionOverallPhotos('m1', {}, 'jwt')).rejects.toThrow(
      'Mission is not currently in an editable state'
    )
    await expect(submitMissionOverallPhotos('m1', {}, 'jwt')).rejects.toThrow(
      'Failed to submit mission photos: Internal Server Error'
    )
  })
})

describe('fetchVerifiableMissions', () => {
  it('loads missions waiting for review with absolute media URLs', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: [storedMission]}))

    await expect(fetchVerifiableMissions('jwt')).resolves.toEqual([clientMission])

    const {url, init} = requestAt()
    expect(url.pathname).toBe('/api/missions')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      'where[status][equals]': 'ready_for_review',
      depth: '1',
      limit: '50',
    })
    expect(init.headers).toEqual({Authorization: 'JWT jwt'})
  })

  it('returns no missions when the response has no docs', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}))

    await expect(fetchVerifiableMissions('jwt')).resolves.toEqual([])
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(fetchVerifiableMissions('jwt')).rejects.toThrow(
      'Failed to load verifiable missions: Internal Server Error'
    )
  })
})

describe('submitMissionVerification', () => {
  it('posts the decision and comment', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 'v1'}}))

    await expect(
      submitMissionVerification('m1', 'reject', 'Bench still dirty', 'jwt')
    ).resolves.toBeUndefined()

    const {url, init} = requestAt()
    expect(url.href).toBe(`${API}/api/mission-verifications`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({'Content-Type': 'application/json', Authorization: 'JWT jwt'})
    expect(bodyAt()).toEqual({mission: 'm1', decision: 'reject', comment: 'Bench still dirty'})
  })

  it('leaves out an empty comment', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 'v1'}}))

    await submitMissionVerification('m1', 'approve', undefined, 'jwt')

    expect(bodyAt()).toEqual({mission: 'm1', decision: 'approve'})
  })

  it.each([
    [{errors: [{message: 'You already verified this mission'}], message: 'x'}, 'already verified'],
    [{message: 'You cannot verify your own mission'}, 'cannot verify your own mission'],
    [undefined, 'Failed to submit verification: Bad Request'],
  ])('throws the most specific error from %j', async (body, message) => {
    fetchMock.mockResolvedValueOnce(errorResponse(400, 'Bad Request', body))

    await expect(submitMissionVerification('m1', 'approve', undefined, 'jwt')).rejects.toThrow(
      message
    )
  })
})
