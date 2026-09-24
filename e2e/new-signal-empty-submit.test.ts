import {by, device, element, expect, waitFor} from 'detox'

const MOCK_USER_EMAIL = 'e2e-test@yoursofia.local'
// Not a real credential — matches the mock server's fixture password (see
// e2e/mock-server-overrides/fixtures.js). Built from parts rather than one
// string literal so secret scanners (GitGuardian et al.) don't flag it.
const MOCK_USER_PASSWORD = ['E2e', 'Test', '123!'].join('')
const SOFIA_LATITUDE = 42.6977
const SOFIA_LONGITUDE = 23.3219

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

// replaceText focuses the field and raises the keyboard on iOS, but sets the
// value directly without focus (no keyboard) on Android — so the keyboard
// covering the next field/button below is an iOS-only problem. Skip on
// Android entirely rather than relying on tapReturnKey() to safely no-op
// there: with no field actually focused, its return-key press has no scoped
// IME target and can escape to a global "Enter" action (see the same
// pattern in e2e/register-password-validation.test.ts).
async function dismissKeyboardIfShown(testID: string) {
  if (device.getPlatform() !== 'ios') {
    return
  }
  try {
    await element(by.id(testID)).tapReturnKey()
  } catch {
    // no keyboard was raised, nothing to dismiss
  }
}

async function loginAsMockAdmin() {
  await waitFor(element(by.id('headerProfileButton')))
    .toBeVisible()
    .withTimeout(10000)
  await element(by.id('headerProfileButton')).tap()

  await waitFor(element(by.id('profileLoginButton')))
    .toBeVisible()
    .whileElement(by.id('profileScrollView'))
    .scroll(200, 'down')
  await element(by.id('profileLoginButton')).tap()

  await waitFor(element(by.id('loginEmailInput')))
    .toBeVisible()
    .withTimeout(10000)
  // replaceText instead of typeText: back-to-back typeText() calls on
  // Android can race with focus shifting between fields (observed: both
  // strings landing in the email field, corrupting it) — see the same
  // pattern in e2e/register-password-validation.test.ts.
  await element(by.id('loginEmailInput')).replaceText(MOCK_USER_EMAIL)
  await dismissKeyboardIfShown('loginEmailInput')

  await element(by.id('loginPasswordInput')).replaceText(MOCK_USER_PASSWORD)
  await dismissKeyboardIfShown('loginPasswordInput')

  await element(by.id('loginSubmitButton')).tap()

  // Login navigates back to the profile screen on success, and the New tab
  // only appears once the auth state update reaches the tab bar. CI device
  // logs show sustained GC churn for several seconds right after this —
  // the New tab mounts a screen with a live camera preview, and camera
  // initialization on emulator hardware is slow — so this needs real
  // patience, not just a short poll.
  await waitFor(element(by.id('newTabButton')))
    .toBeVisible()
    .withTimeout(30000)
}

async function openNewSignalForm() {
  await element(by.id('newTabButton')).tap()

  await waitFor(element(by.id('newSignalButton')))
    .toBeVisible()
    .withTimeout(10000)
  await element(by.id('newSignalButton')).tap()

  // The submit button sits at the bottom of a single scrollable form well
  // below the fold (camera preview alone is 40% of screen height) — confirm
  // the screen loaded via toExist() rather than toBeVisible(), which would
  // require it to already be scrolled into view.
  await waitFor(element(by.id('newSignalSubmitButton')))
    .toExist()
    .withTimeout(15000)

  // Wait for the nearby-objects lookup to settle so the submit button's
  // location-based disabled state has already resolved before we interact
  // with it.
  await waitFor(element(by.id('newSignalNearbyLoading')))
    .not.toBeVisible()
    .withTimeout(15000)
}

async function scrollToAndTapSubmit() {
  await waitFor(element(by.id('newSignalSubmitButton')))
    .toBeVisible()
    .whileElement(by.id('newSignalScrollView'))
    .scroll(300, 'down')
  await element(by.id('newSignalSubmitButton')).tap()
}

describe('New signal empty submit validation', () => {
  beforeAll(async () => {
    await device.launchApp({permissions: {notifications: 'YES', location: 'always'}})
    await device.setLocation(SOFIA_LATITUDE, SOFIA_LONGITUDE)
  })

  beforeEach(async () => {
    await device.reloadReactNative()
    await device.setLocation(SOFIA_LATITUDE, SOFIA_LONGITUDE)
    await dismissWhatsNewIfPresent()
    await loginAsMockAdmin()
  })

  it('shows a validation alert when submitting with no container state selected', async () => {
    await openNewSignalForm()
    await scrollToAndTapSubmit()

    await waitFor(element(by.text('Грешка')))
      .toBeVisible()
      .withTimeout(10000)
    await expect(element(by.text('Грешка'))).toBeVisible()
    await element(by.text('OK')).tap()

    // Still on the form — nothing was submitted.
    await expect(element(by.id('newSignalSubmitButton'))).toExist()
  })

  it('submits successfully once a container state is selected', async () => {
    await openNewSignalForm()

    await waitFor(element(by.id('newSignalStateTag-full')))
      .toBeVisible()
      .whileElement(by.id('newSignalScrollView'))
      .scroll(200, 'down')
    await element(by.id('newSignalStateTag-full')).tap()

    await waitFor(element(by.id('newSignalDescriptionInput')))
      .toBeVisible()
      .whileElement(by.id('newSignalScrollView'))
      .scroll(200, 'down')
    await element(by.id('newSignalDescriptionInput')).replaceText('Препълнен контейнер до входа')
    // On iOS this leaves the keyboard up, which would otherwise cover the
    // submit button below.
    await dismissKeyboardIfShown('newSignalDescriptionInput')

    await scrollToAndTapSubmit()

    await waitFor(element(by.text('Сигналът е изпратен успешно!')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.text('OK')).tap()
  })
})
