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
    // homeListView/homeMapView wrap a real, variable-length list of news
    // fetched from the production API — often taller than the viewport, so
    // Detox's default toBeVisible() (which requires 75% of the view's own
    // area on-screen) can fail even once the toggle has correctly rendered
    // the right branch. toExist() just confirms we're on the right branch,
    // which is all this test actually needs to verify.
    await waitFor(element(by.id('homeListView')))
      .toExist()
      .withTimeout(15000)

    await element(by.id('homeMapToggleButton')).tap()
    await waitFor(element(by.id('homeMapView')))
      .toExist()
      .withTimeout(20000)
    await expect(element(by.id('homeMapView'))).toExist()

    await element(by.id('homeMapToggleButton')).tap()
    await waitFor(element(by.id('homeListView')))
      .toExist()
      .withTimeout(20000)
    await expect(element(by.id('homeListView'))).toExist()
  })
})
