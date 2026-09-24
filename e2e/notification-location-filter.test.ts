import {by, device, element, waitFor} from 'detox'

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

  // The add-location button sits below the category grid, which can push it
  // below the fold — confirm the screen loaded via toExist() rather than
  // toBeVisible(), and scroll to it separately before interacting.
  await waitFor(element(by.id('notificationsAddLocationButton')))
    .toExist()
    .withTimeout(15000)
}

describe('Notification location filter', () => {
  beforeAll(async () => {
    await device.launchApp({permissions: {notifications: 'YES', location: 'always'}})
  })

  beforeEach(async () => {
    await device.reloadReactNative()
    await dismissWhatsNewIfPresent()
  })

  it('adds and removes a district-type location filter as a local draft', async () => {
    await goToNotificationSettings()

    // The "add location" button is disabled while notifications are off.
    // Other test files share this mock server's persisted subscription
    // state, so don't assume it's on — check the switch and turn it on if
    // needed rather than relying on file execution order.
    const enableSwitch = element(by.id('notificationsEnableSwitch'))
    const switchAttrs = await enableSwitch.getAttributes()
    const notificationsEnabled = 'value' in switchAttrs ? Boolean(switchAttrs.value) : true
    if (!notificationsEnabled) {
      await enableSwitch.tap()
    }

    // This is a client-side draft change, so it doesn't rely on — or affect
    // — this mock server's persisted subscription state from other tests.
    await waitFor(element(by.id('notificationsAddLocationButton')))
      .toBeVisible()
      .whileElement(by.id('notificationsScrollView'))
      .scroll(200, 'down')
    await element(by.id('notificationsAddLocationButton')).tap()

    await waitFor(element(by.text('Административен район')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.text('Административен район')).tap()

    await waitFor(element(by.id('districtPickerRow-1')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('districtPickerRow-1')).tap()
    await element(by.id('districtPickerConfirmButton')).tap()

    await waitFor(element(by.id('notificationRemoveFilterButton-0')))
      .toBeVisible()
      .withTimeout(10000)

    await element(by.id('notificationRemoveFilterButton-0')).tap()

    await waitFor(
      element(by.text('Без ограничение по място — ще получаваш известия за цяла София'))
    )
      .toBeVisible()
      .withTimeout(10000)
  })
})
