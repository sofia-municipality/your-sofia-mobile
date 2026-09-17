import {expect, by, device, element, waitFor} from 'detox'

describe('Home news list/map toggle', () => {
  beforeAll(async () => {
    await device.launchApp({permissions: {notifications: 'YES', location: 'always'}})
  })

  beforeEach(async () => {
    await device.reloadReactNative()

    // First launch shows a one-time "what's new" screen; dismiss it if present.
    try {
      await waitFor(element(by.id('whatsNewContinueButton')))
        .toBeVisible()
        .withTimeout(15000)
      await element(by.id('whatsNewContinueButton')).tap()
    } catch {
      // already dismissed in a prior test, nothing to do
    }
  })

  it('toggles between the news list and map view', async () => {
    // Home is the initial tab route, so its content (list or map) is what's
    // on screen right after the what's-new dismissal above.
    await waitFor(element(by.id('homeListView')))
      .toBeVisible()
      .withTimeout(15000)

    await element(by.id('homeMapToggleButton')).tap()

    await waitFor(element(by.id('homeMapView')))
      .toBeVisible()
      .withTimeout(10000)
    await expect(element(by.id('homeMapView'))).toBeVisible()

    await element(by.id('homeMapToggleButton')).tap()

    await waitFor(element(by.id('homeListView')))
      .toBeVisible()
      .withTimeout(10000)
    await expect(element(by.id('homeListView'))).toBeVisible()
  })
})
