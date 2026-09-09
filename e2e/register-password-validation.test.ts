import {expect, by, device, element, waitFor} from 'detox'

// replaceText focuses the field and raises the keyboard on iOS, but sets the
// value directly without focus (no keyboard) on Android — so the keyboard
// covering the next field below is an iOS-only problem, and a bare
// tapReturnKey() would fail on Android since there's no return key shown.
async function dismissKeyboardIfShown(testID: string) {
  try {
    await element(by.id(testID)).tapReturnKey()
  } catch {
    // no keyboard was raised (Android), nothing to dismiss
  }
}

// Fixture passwords, not real credentials — ggignore comments silence
// GitGuardian's generic-password heuristic, which otherwise flags every one
// of these as a "secret".
const CASES = [
  {
    password: 'abc123', // ggignore
    confirmPassword: 'xyz999', // ggignore
    expectedMessage: 'Паролите не съвпадат',
  },
  {
    password: 'abc12', // ggignore
    confirmPassword: 'abc12', // ggignore
    expectedMessage: 'Паролата трябва да бъде поне 6 символа',
  },
  {
    password: 'ABCDEF1!', // ggignore
    confirmPassword: 'ABCDEF1!', // ggignore
    expectedMessage: 'Паролата трябва да съдържа малка буква',
  },
  {
    password: 'abcdef1!', // ggignore
    confirmPassword: 'abcdef1!', // ggignore
    expectedMessage: 'Паролата трябва да съдържа главна буква',
  },
]

describe('Register screen password validation', () => {
  beforeAll(async () => {
    await device.launchApp({permissions: {notifications: 'YES', location: 'always'}})
  })

  beforeEach(async () => {
    await device.reloadReactNative()

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

    await waitFor(element(by.id('registerNameInput')))
      .toBeVisible()
      .withTimeout(10000)
    // replaceText sets the value directly instead of simulating keystrokes —
    // typeText on each field in turn was flaky here: once the keyboard is up,
    // its on-screen position can shift where the *next* field's tap-to-focus
    // lands, and a stray tap on the keyboard itself gets read as real input
    // (glide-typing), corrupting whichever field still has focus.
    await element(by.id('registerNameInput')).replaceText('Test User')
    await element(by.id('registerEmailInput')).replaceText('test@example.com')
    // On iOS this leaves the keyboard up, covering the password field below.
    await dismissKeyboardIfShown('registerEmailInput')
  })

  it.each(CASES)(
    'shows "$expectedMessage" for password=$password confirmPassword=$confirmPassword',
    async ({password, confirmPassword, expectedMessage}) => {
      // No visibility wait before replaceText: unlike tap()/typeText(),
      // replaceText sets the value directly and doesn't require the field to
      // pass Espresso's visibility threshold — gating it behind toBeVisible()
      // made this flakier, not safer, since a transient overlay (e.g. a
      // keyboard-dismiss animation from the previous field still settling)
      // could hold up the wait for the full timeout even though replaceText
      // itself would have gone through fine.
      await element(by.id('registerPasswordInput')).replaceText(password)
      await element(by.id('registerConfirmPasswordInput')).replaceText(confirmPassword)
      // On iOS this leaves the keyboard up, which would otherwise cover the
      // submit button sitting in a footer outside the scroll area.
      await dismissKeyboardIfShown('registerConfirmPasswordInput')

      await element(by.id('registerSubmitButton')).tap()

      // Alert.alert renders a native dialog, not an RN view, so it has no
      // testID to target — text matching is the only option here.
      await waitFor(element(by.text(expectedMessage)))
        .toBeVisible()
        .withTimeout(15000)
      await expect(element(by.text('Грешка'))).toBeVisible()
      await expect(element(by.text(expectedMessage))).toBeVisible()

      await element(by.text('OK')).tap()
    }
  )
})
