import React from 'react'
import {Text} from 'react-native'
import {fireEvent, render, screen} from '@testing-library/react-native'
import {AppErrorBoundary} from '../../components/AppErrorBoundary'

jest.mock('../../i18n', () => ({
  __esModule: true,
  default: {t: (key: string) => key},
}))

let mockShouldThrow = false

function MaybeCrash() {
  if (mockShouldThrow) {
    throw new Error('Boom')
  }
  return <Text>Healthy content</Text>
}

describe('AppErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    mockShouldThrow = false
    // React and the boundary both log caught errors; keep test output clean.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders children when nothing throws', async () => {
    await render(
      <AppErrorBoundary>
        <MaybeCrash />
      </AppErrorBoundary>
    )

    expect(screen.getByText('Healthy content')).toBeOnTheScreen()
    expect(screen.queryByText('common.error')).not.toBeOnTheScreen()
  })

  it('renders the fallback UI when a child throws', async () => {
    mockShouldThrow = true
    await render(
      <AppErrorBoundary>
        <MaybeCrash />
      </AppErrorBoundary>
    )

    expect(screen.getByText('common.error')).toBeOnTheScreen()
    expect(screen.getByText('common.unexpectedErrorMessage')).toBeOnTheScreen()
    expect(screen.getByText('common.retry')).toBeOnTheScreen()
    expect(screen.queryByText('Healthy content')).not.toBeOnTheScreen()
  })

  it('logs the caught error', async () => {
    mockShouldThrow = true
    await render(
      <AppErrorBoundary>
        <MaybeCrash />
      </AppErrorBoundary>
    )

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[AppErrorBoundary] Unhandled error:',
      expect.objectContaining({message: 'Boom'})
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[AppErrorBoundary] Error info:',
      expect.objectContaining({componentStack: expect.any(String)})
    )
  })

  it('re-renders children after retry once the error is resolved', async () => {
    mockShouldThrow = true
    await render(
      <AppErrorBoundary>
        <MaybeCrash />
      </AppErrorBoundary>
    )

    mockShouldThrow = false
    await fireEvent.press(screen.getByText('common.retry'))

    expect(screen.getByText('Healthy content')).toBeOnTheScreen()
    expect(screen.queryByText('common.error')).not.toBeOnTheScreen()
  })

  it('shows the fallback again if the child still throws after retry', async () => {
    mockShouldThrow = true
    await render(
      <AppErrorBoundary>
        <MaybeCrash />
      </AppErrorBoundary>
    )

    await fireEvent.press(screen.getByText('common.retry'))

    expect(screen.getByText('common.error')).toBeOnTheScreen()
  })

  it('derives an error state from a thrown error', () => {
    expect(AppErrorBoundary.getDerivedStateFromError()).toEqual({hasError: true})
  })
})
