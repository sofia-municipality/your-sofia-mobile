import {expect, by, device, element, waitFor} from 'detox'

describe('New signal redirect when logged out', () => {
  beforeAll(async () => {
    // The "new" tab is hidden from the tab bar for anonymous users (see
    // canAccessNewTab in app/(tabs)/_layout.tsx), so it can't be reached by
    // tapping through the UI here. Deep-linking straight to /new reaches the
    // same hub screen a permitted user would land on — and, since app/index.tsx
    // only runs its "what's new" redirect for the root route "/", this also
    // skips that dismissal entirely.
    await device.launchApp({
      newInstance: true,
      url: 'myapp://new',
      permissions: {notifications: 'YES', location: 'always'},
    })
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
