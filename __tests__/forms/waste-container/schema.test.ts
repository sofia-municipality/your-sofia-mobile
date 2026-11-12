import {wasteContainerFormSchema, type WasteContainerFormData} from '../../../forms/waste-container'

const valid: WasteContainerFormData = {
  publicNumber: 'WC-001',
  wasteType: 'general',
  capacityVolume: 1.1,
  capacitySize: 'standard',
  binCount: 2,
  location: {latitude: 42.6977, longitude: 23.3219, address: 'ul. Shipka 1'},
  notes: 'Behind the school',
}

function issuesFor(data: unknown) {
  const result = wasteContainerFormSchema.safeParse(data)
  return result.success
    ? []
    : result.error.issues.map((i) => ({path: i.path.join('.'), message: i.message}))
}

describe('wasteContainerFormSchema', () => {
  it('accepts a complete container', () => {
    expect(wasteContainerFormSchema.parse(valid)).toEqual(valid)
  })

  it('accepts a container without optional fields', () => {
    const {binCount, notes, ...rest} = valid
    const minimal = {...rest, location: {latitude: 42.6977, longitude: 23.3219}}

    expect(wasteContainerFormSchema.safeParse(minimal).success).toBe(true)
  })

  it('requires a public number', () => {
    expect(issuesFor({...valid, publicNumber: ''})).toEqual([
      {path: 'publicNumber', message: 'newCityObject.publicNumberRequired'},
    ])
  })

  it.each([0, 0.05, -1])('rejects capacity volume %d', (capacityVolume) => {
    expect(issuesFor({...valid, capacityVolume})).toEqual([
      {path: 'capacityVolume', message: 'newCityObject.capacityRequired'},
    ])
  })

  it('accepts the minimum capacity volume', () => {
    expect(issuesFor({...valid, capacityVolume: 0.1})).toEqual([])
  })

  it.each([
    'general',
    'recyclables',
    'organic',
    'glass',
    'paper',
    'plastic',
    'metal',
    'trashCan',
    'bulky-waste-zones',
  ])('accepts waste type "%s"', (wasteType) => {
    expect(issuesFor({...valid, wasteType})).toEqual([])
  })

  it('rejects an unknown waste type', () => {
    expect(issuesFor({...valid, wasteType: 'nuclear'})[0].path).toBe('wasteType')
  })

  it.each(['tiny', 'small', 'standard', 'big', 'industrial'])(
    'accepts capacity size "%s"',
    (capacitySize) => {
      expect(issuesFor({...valid, capacitySize})).toEqual([])
    }
  )

  it('rejects an unknown capacity size', () => {
    expect(issuesFor({...valid, capacitySize: 'huge'})[0].path).toBe('capacitySize')
  })

  it('requires at least one bin when a bin count is given', () => {
    expect(issuesFor({...valid, binCount: 0})[0].path).toBe('binCount')
  })

  it.each([
    ['latitude', 90.1],
    ['latitude', -90.1],
    ['longitude', 180.1],
    ['longitude', -180.1],
  ])('rejects out-of-range %s %d', (field, value) => {
    expect(issuesFor({...valid, location: {...valid.location, [field]: value}})[0].path).toBe(
      `location.${field}`
    )
  })

  it('accepts boundary coordinates', () => {
    expect(issuesFor({...valid, location: {latitude: -90, longitude: 180}})).toEqual([])
  })

  it('rejects numbers sent as strings', () => {
    expect(issuesFor({...valid, capacityVolume: '1.5'})[0].path).toBe('capacityVolume')
  })
})
