describe('Login screen', () => {
  beforeAll(async () => {
    await device.launchApp()
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('navigates from the profile tab to the login screen', async () => {
    await element(by.text('Профил')).atIndex(0).tap()
    await element(by.label('Вход')).atIndex(0).tap()

    await expect(element(by.label('Имейл'))).toBeVisible()
    await expect(element(by.label('Парола'))).toBeVisible()
  })

  it('shows a validation alert when submitting the form empty', async () => {
    await element(by.text('Профил')).atIndex(0).tap()
    await element(by.label('Вход')).atIndex(0).tap()

    // Submit button on the login screen shares the same label as the
    // profile screen's "log in" button (both are t('auth.login')).
    await element(by.label('Вход')).atIndex(0).tap()

    await expect(element(by.text('Грешка'))).toBeVisible()
    await expect(element(by.text('Моля, попълнете всички полета'))).toBeVisible()

    await element(by.text('OK')).tap()
  })
})
