import {expect, by, device, element, waitFor} from 'detox'

async function dismissWhatsNewIfPresent() {
  try {
    await waitFor(element(by.id('whatsNewContinueButton')))
      .toBeVisible()
      .withTimeout(15000)
    await element(by.id('whatsNewContinueButton')).tap()
  } catch {
    // already dismissed in a prior test, nothing to do
  }
}

async function goToNotificationSettings() {
  await waitFor(element(by.id('headerProfileButton')))
    .toBeVisible()
    .withTimeout(10000)
  await element(by.id('headerProfileButton')).tap()

  await waitFor(element(by.id('profileNotificationSettingsItem')))
    .toBeVisible()
    .whileElement(by.id('profileScrollView'))
    .scroll(200, 'down')
  await element(by.id('profileNotificationSettingsItem')).tap()

  await waitFor(element(by.id('notificationsSaveButton')))
    .toBeVisible()
    .withTimeout(15000)
}

describe('Notification preferences save/persist', () => {
  beforeAll(async () => {
    await device.launchApp({permissions: {notifications: 'YES', location: 'always'}})
  })

  beforeEach(async () => {
    await device.reloadReactNative()
    await dismissWhatsNewIfPresent()
  })

  it('disables notifications, saves, and the setting persists across a reload', async () => {
    await goToNotificationSettings()

    await element(by.id('notificationsEnableSwitch')).tap()
    await expect(element(by.id('notificationsEnableSwitch'))).toHaveToggleValue(false)

    await element(by.id('notificationsSaveButton')).tap()

    await waitFor(element(by.text('Успех')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.text('OK')).tap()

    await device.reloadReactNative()
    await dismissWhatsNewIfPresent()
    await goToNotificationSettings()

    await expect(element(by.id('notificationsEnableSwitch'))).toHaveToggleValue(false)

    // Restore the baseline (enabled) state so it doesn't leak into other test files
    // that share this mock server's in-memory subscription state.
    await element(by.id('notificationsEnableSwitch')).tap()
    await element(by.id('notificationsSaveButton')).tap()
    await waitFor(element(by.text('Успех')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.text('OK')).tap()
  })

  it('selects a category and saves it successfully', async () => {
    await goToNotificationSettings()

    await expect(element(by.id('notificationsEnableSwitch'))).toHaveToggleValue(true)

    await element(by.text('Избери всички')).tap()
    await element(by.id('notificationsSaveButton')).tap()

    await waitFor(element(by.text('Успех')))
      .toBeVisible()
      .withTimeout(10000)
    await expect(element(by.text('Успех'))).toBeVisible()
    await element(by.text('OK')).tap()
  })
})
