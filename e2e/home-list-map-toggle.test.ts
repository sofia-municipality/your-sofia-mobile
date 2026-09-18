import {expect, by, device, element, waitFor} from 'detox'

async function isVisible(testId: string): Promise<boolean> {
  try {
    await expect(element(by.id(testId))).toBeVisible()
    return true
  } catch {
    return false
  }
}

async function tapToggleAndWaitFor(targetTestId: string, fallbackTestId: string) {
  await element(by.id('homeMapToggleButton')).tap()

  try {
    await waitFor(element(by.id(targetTestId)))
      .toBeVisible()
      .withTimeout(10000)
    return
  } catch {
    // fall through — diagnose below rather than fail immediately
  }

  // The home screen keeps fetching news from the real API in the
  // background, and on a busy CI runner the very first tap right after
  // that content settles can occasionally be swallowed. Only retry the tap
  // if it demonstrably didn't register (still showing the previous view) —
  // if the previous view is already gone, the target view is just slow to
  // reach full visibility (e.g. the native map still initializing) and
  // retapping would toggle it right back off.
  if (await isVisible(fallbackTestId)) {
    await element(by.id('homeMapToggleButton')).tap()
  }

  await waitFor(element(by.id(targetTestId)))
    .toBeVisible()
    .withTimeout(20000)
}

describe('Home news list/map toggle', () => {
  beforeAll(async () => {
    await device.launchApp({permissions: {notifications: 'YES', location: 'always'}})
    // The home screen's news fetch hits the real production API, which can
    // be slow from CI. Detox's default synchronization blocks matcher/action
    // calls until the app reports itself idle (no pending network activity),
    // which would otherwise stall this test's waits on that unrelated fetch
    // instead of letting our own explicit withTimeout()s do their job.
    // setURLBlacklist (rather than disableSynchronization) excludes just
    // that endpoint from idle-tracking without disabling synchronization
    // for taps/animations, which can deadlock if the app is already busy
    // with that same pending request when synchronization is toggled.
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

    await tapToggleAndWaitFor('homeMapView', 'homeListView')
    await expect(element(by.id('homeMapView'))).toBeVisible()

    await tapToggleAndWaitFor('homeListView', 'homeMapView')
    await expect(element(by.id('homeListView'))).toBeVisible()
  })
})
