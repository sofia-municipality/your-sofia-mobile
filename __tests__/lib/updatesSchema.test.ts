import {
  UpdateByIdResponseSchema,
  UpdateMessageSchema,
  UpdateSourceSchema,
  UpdatesResponseSchema,
  UpdatesSourcesResponseSchema,
} from '../../lib/updatesSchema'

const minimal = {text: 'Water outage', createdAt: '2026-11-10T08:00:00.000Z'}

const full = {
  ...minimal,
  id: 'msg-1',
  plainText: 'Water outage',
  markdownText: '**Water** outage',
  addresses: [
    {
      originalText: 'ul. Shipka 1',
      formattedAddress: 'ul. "Shipka" 1, Sofia',
      coordinates: {lat: 42.69, lng: 23.33},
      geoJson: {type: 'Point', coordinates: [23.33, 42.69]},
    },
  ],
  geoJson: {
    type: 'FeatureCollection',
    features: [
      {type: 'Feature', geometry: {type: 'Point', coordinates: [23.33, 42.69]}},
      {
        type: 'Feature',
        geometry: {type: 'LineString', coordinates: [[23.3, 42.7]]},
        properties: {name: 'Shipka'},
      },
    ],
  },
  crawledAt: '2026-11-10T07:59:00.000Z',
  finalizedAt: '2026-11-10T08:05:00.000Z',
  source: 'sofiyska-voda',
  sourceUrl: 'https://sofiyskavoda.bg/news/1',
  categories: ['water'],
  timespanStart: '2026-11-11T08:00:00.000Z',
  timespanEnd: '2026-11-11T16:00:00.000Z',
  cityWide: false,
  responsibleEntity: 'Sofiyska Voda',
  pins: [
    {
      address: 'ul. Shipka 1',
      coordinates: {lat: 42.69, lng: 23.33},
      timespans: [{start: '2026-11-11T08:00:00.000Z', end: '2026-11-11T16:00:00.000Z'}],
    },
  ],
  streets: [
    {
      street: 'ul. Shipka',
      from: 'bul. Vasil Levski',
      fromCoordinates: {lat: 42.69, lng: 23.33},
      to: 'ul. Oborishte',
      timespans: [{start: '2026-11-11T08:00:00.000Z', end: null}],
    },
  ],
  cadastralProperties: [{identifier: '68134.403.1', timespans: []}],
  busStops: ['0123'],
  locality: 'bg.sofia',
}

function issuePaths(result: {success: boolean; error?: {issues: {path: PropertyKey[]}[]}}) {
  return result.success ? [] : result.error!.issues.map((i) => i.path.join('.'))
}

describe('UpdateMessageSchema', () => {
  it('accepts a message with only text and createdAt', () => {
    expect(UpdateMessageSchema.parse(minimal)).toEqual(minimal)
  })

  it('accepts a fully populated message', () => {
    expect(UpdateMessageSchema.safeParse(full).success).toBe(true)
  })

  it.each(['text', 'createdAt'])('requires %s', (field) => {
    const {[field as keyof typeof minimal]: _omit, ...rest} = minimal

    expect(issuePaths(UpdateMessageSchema.safeParse(rest))).toEqual([field])
  })

  it('drops fields it does not know about', () => {
    expect(UpdateMessageSchema.parse({...minimal, internalScore: 7})).toEqual(minimal)
  })

  it('rejects a non-boolean cityWide', () => {
    expect(issuePaths(UpdateMessageSchema.safeParse({...minimal, cityWide: 'yes'}))).toEqual([
      'cityWide',
    ])
  })

  it('rejects address coordinates without lng', () => {
    const message = {...minimal, addresses: [{coordinates: {lat: 42.69}}]}

    expect(issuePaths(UpdateMessageSchema.safeParse(message))).toEqual([
      'addresses.0.coordinates.lng',
    ])
  })

  it('requires address GeoJSON to be a two-number Point', () => {
    const lineString = {
      ...minimal,
      addresses: [{geoJson: {type: 'LineString', coordinates: [23.3, 42.7]}}],
    }
    const threeNumbers = {
      ...minimal,
      addresses: [{geoJson: {type: 'Point', coordinates: [23.3, 42.7, 550]}}],
    }

    expect(UpdateMessageSchema.safeParse(lineString).success).toBe(false)
    expect(UpdateMessageSchema.safeParse(threeNumbers).success).toBe(false)
  })

  it('accepts Point, LineString and Polygon features', () => {
    const geometries = ['Point', 'LineString', 'Polygon'].map((type) => ({
      type: 'Feature',
      geometry: {type, coordinates: []},
    }))
    const message = {...minimal, geoJson: {type: 'FeatureCollection', features: geometries}}

    expect(UpdateMessageSchema.safeParse(message).success).toBe(true)
  })

  it('rejects other geometry types', () => {
    const message = {
      ...minimal,
      geoJson: {
        type: 'FeatureCollection',
        features: [{type: 'Feature', geometry: {type: 'MultiPoint', coordinates: []}}],
      },
    }

    expect(issuePaths(UpdateMessageSchema.safeParse(message))).toEqual([
      'geoJson.features.0.geometry.type',
    ])
  })

  it('rejects a GeoJSON object that is not a FeatureCollection', () => {
    const message = {...minimal, geoJson: {type: 'Feature', features: []}}

    expect(issuePaths(UpdateMessageSchema.safeParse(message))).toEqual(['geoJson.type'])
  })

  it('keeps a pin timespan start', () => {
    const parsed = UpdateMessageSchema.parse(full)

    expect(parsed.pins![0].timespans[0]).toEqual({
      start: '2026-11-11T08:00:00.000Z',
      end: '2026-11-11T16:00:00.000Z',
    })
  })

  it('replaces a missing timespan start with the current time', () => {
    jest.useFakeTimers({now: new Date('2026-11-16T10:00:00.000Z')})
    const message = {
      ...minimal,
      pins: [{address: 'ul. Shipka 1', timespans: [{start: null, end: null}]}],
    }

    const parsed = UpdateMessageSchema.parse(message)

    expect(parsed.pins![0].timespans[0]).toEqual({start: '2026-11-16T10:00:00.000Z', end: null})
    jest.useRealTimers()
  })

  it('requires the end of a timespan to be present, even if null', () => {
    const message = {
      ...minimal,
      streets: [{street: 'ul. Shipka', from: 'a', to: 'b', timespans: [{start: null}]}],
    }

    expect(issuePaths(UpdateMessageSchema.safeParse(message))).toEqual([
      'streets.0.timespans.0.end',
    ])
  })

  it('requires the street name and both ends', () => {
    const message = {...minimal, streets: [{timespans: []}]}

    expect(issuePaths(UpdateMessageSchema.safeParse(message)).sort()).toEqual([
      'streets.0.from',
      'streets.0.street',
      'streets.0.to',
    ])
  })
})

describe('response schemas', () => {
  it('parses a list of updates', () => {
    expect(UpdatesResponseSchema.parse({messages: [minimal, full]}).messages).toHaveLength(2)
  })

  it('rejects a list response without messages', () => {
    expect(UpdatesResponseSchema.safeParse({docs: []}).success).toBe(false)
  })

  it('reports which message in a list is invalid', () => {
    const result = UpdatesResponseSchema.safeParse({messages: [minimal, {text: 'no date'}]})

    expect(issuePaths(result)).toEqual(['messages.1.createdAt'])
  })

  it('parses a single update', () => {
    expect(UpdateByIdResponseSchema.parse({message: full}).message.id).toBe('msg-1')
  })

  it('rejects a single-update response without a message', () => {
    expect(UpdateByIdResponseSchema.safeParse({}).success).toBe(false)
  })

  it('parses sources and requires an id for each', () => {
    const source = {
      id: 'sofiyska-voda',
      name: 'Sofiyska Voda',
      url: 'https://sofiyskavoda.bg',
      logoUrl: 'https://cdn.test/logo.png',
    }

    expect(UpdatesSourcesResponseSchema.parse({sources: [source]}).sources).toEqual([source])
    expect(UpdateSourceSchema.safeParse({name: 'No id'}).success).toBe(false)
    expect(UpdateSourceSchema.parse({id: 'toplofikatsia'})).toEqual({id: 'toplofikatsia'})
  })
})
