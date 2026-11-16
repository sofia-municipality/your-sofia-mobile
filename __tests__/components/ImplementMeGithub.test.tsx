import React from 'react'
import {Linking} from 'react-native'
import {fireEvent, render, screen} from '@testing-library/react-native'
import {ImplementMeGithub} from '../../components/ImplementMeGithub'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  return {X: () => <View testID="icon-close" />}
})

jest.mock('../../components/GitHubIcon', () => {
  const {View} = require('react-native')
  return {
    GitHubIcon: ({size, color}: {size: number; color: string}) => (
      <View testID="github-icon" size={size} color={color} />
    ),
  }
})

const ISSUE_URL = 'https://github.com/sofia-municipality/your-sofia-mobile/issues/2'

describe('ImplementMeGithub', () => {
  let openURLSpy: jest.SpyInstance

  beforeEach(() => {
    openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
  })

  afterEach(() => {
    openURLSpy.mockRestore()
  })

  describe('icon mode', () => {
    async function openCallout() {
      await render(<ImplementMeGithub issueUrl={ISSUE_URL} />)
      await fireEvent.press(screen.getByTestId('github-icon'))
    }

    it('renders only the GitHub icon button initially', async () => {
      await render(<ImplementMeGithub issueUrl={ISSUE_URL} />)

      expect(screen.getAllByTestId('github-icon')).toHaveLength(1)
      expect(screen.queryByText('common.implementMeMessage')).not.toBeOnTheScreen()
    })

    it('applies a custom background color to the icon button', async () => {
      await render(<ImplementMeGithub issueUrl={ISSUE_URL} backgroundColor="#FEF3C7" />)

      expect(screen.getByTestId('github-icon').parent).toHaveStyle({backgroundColor: '#FEF3C7'})
    })

    it('opens the callout with the message and issue link on press', async () => {
      await openCallout()

      expect(screen.getByText('common.implementMeMessage')).toBeOnTheScreen()
      expect(screen.getByText(ISSUE_URL)).toBeOnTheScreen()
    })

    it('opens the issue URL and closes the callout when the link is pressed', async () => {
      await openCallout()

      await fireEvent.press(screen.getByText(ISSUE_URL))

      expect(openURLSpy).toHaveBeenCalledWith(ISSUE_URL)
      expect(screen.queryByText('common.implementMeMessage')).not.toBeOnTheScreen()
    })

    it('closes the callout when the close button is pressed', async () => {
      await openCallout()

      await fireEvent.press(screen.getByTestId('icon-close'))

      expect(screen.queryByText('common.implementMeMessage')).not.toBeOnTheScreen()
      expect(openURLSpy).not.toHaveBeenCalled()
    })

    it('closes the callout when the overlay is pressed', async () => {
      await openCallout()

      // message -> content -> callout -> overlay
      const overlay = screen.getByText('common.implementMeMessage').parent!.parent!.parent!
      await fireEvent.press(overlay)

      expect(screen.queryByText('common.implementMeMessage')).not.toBeOnTheScreen()
    })

    it('keeps the callout open when its body is pressed', async () => {
      await openCallout()

      const stopPropagation = jest.fn()
      await fireEvent.press(screen.getByText('common.implementMeMessage'), {stopPropagation})

      expect(stopPropagation).toHaveBeenCalled()
      expect(screen.getByText('common.implementMeMessage')).toBeOnTheScreen()
    })
  })

  describe('extended text mode', () => {
    it('renders a notification bar with the given text', async () => {
      await render(
        <ImplementMeGithub issueUrl={ISSUE_URL} extendedText="This feature is under development" />
      )

      expect(screen.getByText('This feature is under development')).toBeOnTheScreen()
      expect(screen.getByTestId('github-icon').props.size).toBe(24)
    })

    it('opens the repository (not the issue) when pressed', async () => {
      await render(
        <ImplementMeGithub issueUrl={ISSUE_URL} extendedText="This feature is under development" />
      )

      await fireEvent.press(screen.getByText('This feature is under development'))

      expect(openURLSpy).toHaveBeenCalledWith(
        'https://github.com/sofia-municipality/your-sofia-mobile/'
      )
      expect(screen.queryByText('common.implementMeMessage')).not.toBeOnTheScreen()
    })
  })
})
