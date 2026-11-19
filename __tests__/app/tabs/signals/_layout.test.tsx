import React from 'react'
import {render} from '@testing-library/react-native'
import SignalsLayout from '../../../../app/(tabs)/signals/_layout'

type Options = Record<string, unknown>
type OptionsFactory = (props: {route: {params?: Record<string, unknown>}}) => Options

const mockScreens: Record<string, Options | OptionsFactory> = {}
let mockStackProps: {screenOptions: Options}

jest.mock('expo-router', () => {
  const Stack = (props: {children: React.ReactNode; screenOptions: Options}) => {
    mockStackProps = props
    return props.children
  }
  Stack.Screen = function Screen(props: {name: string; options: Options | OptionsFactory}) {
    mockScreens[props.name] = props.options
    return null
  }
  return {Stack}
})

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

function detailOptions(params?: Record<string, unknown>) {
  return (mockScreens['[id]'] as OptionsFactory)({route: {params}})
}

beforeEach(async () => {
  await render(<SignalsLayout />)
})

describe('SignalsLayout', () => {
  it('hides the stack header on the list, where the tab header is shown', () => {
    expect(mockStackProps.screenOptions).toEqual({headerShown: false})
    expect(mockScreens.index).toEqual({title: 'signals.title'})
  })

  it('titles the detail screen with the signal number', () => {
    expect(detailOptions({id: '42'})).toEqual({
      title: 'signals.form.headerView #42',
      headerShown: true,
      headerTitleAlign: 'left',
      presentation: 'card',
    })
  })

  it('leaves the number out when the route has no id', () => {
    expect(detailOptions({}).title).toBe('signals.form.headerView')
  })

  it('copes with a route without params', () => {
    expect(detailOptions(undefined).title).toBe('signals.form.headerView')
  })
})
