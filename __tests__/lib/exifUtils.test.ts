import {convertGPSToDecimal, parseExifDateTime} from '../../lib/exifUtils'

describe('convertGPSToDecimal', () => {
  it('converts degrees, minutes and seconds to decimal degrees', () => {
    expect(convertGPSToDecimal([42, 41, 51.72], 'N')).toBeCloseTo(42.6977, 4)
    expect(convertGPSToDecimal([23, 19, 18.84], 'E')).toBeCloseTo(23.3219, 4)
  })

  it.each([
    ['S', [33, 52, 4.8], -33.868],
    ['W', [0, 7, 39.6], -0.1277],
  ])('makes %s coordinates negative', (ref, dms, expected) => {
    expect(convertGPSToDecimal(dms as number[], ref)).toBeCloseTo(expected, 3)
  })

  it('passes decimal values through for N and E', () => {
    expect(convertGPSToDecimal(42.6977, 'N')).toBe(42.6977)
    expect(convertGPSToDecimal(23.3219, 'E')).toBe(23.3219)
  })

  it('negates decimal values for S and W', () => {
    expect(convertGPSToDecimal(42.6977, 'S')).toBe(-42.6977)
    expect(convertGPSToDecimal(23.3219, 'W')).toBe(-23.3219)
  })

  it.each([[[42, 41]], [[42, 41, 51, 0]], [[]]])('returns null for malformed array %j', (dms) => {
    expect(convertGPSToDecimal(dms, 'N')).toBeNull()
  })

  it('returns null for a value that is neither a number nor an array', () => {
    expect(convertGPSToDecimal('42.69' as unknown as number, 'N')).toBeNull()
  })
})

describe('parseExifDateTime', () => {
  it('parses the EXIF "YYYY:MM:DD HH:MM:SS" format as local time', () => {
    const date = parseExifDateTime('2026:03:14 09:26:53')

    expect(date).toEqual(new Date(2026, 2, 14, 9, 26, 53))
  })

  it.each([
    ['ISO format', '2026-03-14T09:26:53'],
    ['missing time', '2026:03:14'],
    ['extra part', '2026:03:14 09:26:53 +02:00'],
    ['short date', '2026:03 09:26:53'],
    ['short time', '2026:03:14 09:26'],
    ['empty string', ''],
  ])('returns null for %s', (_label, value) => {
    expect(parseExifDateTime(value)).toBeNull()
  })

  it('returns null for non-numeric parts', () => {
    expect(parseExifDateTime('yyyy:mm:dd hh:mm:ss')).toBeNull()
  })

  it('returns null and logs when given something that is not a string', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(parseExifDateTime(undefined as unknown as string)).toBeNull()
    expect(errorSpy).toHaveBeenCalledWith('Error parsing EXIF datetime:', expect.any(TypeError))

    errorSpy.mockRestore()
  })
})
