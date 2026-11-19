import React from 'react'
import {Linking} from 'react-native'
import {fireEvent, render, screen} from '@testing-library/react-native'
import TransportMap from '../../../../app/(tabs)/maps/transport-bpilot'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('react-native-webview', () => {
  const {View} = require('react-native')
  return {WebView: (props: object) => <View testID="webview" {...props} />}
})

const webview = () => screen.getByTestId('webview')

describe('TransportMap', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads the BPilot253 Sofia map with JavaScript, DOM storage, caching and fullscreen video', async () => {
    await render(<TransportMap />)

    expect(webview().props).toEqual(
      expect.objectContaining({
        source: {uri: 'https://map.bpilot253.com/#/sofia'},
        startInLoadingState: true,
        javaScriptEnabled: true,
        domStorageEnabled: true,
        cacheEnabled: true,
        allowsFullscreenVideo: true,
      })
    )
  })

  it('shows a translated loading state while the page loads', async () => {
    await render(<TransportMap />)

    await render(webview().props.renderLoading())

    expect(screen.getByText('map.loading')).toBeOnTheScreen()
    expect(screen.container.queryAll((node) => node.type === 'ActivityIndicator')).toHaveLength(1)
  })

  it('credits BPilot253 and opens its site from the link', async () => {
    await render(<TransportMap />)

    expect(screen.getByText(/Map and content provided by BPilot253 via/)).toBeOnTheScreen()
    await fireEvent.press(screen.getByText('bpilot253.com'))

    expect(Linking.openURL).toHaveBeenCalledWith('https://map.bpilot253.com')
  })

  it('logs page load errors instead of crashing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    await render(<TransportMap />)

    webview().props.onError({nativeEvent: {code: -2, description: 'offline'}})

    expect(warn).toHaveBeenCalledWith('WebView error: ', {code: -2, description: 'offline'})
  })
})
