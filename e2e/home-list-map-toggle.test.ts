import {expect, by, device, element, waitFor} from 'detox'

async function tapToggleAndWaitFor(targetTestId: string, fallbackTestId: string) {
  await element(by.id('homeMapToggleButton')).tap()

  try {
    await waitFor(element(by.id(targetTestId)))
      .toBeVisible()
      .withTimeout(8000)
  } catch {
    // The home screen keeps fetching news from the real API in the
    // background, and on a busy CI runner the very first tap right after
    // that content settles can occasionally be swallowed. Only retry if the
    // toggle demonstrably didn't register (still showing the previous view)
    // — otherwise the target view is just slow to reach full visibility and
    // retapping would toggle it right back off.
    await expect(element(by.id(fallbackTestId))).toBeVisible()
    await element(by.id('homeMapToggleButton')).tap()
    await waitFor(element(by.id(targetTestId)))
      .toBeVisible()
      .withTimeout(15000)
  }
}

describe('Home news list/map toggle', () => {
  beforeAll(async () => {
    await device.launchApp({permissions: {notifications: 'YES', location: 'always'}})
    // The home screen's news fetch hits the real production API, which can
    // be slow or briefly unreachable from CI. Detox's default synchronization
    // blocks all matcher/action calls until the app reports itself idle
    // (no pending network activity), so a slow fetch there would otherwise
    // stall this test's waits indefinitely rather than letting our own
    // explicit withTimeout()s do their job.
    await device.disableSynchronization()
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

    await tapToggleAndWaitFor('homeMapView', 'homeListView')
    await expect(element(by.id('homeMapView'))).toBeVisible()

    await tapToggleAndWaitFor('homeListView', 'homeMapView')
    await expect(element(by.id('homeListView'))).toBeVisible()
  })
})
