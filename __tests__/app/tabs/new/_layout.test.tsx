import React from 'react'
import {render} from '@testing-library/react-native'
import NewLayout, {unstable_settings} from '../../../../app/(tabs)/new/_layout'

const mockScreens: {name: string; options: object}[] = []

jest.mock('expo-router', () => {
  const Stack = ({children}: {children: React.ReactNode}) => children
  Stack.Screen = function Screen(props: {name: string; options: object}) {
    mockScreens.push(props)
    return null
  }
  return {Stack}
})

jest.mock('react-i18next', () => {
  const t = (key: string) => key
  return {useTranslation: () => ({t})}
})

describe('NewLayout', () => {
  beforeEach(() => {
    mockScreens.length = 0
  })

  it('anchors the stack on the chooser screen', () => {
    expect(unstable_settings).toEqual({anchor: 'index'})
  })

  it('registers every screen of the tab with a translated header title', async () => {
    await render(<NewLayout />)

    expect(mockScreens).toEqual([
      {name: 'index', options: {title: 'new.title', headerShown: true}},
      {name: 'new-signal', options: {title: 'newSignal.title', headerShown: true}},
      {name: 'new-city-object', options: {title: 'newCityObject.title', headerShown: true}},
      {name: 'bulk-photo-upload', options: {title: 'bulkPhotoUpload.title', headerShown: true}},
    ])
  })
})
