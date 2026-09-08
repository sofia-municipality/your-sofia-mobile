import {expect, by, device, element, waitFor} from 'detox'

describe('Register screen', () => {
  beforeAll(async () => {
    await device.launchApp({permissions: {notifications: 'YES', location: 'always'}})
  })

  beforeEach(async () => {
    await device.reloadReactNative()

    // First launch shows a one-time "what's new" screen; dismiss it if present.
    try {
      await waitFor(element(by.label('Напред')).atIndex(0))
        .toBeVisible()
        .withTimeout(15000)
      await element(by.label('Напред')).atIndex(0).tap()
    } catch {
      // already dismissed in a prior test, nothing to do
    }

    // "profile" has no bottom tab — it's reached via the person icon in the
    // home header, whose accessibilityLabel is the raw (untranslated)
    // "profile.title" key.
    await waitFor(element(by.label('profile.title')))
      .toBeVisible()
      .withTimeout(10000)
  })

  it('shows a validation alert when submitting an empty form', async () => {
    await element(by.label('profile.title')).tap()

    // The login button sits below the profile card, off-screen until the
    // ScrollView is scrolled down.
    await waitFor(element(by.id('profileLoginButton')))
      .toBeVisible()
      .whileElement(by.id('profileScrollView'))
      .scroll(200, 'down')
    await element(by.id('profileLoginButton')).tap()

    await waitFor(element(by.id('loginRegisterLink')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('loginRegisterLink')).tap()

    // The register screen's heading and its submit button share the label
    // "Регистрация" (auth.register), same ambiguity as "Вход" on the login
    // screen — targeting by testID avoids relying on label match order.
    await waitFor(element(by.id('registerSubmitButton')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('registerSubmitButton')).tap()

    await waitFor(element(by.text('Грешка')))
      .toBeVisible()
      .withTimeout(10000)
    await expect(element(by.text('Грешка'))).toBeVisible()
    await expect(element(by.text('Моля, попълнете всички полета'))).toBeVisible()

    await element(by.text('OK')).tap()
  })
})
