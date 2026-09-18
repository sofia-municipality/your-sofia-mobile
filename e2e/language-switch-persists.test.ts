import {by, device, element, waitFor} from 'detox'

describe('Language switch persistence', () => {
  beforeAll(async () => {
    await device.launchApp({permissions: {notifications: 'YES', location: 'always'}})
  })

  it('persists the selected language across an app relaunch', async () => {
    // First launch shows a one-time "what's new" screen; dismiss it if present.
    try {
      await waitFor(element(by.id('whatsNewContinueButton')))
        .toBeVisible()
        .withTimeout(15000)
      await element(by.id('whatsNewContinueButton')).tap()
    } catch {
      // already dismissed in a prior test, nothing to do
    }

    await waitFor(element(by.id('headerProfileButton')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('headerProfileButton')).tap()

    // Bulgarian is the default language, so this label should read in
    // Bulgarian before the switch is touched. The menu item sits below the
    // fold, so scroll the profile screen down to reach it.
    await waitFor(element(by.text('Настройки за известия')))
      .toBeVisible()
      .whileElement(by.id('profileScrollView'))
      .scroll(200, 'down')

    // The language switch itself lives near the top of the same screen.
    // scrollTo('top') has been observed to hang on iOS when there's nothing
    // left to scroll, so scroll up incrementally instead — same pattern as
    // the scroll-down waits above.
    await waitFor(element(by.id('languageSwitchButton')))
      .toBeVisible()
      .whileElement(by.id('profileScrollView'))
      .scroll(200, 'up')
    await element(by.id('languageSwitchButton')).tap()

    await waitFor(element(by.text('Notification Settings')))
      .toBeVisible()
      .whileElement(by.id('profileScrollView'))
      .scroll(200, 'down')

    // A real relaunch (not just a JS reload), matching the issue's ask —
    // the language preference is read from AsyncStorage on native app boot
    // (see the languageDetector in i18n.ts), so this actually exercises
    // persistence rather than just in-memory state.
    await device.launchApp({newInstance: true, permissions: {notifications: 'YES'}})

    // The "what's new" dismissal from the first launch is already persisted
    // (see lib/whatsNew.ts), so it shouldn't reappear here — but dismiss it
    // defensively in case this ever runs as the very first test in the file.
    try {
      await waitFor(element(by.id('whatsNewContinueButton')))
        .toBeVisible()
        .withTimeout(10000)
      await element(by.id('whatsNewContinueButton')).tap()
    } catch {
      // not shown, nothing to do
    }

    await waitFor(element(by.id('headerProfileButton')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('headerProfileButton')).tap()

    await waitFor(element(by.text('Notification Settings')))
      .toBeVisible()
      .whileElement(by.id('profileScrollView'))
      .scroll(200, 'down')

    // Restore the default so later test files in the same run (sharing this
    // app install) aren't affected by this test's language change.
    await waitFor(element(by.id('languageSwitchButton')))
      .toBeVisible()
      .whileElement(by.id('profileScrollView'))
      .scroll(200, 'up')
    await element(by.id('languageSwitchButton')).tap()

    await waitFor(element(by.text('Настройки за известия')))
      .toBeVisible()
      .whileElement(by.id('profileScrollView'))
      .scroll(200, 'down')
  })
})
