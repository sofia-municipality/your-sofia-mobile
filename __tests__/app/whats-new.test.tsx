import React from 'react'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import WhatsNewScreen from '../../app/whats-new'
import {useWhatsNew} from '../../hooks/useWhatsNew'
import {markWhatsNewSeen} from '../../lib/whatsNew'

const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({replace: mockReplace}),
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('lucide-react-native', () => ({
  Newspaper: () => null,
}))

jest.mock('../../lib/whatsNew', () => ({
  markWhatsNewSeen: jest.fn(),
  getCurrentAppVersion: () => '2.4.0',
}))

jest.mock('../../hooks/useWhatsNew', () => ({
  useWhatsNew: jest.fn(),
}))

const mockUseWhatsNew = useWhatsNew as jest.Mock
const mockMarkSeen = markWhatsNewSeen as jest.Mock

const ITEMS = [
  {id: 1, title: 'Missions', description: 'Earn points for helping the city'},
  {id: 2, title: 'Drinking fountains', description: ''},
]

type HostElement = ReturnType<typeof screen.getByText>

function getBackdrop() {
  return screen.root!.children[0] as HostElement
}

describe('WhatsNewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWhatsNew.mockReturnValue({items: ITEMS, loading: false, error: null})
    mockMarkSeen.mockResolvedValue(undefined)
  })

  it('shows the app version and the heading', async () => {
    await render(<WhatsNewScreen />)

    expect(screen.getByText('whatsNew.version 2.4.0')).toBeOnTheScreen()
    expect(screen.getByText('whatsNew.title')).toBeOnTheScreen()
  })

  it('shows a spinner while the release notes load', async () => {
    mockUseWhatsNew.mockReturnValue({items: [], loading: true, error: null})

    await render(<WhatsNewScreen />)

    expect(screen.container.queryAll((n) => n.type === 'ActivityIndicator')).toHaveLength(1)
  })

  it('lists the release notes', async () => {
    await render(<WhatsNewScreen />)

    expect(screen.getByText('Missions')).toBeOnTheScreen()
    expect(screen.getByText('Earn points for helping the city')).toBeOnTheScreen()
    expect(screen.getByText('Drinking fountains')).toBeOnTheScreen()
    expect(screen.container.queryAll((n) => n.type === 'ActivityIndicator')).toHaveLength(0)
  })

  it('omits the description of a note without one', async () => {
    await render(<WhatsNewScreen />)

    const row = screen.getByText('Drinking fountains').parent!
    expect(row.children).toHaveLength(1)
  })

  it('marks the version as seen before opening the home tab', async () => {
    await render(<WhatsNewScreen />)

    await fireEvent.press(screen.getByRole('button', {name: 'whatsNew.continue'}))

    expect(mockMarkSeen).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home')
    expect(mockMarkSeen.mock.invocationCallOrder[0]).toBeLessThan(
      mockReplace.mock.invocationCallOrder[0]
    )
  })

  it('waits for the version to be saved before leaving', async () => {
    let resolveSave!: () => void
    mockMarkSeen.mockReturnValue(new Promise<void>((resolve) => (resolveSave = resolve)))
    await render(<WhatsNewScreen />)

    const pressed = fireEvent.press(screen.getByRole('button', {name: 'whatsNew.continue'}))
    await waitFor(() => expect(mockMarkSeen).toHaveBeenCalled())
    expect(mockReplace).not.toHaveBeenCalled()

    await act(async () => resolveSave())
    await pressed

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home')
  })

  it('continues when the backdrop is tapped', async () => {
    await render(<WhatsNewScreen />)

    await fireEvent.press(getBackdrop())

    expect(mockMarkSeen).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home')
  })
})
