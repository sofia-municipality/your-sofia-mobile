import React from 'react'
import {Linking} from 'react-native'
import {fireEvent, render, screen} from '@testing-library/react-native'
import BgsmetView from '../../../../app/(tabs)/maps/bgsmet-view'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('react-native-webview', () => {
  const {View} = require('react-native')
  return {WebView: (props: object) => <View testID="webview" {...props} />}
})

const webview = () => screen.getByTestId('webview')

describe('BgsmetView', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads the BGSMET site with JavaScript, DOM storage and caching enabled', async () => {
    await render(<BgsmetView />)

    expect(webview().props).toEqual(
      expect.objectContaining({
        source: {uri: 'https://www.bgsmet.com'},
        startInLoadingState: true,
        javaScriptEnabled: true,
        domStorageEnabled: true,
        cacheEnabled: true,
      })
    )
  })

  it('shows a translated loading state while the page loads', async () => {
    await render(<BgsmetView />)

    await render(webview().props.renderLoading())

    expect(screen.getByText('map.loading')).toBeOnTheScreen()
    expect(screen.container.queryAll((node) => node.type === 'ActivityIndicator')).toHaveLength(1)
  })

  it('credits BGSMET and opens its site from the link', async () => {
    await render(<BgsmetView />)

    expect(screen.getByText(/Map and content provided by BGSMET via/)).toBeOnTheScreen()
    await fireEvent.press(screen.getByText('bgsmet.com'))

    expect(Linking.openURL).toHaveBeenCalledWith('https://www.bgsmet.com')
  })

  it('logs page load errors instead of crashing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    await render(<BgsmetView />)

    webview().props.onError({nativeEvent: {code: -2, description: 'offline'}})

    expect(warn).toHaveBeenCalledWith('WebView error: ', {code: -2, description: 'offline'})
  })
})
