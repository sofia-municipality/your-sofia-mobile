import {act, renderHook} from '@testing-library/react-native'
import {BellActionProvider, useBellAction} from '../../contexts/BellActionContext'

describe('BellActionContext', () => {
  it('does nothing outside a provider', async () => {
    const action = jest.fn()
    const {result} = await renderHook(() => useBellAction())

    await act(async () => {
      result.current.registerBellAction(action)
      result.current.triggerBellAction()
    })

    expect(action).not.toHaveBeenCalled()
  })

  it('does nothing when no action is registered', async () => {
    const {result} = await renderHook(() => useBellAction(), {wrapper: BellActionProvider})

    expect(() => result.current.triggerBellAction()).not.toThrow()
  })

  it('runs the registered action when the bell is pressed', async () => {
    const action = jest.fn()
    const {result} = await renderHook(() => useBellAction(), {wrapper: BellActionProvider})

    await act(async () => result.current.registerBellAction(action))
    await act(async () => result.current.triggerBellAction())

    expect(action).toHaveBeenCalledTimes(1)
  })

  it('does not run the action while registering it', async () => {
    const action = jest.fn()
    const {result} = await renderHook(() => useBellAction(), {wrapper: BellActionProvider})

    await act(async () => result.current.registerBellAction(action))

    expect(action).not.toHaveBeenCalled()
  })

  it('runs only the most recently registered action', async () => {
    const homeAction = jest.fn()
    const signalsAction = jest.fn()
    const {result} = await renderHook(() => useBellAction(), {wrapper: BellActionProvider})

    await act(async () => result.current.registerBellAction(homeAction))
    await act(async () => result.current.registerBellAction(signalsAction))
    await act(async () => result.current.triggerBellAction())

    expect(signalsAction).toHaveBeenCalledTimes(1)
    expect(homeAction).not.toHaveBeenCalled()
  })

  it('keeps registerBellAction stable so screens can depend on it', async () => {
    const {result} = await renderHook(() => useBellAction(), {wrapper: BellActionProvider})
    const register = result.current.registerBellAction

    await act(async () => result.current.registerBellAction(jest.fn()))

    expect(result.current.registerBellAction).toBe(register)
  })
})
