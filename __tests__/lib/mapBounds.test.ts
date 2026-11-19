import {SOFIA_DEFAULT_BOUNDS, estimateZoom, getBoundsFromRegion} from '../../lib/mapBounds'

const region = {latitude: 42.7, longitude: 23.3, latitudeDelta: 0.2, longitudeDelta: 0.4}

describe('getBoundsFromRegion', () => {
  it('spans half of each delta around the center', () => {
    const bounds = getBoundsFromRegion(region)

    expect(bounds.north).toBeCloseTo(42.8, 10)
    expect(bounds.south).toBeCloseTo(42.6, 10)
    expect(bounds.east).toBeCloseTo(23.5, 10)
    expect(bounds.west).toBeCloseTo(23.1, 10)
  })

  it('collapses to the center for a zero-size region', () => {
    expect(getBoundsFromRegion({...region, latitudeDelta: 0, longitudeDelta: 0})).toEqual({
      north: 42.7,
      south: 42.7,
      east: 23.3,
      west: 23.3,
    })
  })
})

describe('estimateZoom', () => {
  it('returns 0 when the whole world is visible', () => {
    expect(estimateZoom({...region, longitudeDelta: 360})).toBe(0)
  })

  it('adds one zoom level each time the visible longitude halves', () => {
    expect(estimateZoom({...region, longitudeDelta: 180})).toBe(1)
    expect(estimateZoom({...region, longitudeDelta: 0.3515625})).toBe(10)
  })

  it('only depends on the longitude delta', () => {
    expect(estimateZoom({...region, latitudeDelta: 50})).toBe(estimateZoom(region))
  })

  it('stays finite for a zero or negative delta', () => {
    const zero = estimateZoom({...region, longitudeDelta: 0})

    expect(Number.isFinite(zero)).toBe(true)
    expect(zero).toBeCloseTo(Math.log2(360 / 0.000001), 10)
    expect(estimateZoom({...region, longitudeDelta: -1})).toBe(zero)
  })
})

describe('SOFIA_DEFAULT_BOUNDS', () => {
  it('contains the city center', () => {
    const {north, south, east, west} = SOFIA_DEFAULT_BOUNDS

    expect(south).toBeLessThan(42.6977)
    expect(north).toBeGreaterThan(42.6977)
    expect(west).toBeLessThan(23.3219)
    expect(east).toBeGreaterThan(23.3219)
  })
})
