import {expect, by, device, element, waitFor} from 'detox'

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
    // Bulgarian before the switch is touched.
    await waitFor(element(by.text('Настройки за известия')))
      .toBeVisible()
      .withTimeout(10000)

    await element(by.id('languageSwitchButton')).tap()
    await expect(element(by.text('Notification Settings'))).toBeVisible()

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
      .withTimeout(10000)
    await expect(element(by.text('Notification Settings'))).toBeVisible()

    // Restore the default so later test files in the same run (sharing this
    // app install) aren't affected by this test's language change.
    await element(by.id('languageSwitchButton')).tap()
    await expect(element(by.text('Настройки за известия'))).toBeVisible()
  })
})
