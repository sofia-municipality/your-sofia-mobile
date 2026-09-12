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

    // On a cold launch, this deep link can race with app/index.tsx's own
    // "what's new" redirect (which only checks the root route "/") — and on
    // iOS that redirect has won, showing the modal instead of landing on
    // /new. Dismiss it if present, then re-issue the deep link so the test
    // still starts from the intended screen either way.
    try {
      await waitFor(element(by.id('whatsNewContinueButton')))
        .toBeVisible()
        .withTimeout(10000)
      await element(by.id('whatsNewContinueButton')).tap()
      await device.openURL({url: 'myapp://new'})
    } catch {
      // what's new wasn't shown — the deep link already landed correctly
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
