import {expect, by, device, element, waitFor} from 'detox'

describe('Home news list/map toggle', () => {
  beforeAll(async () => {
    await device.launchApp({permissions: {notifications: 'YES', location: 'always'}})
    // The home screen's news fetch hits the real production API, which can
    // be slow from CI. Detox's default synchronization blocks matcher/action
    // calls until the app reports itself idle (no pending network activity),
    // which would otherwise stall this test's waits on that unrelated fetch
    // instead of letting our own explicit withTimeout()s do their job.
    await device.setURLBlacklist(['.*your\\.sofia\\.bg.*'])
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

    // A single tap reliably flips the underlying isMapView state — verified
    // on video from a prior failing run. What varies a lot under CI load is
    // how long the native map view (Google Maps on Android) takes to
    // actually finish laying out and satisfy Detox's visibility check, up to
    // 20+ seconds in observed runs — so this only needs patience, not a
    // retry. Retrying the tap risks toggling the state right back before the
    // slow-to-render view ever gets a chance to be detected.
    await element(by.id('homeMapToggleButton')).tap()
    await waitFor(element(by.id('homeMapView')))
      .toBeVisible()
      .withTimeout(30000)
    await expect(element(by.id('homeMapView'))).toBeVisible()

    await element(by.id('homeMapToggleButton')).tap()
    await waitFor(element(by.id('homeListView')))
      .toBeVisible()
      .withTimeout(30000)
    await expect(element(by.id('homeListView'))).toBeVisible()
  }, 150000)
})
