import React from 'react'
import {render, screen, waitFor} from '@testing-library/react-native'
import Index from '../../app/index'
import {shouldShowWhatsNew} from '../../lib/whatsNew'

const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({replace: mockReplace}),
}))

jest.mock('../../lib/whatsNew', () => ({
  shouldShowWhatsNew: jest.fn(),
}))

const mockShouldShow = shouldShowWhatsNew as jest.Mock

describe('Index', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows a spinner while deciding where to go', async () => {
    mockShouldShow.mockReturnValue(new Promise(() => {}))

    await render(<Index />)

    expect(screen.container.queryAll((n) => n.type === 'ActivityIndicator')).toHaveLength(1)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("opens What's New after an update", async () => {
    mockShouldShow.mockResolvedValue(true)

    await render(<Index />)

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/whats-new'))
    expect(mockReplace).toHaveBeenCalledTimes(1)
  })

  it('opens the home tab when there is nothing new', async () => {
    mockShouldShow.mockResolvedValue(false)

    await render(<Index />)

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home'))
    expect(mockReplace).toHaveBeenCalledTimes(1)
  })
})
