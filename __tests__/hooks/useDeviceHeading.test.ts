import {renderHook, act} from '@testing-library/react-native'
import * as Location from 'expo-location'
import {useDeviceHeading} from '../../hooks/useDeviceHeading'

jest.mock('expo-location', () => ({
  watchHeadingAsync: jest.fn(),
}))

type HeadingCallback = (data: {trueHeading: number; magHeading: number; accuracy: number}) => void

describe('useDeviceHeading', () => {
  let capturedCallback: HeadingCallback | null = null
  const mockRemove = jest.fn()

  beforeEach(() => {
    capturedCallback = null
    mockRemove.mockClear()
    ;(Location.watchHeadingAsync as jest.Mock).mockImplementation((cb: HeadingCallback) => {
      capturedCallback = cb
      return Promise.resolve({remove: mockRemove})
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('starts with heading null and available true', async () => {
    const {result} = await renderHook(() => useDeviceHeading())
    expect(result.current.heading).toBeNull()
    expect(result.current.available).toBe(true)
  })

  it('uses trueHeading when >= 0', async () => {
    const {result} = await renderHook(() => useDeviceHeading())
    await act(async () => {})

    await act(() => capturedCallback!({trueHeading: 90, magHeading: 92, accuracy: 1}))
    expect(result.current.heading).toBe(90)
  })

  it('falls back to magHeading when trueHeading < 0', async () => {
    const {result} = await renderHook(() => useDeviceHeading())
    await act(async () => {})

    await act(() => capturedCallback!({trueHeading: -1, magHeading: 270, accuracy: 1}))
    expect(result.current.heading).toBe(270)
  })

  it('ignores readings when both trueHeading and magHeading are < 0', async () => {
    const {result} = await renderHook(() => useDeviceHeading())
    await act(async () => {})

    await act(() => capturedCallback!({trueHeading: -1, magHeading: -1, accuracy: 0}))
    expect(result.current.heading).toBeNull()
  })

  it('updates heading across cardinal directions', async () => {
    const {result} = await renderHook(() => useDeviceHeading())
    await act(async () => {})

    for (const deg of [0, 90, 180, 270]) {
      await act(() => capturedCallback!({trueHeading: deg, magHeading: deg + 2, accuracy: 1}))
      expect(result.current.heading).toBe(deg)
    }
  })

  it('sets available false when watchHeadingAsync rejects', async () => {
    ;(Location.watchHeadingAsync as jest.Mock).mockRejectedValueOnce(new Error('unavailable'))
    const {result} = await renderHook(() => useDeviceHeading())
    await act(async () => {})

    expect(result.current.available).toBe(false)
    expect(result.current.heading).toBeNull()
  })

  it('removes subscription on unmount', async () => {
    const {unmount} = await renderHook(() => useDeviceHeading())
    await act(async () => {})

    await unmount()
    expect(mockRemove).toHaveBeenCalledTimes(1)
  })

  it('removes subscription immediately if unmounted before promise resolves', async () => {
    let resolvePromise!: (sub: {remove: jest.Mock}) => void
    ;(Location.watchHeadingAsync as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve
      })
    )

    const {unmount} = await renderHook(() => useDeviceHeading())
    await unmount() // unmount before the promise resolves

    await act(async () => {
      resolvePromise({remove: mockRemove})
    })

    // subscription must be cleaned up even though unmount happened first
    expect(mockRemove).toHaveBeenCalledTimes(1)
  })
})
