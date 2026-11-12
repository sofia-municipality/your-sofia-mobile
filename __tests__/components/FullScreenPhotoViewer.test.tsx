import React from 'react'
import {Dimensions, StyleSheet} from 'react-native'
import {fireEvent, render, screen} from '@testing-library/react-native'
import {FullScreenPhotoViewer} from '../../components/FullScreenPhotoViewer'

type GestureHandler = (event?: Record<string, number>) => void

interface MockGesture {
  type: 'pinch' | 'pan' | 'tap'
  handlers: {onUpdate?: GestureHandler; onEnd?: GestureHandler}
  config: {numberOfTaps?: number}
}

const mockGestures: MockGesture[] = []

// The real gesture handler / reanimated runtimes need native modules. These
// lightweight stand-ins capture the gesture callbacks so the zoom/pan logic
// can be driven directly, and evaluate animated styles on every render.
jest.mock('react-native-gesture-handler', () => {
  const {View} = require('react-native')
  const create = (type: MockGesture['type']) => {
    const gesture: MockGesture & Record<string, unknown> = {type, handlers: {}, config: {}}
    gesture.onUpdate = (cb: GestureHandler) => {
      gesture.handlers.onUpdate = cb
      return gesture
    }
    gesture.onEnd = (cb: GestureHandler) => {
      gesture.handlers.onEnd = cb
      return gesture
    }
    gesture.numberOfTaps = (count: number) => {
      gesture.config.numberOfTaps = count
      return gesture
    }
    mockGestures.push(gesture)
    return gesture
  }
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({children}: {children: React.ReactNode}) => children,
    Gesture: {
      Pinch: () => create('pinch'),
      Pan: () => create('pan'),
      Tap: () => create('tap'),
      Simultaneous: (...gestures: unknown[]) => ({type: 'simultaneous', gestures}),
    },
  }
})

jest.mock('react-native-reanimated', () => {
  const {useRef} = require('react')
  const {Image} = require('react-native')
  return {
    __esModule: true,
    default: {Image},
    useSharedValue: (initial: number) => useRef({value: initial}).current,
    useAnimatedStyle: (factory: () => object) => factory(),
    withSpring: (value: number) => value,
    withTiming: (value: number) => value,
  }
})

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  return {X: () => <View testID="icon-close" />}
})

const PHOTO_URI = 'file:///photos/container.jpg'

function latestGesture(type: MockGesture['type']): MockGesture {
  const gesture = [...mockGestures].reverse().find((g) => g.type === type)
  if (!gesture) throw new Error(`No ${type} gesture registered`)
  return gesture
}

function getImage() {
  const [image] = screen.container.queryAll((node) => node.type === 'Image')
  return image
}

function getTransform(): {scale: number; translateX: number; translateY: number} {
  const style = StyleSheet.flatten(getImage().props.style)
  return Object.assign({}, ...(style.transform as object[]))
}

describe('FullScreenPhotoViewer', () => {
  const onClose = jest.fn()

  async function renderViewer() {
    await render(<FullScreenPhotoViewer visible photoUri={PHOTO_URI} onClose={onClose} />)
  }

  // Shared values are mutated outside React; re-render to re-evaluate the animated style.
  async function refresh() {
    await screen.rerender(<FullScreenPhotoViewer visible photoUri={PHOTO_URI} onClose={onClose} />)
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGestures.length = 0
  })

  describe('rendering', () => {
    it('renders nothing when hidden', async () => {
      await render(<FullScreenPhotoViewer visible={false} photoUri={PHOTO_URI} onClose={onClose} />)

      expect(getImage()).toBeUndefined()
      expect(screen.queryByTestId('icon-close')).not.toBeOnTheScreen()
    })

    it('renders the photo full screen when visible', async () => {
      await renderViewer()

      const {width, height} = Dimensions.get('window')
      expect(getImage().props.source).toEqual({uri: PHOTO_URI})
      expect(getImage().props.resizeMode).toBe('contain')
      expect(getImage()).toHaveStyle({width, height})
    })

    it('starts without zoom or pan', async () => {
      await renderViewer()

      expect(getTransform()).toEqual({scale: 1, translateX: 0, translateY: 0})
    })

    it('renders only the close button when there is no photo', async () => {
      await render(<FullScreenPhotoViewer visible photoUri={null} onClose={onClose} />)

      expect(getImage()).toBeUndefined()
      expect(screen.getByTestId('icon-close')).toBeOnTheScreen()
    })
  })

  describe('closing', () => {
    it('calls onClose when the close button is pressed', async () => {
      await renderViewer()

      await fireEvent.press(screen.getByTestId('icon-close'))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose on the hardware back button', async () => {
      await renderViewer()

      const [modal] = screen.container.queryAll((node) => node.props.onRequestClose !== undefined)
      await fireEvent(modal, 'requestClose')

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('resets zoom and pan when closed', async () => {
      await renderViewer()
      latestGesture('pinch').handlers.onUpdate!({scale: 3})
      latestGesture('pinch').handlers.onEnd!()
      latestGesture('pan').handlers.onUpdate!({translationX: 40, translationY: -20})
      latestGesture('pan').handlers.onEnd!()

      await fireEvent.press(screen.getByTestId('icon-close'))
      await refresh()

      expect(getTransform()).toEqual({scale: 1, translateX: 0, translateY: 0})

      // Saved values are reset too, so the next pinch starts from scratch.
      latestGesture('pinch').handlers.onUpdate!({scale: 2})
      await refresh()
      expect(getTransform().scale).toBe(2)
    })
  })

  describe('pinch to zoom', () => {
    it('scales the photo while pinching', async () => {
      await renderViewer()

      latestGesture('pinch').handlers.onUpdate!({scale: 2})
      await refresh()

      expect(getTransform().scale).toBe(2)
    })

    it('continues from the previous zoom level on the next pinch', async () => {
      await renderViewer()

      latestGesture('pinch').handlers.onUpdate!({scale: 2})
      latestGesture('pinch').handlers.onEnd!()
      latestGesture('pinch').handlers.onUpdate!({scale: 1.5})
      await refresh()

      expect(getTransform().scale).toBe(3)
    })

    it('clamps the zoom to at most 4x', async () => {
      await renderViewer()

      latestGesture('pinch').handlers.onUpdate!({scale: 4.5})
      latestGesture('pinch').handlers.onEnd!()
      await refresh()
      expect(getTransform().scale).toBe(4)

      latestGesture('pinch').handlers.onUpdate!({scale: 1})
      await refresh()
      expect(getTransform().scale).toBe(4)
    })

    it('springs back to 1x when zoomed out below the original size', async () => {
      await renderViewer()

      latestGesture('pinch').handlers.onUpdate!({scale: 0.5})
      latestGesture('pinch').handlers.onEnd!()
      await refresh()

      expect(getTransform().scale).toBe(1)
    })
  })

  describe('pan', () => {
    it('moves the photo while panning', async () => {
      await renderViewer()

      latestGesture('pan').handlers.onUpdate!({translationX: 10, translationY: 20})
      await refresh()

      expect(getTransform()).toMatchObject({translateX: 10, translateY: 20})
    })

    it('accumulates successive pans', async () => {
      await renderViewer()

      latestGesture('pan').handlers.onUpdate!({translationX: 10, translationY: 20})
      latestGesture('pan').handlers.onEnd!()
      latestGesture('pan').handlers.onUpdate!({translationX: 5, translationY: -5})
      await refresh()

      expect(getTransform()).toMatchObject({translateX: 15, translateY: 15})
    })
  })

  describe('double tap', () => {
    it('is configured as a two-tap gesture', async () => {
      await renderViewer()

      expect(latestGesture('tap').config.numberOfTaps).toBe(2)
    })

    it('zooms in to 2.5x when not zoomed', async () => {
      await renderViewer()

      latestGesture('tap').handlers.onEnd!()
      await refresh()

      expect(getTransform().scale).toBe(2.5)
    })

    it('resets zoom and pan when already zoomed', async () => {
      await renderViewer()
      latestGesture('pinch').handlers.onUpdate!({scale: 3})
      latestGesture('pinch').handlers.onEnd!()
      latestGesture('pan').handlers.onUpdate!({translationX: 30, translationY: 30})
      latestGesture('pan').handlers.onEnd!()

      latestGesture('tap').handlers.onEnd!()
      await refresh()

      expect(getTransform()).toEqual({scale: 1, translateX: 0, translateY: 0})
    })
  })
})
