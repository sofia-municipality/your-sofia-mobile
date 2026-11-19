import React from 'react'
import {render, screen} from '@testing-library/react-native'
import NotFoundScreen from '../../app/+not-found'

const mockScreenOptions = jest.fn()

jest.mock('expo-router', () => {
  const {View} = require('react-native')
  const StackMock = () => null
  StackMock.Screen = function Screen({options}: {options: unknown}) {
    mockScreenOptions(options)
    return null
  }
  return {
    Stack: StackMock,
    Link: ({href, children}: {href: string; children: React.ReactNode}) => (
      <View testID="link" accessibilityHint={href}>
        {children}
      </View>
    ),
  }
})

describe('NotFoundScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('titles the screen', async () => {
    await render(<NotFoundScreen />)

    expect(mockScreenOptions).toHaveBeenCalledWith({title: 'Oops!'})
  })

  it('explains that the screen does not exist', async () => {
    await render(<NotFoundScreen />)

    expect(screen.getByText("This screen doesn't exist.")).toBeOnTheScreen()
  })

  it('links back to the home screen', async () => {
    await render(<NotFoundScreen />)

    const link = screen.getByTestId('link')
    expect(link.props.accessibilityHint).toBe('/')
    expect(link).toHaveTextContent('Go to home screen!')
  })
})
