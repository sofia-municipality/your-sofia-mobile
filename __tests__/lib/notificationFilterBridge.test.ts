import type {LocationFilter} from '../../types/subscription'

type Bridge = typeof import('../../lib/notificationFilterBridge')

// The bridge keeps its listener in module state, so every test gets a fresh copy.
function loadBridge(): Bridge {
  let bridge!: Bridge
  jest.isolateModules(() => {
    bridge = require('../../lib/notificationFilterBridge')
  })
  return bridge
}

const district: LocationFilter = {
  filterType: 'district',
  district: {id: 1, name: 'Sredets', districtId: 1},
}
const point: LocationFilter = {
  filterType: 'point',
  latitude: 42.7,
  longitude: 23.3,
  radius: 500,
}

describe('notificationFilterBridge', () => {
  it('does nothing when no listener is registered', () => {
    const {emitNotificationFilter} = loadBridge()

    expect(() => emitNotificationFilter(district)).not.toThrow()
  })

  it('delivers an emitted filter to the registered listener', () => {
    const {registerNotificationFilterListener, emitNotificationFilter} = loadBridge()
    const listener = jest.fn()

    registerNotificationFilterListener(listener)
    emitNotificationFilter(district)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(district)
  })

  it('stops delivering after the listener unregisters', () => {
    const {registerNotificationFilterListener, emitNotificationFilter} = loadBridge()
    const listener = jest.fn()

    const unregister = registerNotificationFilterListener(listener)
    unregister()
    emitNotificationFilter(district)

    expect(listener).not.toHaveBeenCalled()
  })

  it('only keeps the most recently registered listener', () => {
    const {registerNotificationFilterListener, emitNotificationFilter} = loadBridge()
    const first = jest.fn()
    const second = jest.fn()

    registerNotificationFilterListener(first)
    registerNotificationFilterListener(second)
    emitNotificationFilter(point)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith(point)
  })

  it('does not let a stale unregister remove a newer listener', () => {
    const {registerNotificationFilterListener, emitNotificationFilter} = loadBridge()
    const first = jest.fn()
    const second = jest.fn()

    const unregisterFirst = registerNotificationFilterListener(first)
    registerNotificationFilterListener(second)
    unregisterFirst()
    emitNotificationFilter(point)

    expect(second).toHaveBeenCalledWith(point)
  })
})
