import {
  drinkingFountainFormSchema,
  type DrinkingFountainFormData,
} from '../../../forms/drinking-fountain'

const valid: DrinkingFountainFormData = {
  address: 'bul. Vitosha 1',
  isActive: true,
  location: {latitude: 42.6977, longitude: 23.3219},
  district: 3,
  source: 1,
  status: 2,
}

function issuesFor(data: unknown) {
  const result = drinkingFountainFormSchema.safeParse(data)
  return result.success
    ? []
    : result.error.issues.map((i) => ({path: i.path.join('.'), message: i.message}))
}

describe('drinkingFountainFormSchema', () => {
  it('accepts a complete fountain', () => {
    expect(drinkingFountainFormSchema.parse(valid)).toEqual(valid)
  })

  it('accepts a fountain without the optional lookups', () => {
    const {district, source, status, ...minimal} = valid

    expect(issuesFor(minimal)).toEqual([])
  })

  it('requires an address', () => {
    expect(issuesFor({...valid, address: ''})).toEqual([
      {path: 'address', message: 'newCityObject.addressRequired'},
    ])
  })

  it('requires the working state', () => {
    const {isActive, ...rest} = valid

    expect(issuesFor(rest)[0].path).toBe('isActive')
  })

  it('accepts a broken fountain', () => {
    expect(issuesFor({...valid, isActive: false})).toEqual([])
  })

  it('accepts district ids as numbers or strings', () => {
    expect(issuesFor({...valid, district: 3})).toEqual([])
    expect(issuesFor({...valid, district: 'lozenets'})).toEqual([])
  })

  it.each(['source', 'status'])('requires a numeric %s id', (field) => {
    expect(issuesFor({...valid, [field]: '1'})[0].path).toBe(field)
  })

  it.each([
    ['latitude', 91],
    ['latitude', -91],
    ['longitude', 181],
    ['longitude', -181],
  ])('rejects out-of-range %s %d', (field, value) => {
    expect(issuesFor({...valid, location: {...valid.location, [field]: value}})[0].path).toBe(
      `location.${field}`
    )
  })
})
