import {renderHook} from '@testing-library/react-native'
import {useFrameworkReady} from '../../hooks/useFrameworkReady'

describe('useFrameworkReady', () => {
  afterEach(() => {
    delete window.frameworkReady
  })

  it('notifies the framework once mounted', async () => {
    window.frameworkReady = jest.fn()

    await renderHook(() => useFrameworkReady())

    expect(window.frameworkReady).toHaveBeenCalledTimes(1)
  })

  it('notifies the framework again after every render', async () => {
    window.frameworkReady = jest.fn()

    const {rerender} = await renderHook(() => useFrameworkReady())
    await rerender({})

    expect(window.frameworkReady).toHaveBeenCalledTimes(2)
  })

  it('does nothing when no framework callback is registered', async () => {
    await expect(renderHook(() => useFrameworkReady())).resolves.toBeDefined()
  })
})
