import {
  calculateAssignmentProgress,
  createAssignment,
  fetchAssignmentById,
  fetchAssignments,
  updateAssignment,
} from '../../lib/payload'
import type {Assignment, CreateAssignmentInput} from '../../types/assignment'
import type {ContainerState, WasteContainer} from '../../types/wasteContainer'

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

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

describe('fetchAssignments', () => {
  it('requests the newest assignments with relationships populated', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: []}))

    await expect(fetchAssignments()).resolves.toEqual({docs: []})

    const {url} = requestAt()
    expect(url.pathname).toBe('/api/assignments')
    expect(Object.fromEntries(url.searchParams)).toEqual({depth: '2', sort: '-createdAt'})
  })

  it('applies the filters and paging', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: []}))

    await fetchAssignments({status: 'in-progress', assignedTo: 7, limit: 50, page: 2})

    expect(Object.fromEntries(requestAt().url.searchParams)).toEqual({
      'where[status][equals]': 'in-progress',
      'where[assignedTo][equals]': '7',
      limit: '50',
      page: '2',
      depth: '2',
      sort: '-createdAt',
    })
  })

  it('pages without a custom limit', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: []}))

    await fetchAssignments({page: 3})

    expect(Object.fromEntries(requestAt().url.searchParams)).toEqual({
      page: '3',
      depth: '2',
      sort: '-createdAt',
    })
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(fetchAssignments()).rejects.toThrow(
      'Failed to fetch assignments: Internal Server Error'
    )
  })
})

describe('fetchAssignmentById', () => {
  it('loads the assignment with relationships populated', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({id: 'a1', title: 'Lozenets round'}))

    await expect(fetchAssignmentById('a1')).resolves.toEqual({id: 'a1', title: 'Lozenets round'})

    expect(requestAt().url.href).toBe(`${API}/api/assignments/a1?depth=2`)
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(404, 'Not Found'))

    await expect(fetchAssignmentById('a1')).rejects.toThrow('Failed to fetch assignment: Not Found')
  })
})

describe('createAssignment', () => {
  const input: CreateAssignmentInput = {
    title: 'Lozenets round',
    containers: ['1', '2'],
    assignedTo: 7,
    activities: ['full', 'dirty'],
  }

  it('posts the assignment with the user’s token', async () => {
    const body = {doc: {id: 'a1'}, message: 'Created'}
    fetchMock.mockResolvedValueOnce(jsonResponse(body))

    await expect(createAssignment(input, 'jwt')).resolves.toEqual(body)

    const {url, init} = requestAt()
    expect(url.href).toBe(`${API}/api/assignments`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({'Content-Type': 'application/json', Authorization: 'JWT jwt'})
    expect(JSON.parse(init.body as string)).toEqual(input)
  })

  it('throws the server message or the status text', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(400, 'Bad Request', {message: 'Title is required'}))
      .mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(createAssignment(input, 'jwt')).rejects.toThrow('Title is required')
    await expect(createAssignment(input, 'jwt')).rejects.toThrow(
      'Failed to create assignment: Internal Server Error'
    )
  })
})

describe('updateAssignment', () => {
  it('patches the assignment with the user’s token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 'a1'}}))

    await updateAssignment('a1', {status: 'completed'}, 'jwt')

    const {url, init} = requestAt()
    expect(url.href).toBe(`${API}/api/assignments/a1`)
    expect(init.method).toBe('PATCH')
    expect(init.headers).toEqual({'Content-Type': 'application/json', Authorization: 'JWT jwt'})
    expect(JSON.parse(init.body as string)).toEqual({status: 'completed'})
  })

  it('throws the server message or the status text', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(403, 'Forbidden', {message: 'Not allowed'}))
      .mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(updateAssignment('a1', {}, 'jwt')).rejects.toThrow('Not allowed')
    await expect(updateAssignment('a1', {}, 'jwt')).rejects.toThrow(
      'Failed to update assignment: Internal Server Error'
    )
  })
})

describe('calculateAssignmentProgress', () => {
  function container(id: string, state?: ContainerState[]): WasteContainer {
    return {
      id,
      publicNumber: `WC-${id}`,
      location: [23.32, 42.69],
      latitude: 42.69,
      longitude: 23.32,
      capacityVolume: 1.1,
      capacitySize: 'standard',
      wasteType: 'general',
      status: 'active',
      state,
      createdAt: '',
      updatedAt: '',
    }
  }

  function assignment(
    containers: Assignment['containers'],
    activities: ContainerState[] = ['full', 'dirty']
  ): Assignment {
    return {
      id: 'a1',
      title: 'Round',
      containers,
      assignedTo: 7,
      activities,
      status: 'in-progress',
      createdAt: '',
      updatedAt: '',
    }
  }

  it('reports each container’s done and remaining activities', () => {
    const progress = calculateAssignmentProgress(
      assignment([container('1', ['dirty', 'full', 'damaged']), container('2', ['full'])])
    )

    expect(progress).toEqual({
      assignmentId: 'a1',
      totalContainers: 2,
      completedContainers: 1,
      percentageComplete: 50,
      containerStatuses: [
        {
          containerId: '1',
          publicNumber: 'WC-1',
          isComplete: true,
          completedActivities: ['full', 'dirty'],
          pendingActivities: [],
        },
        {
          containerId: '2',
          publicNumber: 'WC-2',
          isComplete: false,
          completedActivities: ['full'],
          pendingActivities: ['dirty'],
        },
      ],
    })
  })

  it('treats a container without a state as not started', () => {
    const {containerStatuses} = calculateAssignmentProgress(assignment([container('1')]))

    expect(containerStatuses[0]).toMatchObject({
      isComplete: false,
      completedActivities: [],
      pendingActivities: ['full', 'dirty'],
    })
  })

  it.each([
    [1, 3, 33],
    [2, 3, 67],
    [3, 3, 100],
    [0, 4, 0],
  ])('rounds %d of %d done containers to %d%%', (done, total, percentage) => {
    const containers = Array.from({length: total}, (_, i) =>
      container(String(i), i < done ? ['full', 'dirty'] : [])
    )

    const progress = calculateAssignmentProgress(assignment(containers))

    expect(progress.completedContainers).toBe(done)
    expect(progress.percentageComplete).toBe(percentage)
  })

  it('counts unpopulated container ids in the total but cannot track them', () => {
    const progress = calculateAssignmentProgress(
      assignment(['1', '2', container('3', ['full', 'dirty'])] as unknown as WasteContainer[])
    )

    expect(progress.totalContainers).toBe(3)
    expect(progress.completedContainers).toBe(1)
    expect(progress.percentageComplete).toBe(33)
    expect(progress.containerStatuses.map((s) => s.containerId)).toEqual(['3'])
  })

  it('never completes a container when the assignment has no activities', () => {
    const progress = calculateAssignmentProgress(assignment([container('1', ['full'])], []))

    expect(progress.completedContainers).toBe(0)
    expect(progress.containerStatuses[0]).toMatchObject({
      isComplete: false,
      completedActivities: [],
      pendingActivities: [],
    })
  })

  it('treats missing activities like an empty list', () => {
    const progress = calculateAssignmentProgress({
      ...assignment([container('1', ['full'])]),
      activities: undefined as unknown as ContainerState[],
    })

    expect(progress.containerStatuses[0].pendingActivities).toEqual([])
  })

  it('reports 0% for an assignment without containers', () => {
    expect(calculateAssignmentProgress(assignment([]))).toEqual({
      assignmentId: 'a1',
      totalContainers: 0,
      completedContainers: 0,
      percentageComplete: 0,
      containerStatuses: [],
    })
  })

  it('treats missing containers like an empty list', () => {
    const progress = calculateAssignmentProgress(
      assignment(undefined as unknown as WasteContainer[])
    )

    expect(progress.totalContainers).toBe(0)
    expect(progress.percentageComplete).toBe(0)
  })
})
