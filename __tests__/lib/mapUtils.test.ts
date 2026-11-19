import {getDistanceFromLatLonInMeters} from '../../lib/mapUtils'

describe('getDistanceFromLatLonInMeters', () => {
  it('returns 0 for the same point', () => {
    expect(getDistanceFromLatLonInMeters(42.6977, 23.3219, 42.6977, 23.3219)).toBe(0)
  })

  it('measures one degree of latitude as about 111.2 km', () => {
    expect(getDistanceFromLatLonInMeters(42, 23, 43, 23)).toBeCloseTo(111195, -1)
  })

  it('shrinks longitude distances away from the equator', () => {
    const atEquator = getDistanceFromLatLonInMeters(0, 23, 0, 24)
    const inSofia = getDistanceFromLatLonInMeters(42.7, 23, 42.7, 24)

    expect(inSofia / atEquator).toBeCloseTo(Math.cos((42.7 * Math.PI) / 180), 3)
  })

  it('measures Sofia to Plovdiv as about 132 km', () => {
    const meters = getDistanceFromLatLonInMeters(42.6977, 23.3219, 42.1354, 24.7453)

    expect(meters).toBeGreaterThan(131000)
    expect(meters).toBeLessThan(134000)
  })

  it('resolves short distances used for photo grouping', () => {
    // 0.00009° of latitude is ~10 m
    expect(getDistanceFromLatLonInMeters(42.7, 23.3, 42.70009, 23.3)).toBeCloseTo(10.0, 0)
  })

  it('is symmetric', () => {
    const a = getDistanceFromLatLonInMeters(42.69, 23.31, 42.71, 23.35)
    const b = getDistanceFromLatLonInMeters(42.71, 23.35, 42.69, 23.31)

    expect(a).toBeCloseTo(b, 6)
  })
})
