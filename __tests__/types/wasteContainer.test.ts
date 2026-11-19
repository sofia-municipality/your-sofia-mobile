import {CONTAINER_STATES, getStateColor} from '../../types/wasteContainer'
import {colors} from '../../styles/tokens'

describe('getStateColor', () => {
  it.each([
    ['full', colors.error],
    ['dirty', '#92400E'],
    ['damaged', colors.textPrimary],
    ['leaves', colors.success],
    ['maintenance', '#F97316'],
    ['bagged', colors.textPrimary],
    ['fallen', '#7C3AED'],
    ['bulkyWaste', colors.success],
  ])('colors the "%s" state', (state, color) => {
    expect(getStateColor(state)).toBe(color)
  })

  it('has an explicit color for every container state', () => {
    for (const state of CONTAINER_STATES) {
      expect([state, getStateColor(state)]).not.toEqual([state, colors.primary])
    }
  })

  it.each(['empty', 'forCollection', '', 'FULL'])(
    'falls back to the primary color for unknown state "%s"',
    (state) => {
      expect(getStateColor(state)).toBe(colors.primary)
    }
  )
})

describe('CONTAINER_STATES', () => {
  it('lists each state once', () => {
    expect(new Set(CONTAINER_STATES).size).toBe(CONTAINER_STATES.length)
  })
})
