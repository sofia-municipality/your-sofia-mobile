describe('Login screen', () => {
  beforeAll(async () => {
    // Auto-grant the notifications permission so the native OS prompt
    // doesn't block the app from reaching the foreground/active state.
    await device.launchApp({permissions: {notifications: 'YES', location: 'always'}})
  })

  beforeEach(async () => {
    await device.reloadReactNative()

    // First launch shows a one-time "what's new" screen; dismiss it if present.
    // On Android its (async, remotely-checked) content can take a while to
    // mount, so this needs a generous timeout — a race here leaves the modal
    // covering the header when the next step tries to tap the profile icon.
    //
    // atIndex(0): the button's own accessibilityLabel and its inner Text's
    // text both equal "Напред", so by.label('Напред') matches two views
    // (the touchable and its label) — same ambiguity as "Вход" below.
    // Without it, Espresso can resolve the match to either view non-
    // deterministically, and toBeVisible()/tap() silently fail against the
    // wrong one, leaving the modal up for the rest of the test.
    try {
      await waitFor(element(by.label('Напред')).atIndex(0))
        .toBeVisible()
        .withTimeout(15000)
      await element(by.label('Напред')).atIndex(0).tap()
    } catch {
      // already dismissed in a prior test, nothing to do
    }

    // "profile" has no bottom tab (href: null in app/(tabs)/_layout.tsx) —
    // it's reached via the person icon in the home header. That icon's
    // accessibilityLabel is literally "profile.title" (a missing i18n key
    // in app/_layout.tsx — t('profile.title') has no matching translation).
    // Wait for it rather than tapping immediately: the "what's new" dismiss
    // above may still be mid-animation.
    await waitFor(element(by.label('profile.title')))
      .toBeVisible()
      .withTimeout(10000)
  })

  it('navigates from the profile tab to the login screen', async () => {
    await element(by.label('profile.title')).tap()

    // by.label('Вход') is ambiguous: the (tabs) group mounts all tabs
    // eagerly (lazy: false in app/(tabs)/_layout.tsx), so the missions
    // tab's own unauthenticated "Вход" text is present in the tree at the
    // same time as the profile screen's login button, regardless of tab
    // focus. atIndex() ordering across screens isn't stable, so target the
    // button by its unique testID instead.
    //
    // It also sits in the unauthenticated auth section below the profile
    // card — off-screen until the profile ScrollView is scrolled down.
    await waitFor(element(by.id('profileLoginButton')))
      .toBeVisible()
      .whileElement(by.id('profileScrollView'))
      .scroll(200, 'down')
    await element(by.id('profileLoginButton')).tap()

    await waitFor(element(by.label('Имейл')).atIndex(0))
      .toBeVisible()
      .withTimeout(10000)
    await expect(element(by.label('Имейл')).atIndex(0)).toBeVisible()
    await expect(element(by.label('Парола')).atIndex(0)).toBeVisible()
  })

  it('shows a validation alert when submitting the form empty', async () => {
    await element(by.label('profile.title')).tap()

    await waitFor(element(by.id('profileLoginButton')))
      .toBeVisible()
      .whileElement(by.id('profileScrollView'))
      .scroll(200, 'down')
    await element(by.id('profileLoginButton')).tap()

    // On the login screen itself, "Вход" also matches the screen's own
    // heading text as well as the submit button — target the submit
    // button by its unique testID instead of guessing label order.
    await waitFor(element(by.id('loginSubmitButton')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('loginSubmitButton')).tap()

    await waitFor(element(by.text('Грешка')))
      .toBeVisible()
      .withTimeout(10000)
    await expect(element(by.text('Грешка'))).toBeVisible()
    await expect(element(by.text('Моля, попълнете всички полета'))).toBeVisible()

    await element(by.text('OK')).tap()
  })
})
