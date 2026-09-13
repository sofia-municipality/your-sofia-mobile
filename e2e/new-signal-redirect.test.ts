import {expect, by, device, element, waitFor} from 'detox'

// A cold launch straight into a deep link races app/index.tsx's own
// "what's new" redirect: that redirect runs on every cold launch regardless
// of which route the app was opened on, and depending on which navigation
// resolves last, it can either leave the deep link's route alone or clobber
// it with the what's-new modal — nondeterministically, since it depends on
// JS-thread timing rather than a fixed delay. A single "check once, assume
// it's settled" wait can miss the modal showing up just after the check
// window closes, so poll instead: check for the intended screen, and if it
// isn't there yet, check for the modal and dismiss-and-retry.
async function landOnNewHub(maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await waitFor(element(by.id('newSignalButton')))
        .toBeVisible()
        .withTimeout(6000)
      return
    } catch {
      // not there yet — see if the what's-new modal won this round
    }

    try {
      await waitFor(element(by.id('whatsNewContinueButton')))
        .toBeVisible()
        .withTimeout(6000)
      await element(by.id('whatsNewContinueButton')).tap()
      // Its dismiss handler does its own router.replace('/(tabs)/home') —
      // wait for a real screen to land before re-issuing the deep link, so
      // the two navigations don't collide again immediately.
      await waitFor(element(by.id('headerProfileButton')))
        .toBeVisible()
        .withTimeout(10000)
      await device.openURL({url: 'myapp://new'})
    } catch {
      // neither showed up in this window — loop and try again
    }
  }

  // Let the final attempt's own error surface if we still haven't landed.
  await waitFor(element(by.id('newSignalButton')))
    .toBeVisible()
    .withTimeout(10000)
}

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
  })

  it('redirects to the login screen when tapping "new signal" while logged out', async () => {
    await landOnNewHub()
    await element(by.id('newSignalButton')).tap()

    await waitFor(element(by.id('loginEmailInput')))
      .toBeVisible()
      .withTimeout(10000)
    await expect(element(by.id('loginEmailInput'))).toBeVisible()
    await expect(element(by.id('loginPasswordInput'))).toBeVisible()
  })
})
