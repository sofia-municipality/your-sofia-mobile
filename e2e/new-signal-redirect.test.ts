import {expect, by, device, element, waitFor} from 'detox'

describe('New signal redirect when logged out', () => {
  beforeAll(async () => {
    // The "new" tab is hidden from the tab bar for anonymous users (see
    // canAccessNewTab in app/(tabs)/_layout.tsx), so it can't be reached by
    // tapping through the UI here. Deep-linking straight to /new reaches the
    // same hub screen a permitted user would land on.
    await device.launchApp({
      newInstance: true,
      url: 'myapp://new',
      permissions: {notifications: 'YES', location: 'always'},
    })

    // First launch shows a one-time "what's new" screen; dismiss it if present.
    try {
      await waitFor(element(by.id('whatsNewContinueButton')))
        .toBeVisible()
        .withTimeout(15000)
      await element(by.id('whatsNewContinueButton')).tap()
      // Its dismiss handler does its own router.replace('/(tabs)/home') —
      // wait for a real screen to land before re-issuing the deep link, so
      // the two navigations don't collide.
      await waitFor(element(by.id('headerProfileButton')))
        .toBeVisible()
        .withTimeout(10000)
      await device.openURL({url: 'myapp://new'})
    } catch {
      // already dismissed in a prior test, nothing to do
    }
  })

  it('redirects to the login screen when tapping "new signal" while logged out', async () => {
    await waitFor(element(by.id('newSignalButton')))
      .toBeVisible()
      .withTimeout(15000)
    await element(by.id('newSignalButton')).tap()

    await waitFor(element(by.id('loginEmailInput')))
      .toBeVisible()
      .withTimeout(10000)
    await expect(element(by.id('loginEmailInput'))).toBeVisible()
    await expect(element(by.id('loginPasswordInput'))).toBeVisible()
  })
})
