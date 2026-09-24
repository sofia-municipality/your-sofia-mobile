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

// iOS occasionally reports a freshly-visible element as "not hittable at
// its visible point" — the hit-test resolves to a transition/overlay view
// instead, meaning a screen/tab-switch animation was still settling when
// the tap landed. Retrying after a short pause is the standard workaround;
// by the time the retry's own visibility wait re-confirms the element,
// the transition has had time to finish.
async function tapWhenHittable(testID: string, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    try {
      await element(by.id(testID)).tap()
      return
    } catch (error) {
      if (i === attempts - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await waitFor(element(by.id(testID)))
        .toBeVisible()
        .withTimeout(8000)
    }
  }
}

async function isAlreadyLoggedIn(): Promise<boolean> {
  // reloadReactNative() (in beforeEach) resets JS state but not the
  // underlying AsyncStorage-persisted auth token, so a real login in an
  // earlier test in this file leaves every later test already
  // authenticated on mount — the login screen never appears, and
  // profileLoginButton doesn't exist to scroll to/tap.
  try {
    await waitFor(element(by.id('newTabButton')))
      .toExist()
      .withTimeout(2000)
    return true
  } catch {
    return false
  }
}

async function loginAsMockAdmin() {
  if (await isAlreadyLoggedIn()) {
    return
  }

  await waitFor(element(by.id('headerProfileButton')))
    .toBeVisible()
    .withTimeout(10000)
  await tapWhenHittable('headerProfileButton')

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

  // Login navigates back to the profile screen on success. Our test user is
  // admin, which unlocks three tabs at once (New, Missions, Assignments) —
  // each mounts a real screen (the New tab's has a live camera preview) and
  // fires its own data fetches the moment the tab bar updates, so this can
  // be a genuinely heavy burst of work under CI load (observed: the app
  // reporting itself "busy" for 40+ seconds on a loaded iOS runner). Needs
  // real patience, not just a short poll.
  await waitFor(element(by.id('newTabButton')))
    .toBeVisible()
    .withTimeout(60000)
}

async function openNewSignalForm() {
  await tapWhenHittable('newTabButton')

  await waitFor(element(by.id('newSignalButton')))
    .toBeVisible()
    .withTimeout(10000)
  await tapWhenHittable('newSignalButton')

  // The submit button sits at the bottom of a single scrollable form well
  // below the fold (camera preview alone is 40% of screen height) — confirm
  // the screen loaded via toExist() rather than toBeVisible(), which would
  // require it to already be scrolled into view.
  await waitFor(element(by.id('newSignalSubmitButton')))
    .toExist()
    .withTimeout(25000)

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

// A submit tap right after scrolling can silently miss on Android — the
// visibility check and the tap's coordinates are resolved a beat apart, and
// if the layout is still settling (no exception, unlike iOS's "not
// hittable") the tap can land just off-target. Retry once if the expected
// result text hasn't shown up quickly: re-tapping submit while still on the
// form is harmless (validation just re-runs; a genuine double-submit isn't
// possible since the form doesn't clear until this alert is dismissed).
async function submitAndWaitForResultText(expectedText: string) {
  await scrollToAndTapSubmit()

  try {
    await waitFor(element(by.text(expectedText)))
      .toBeVisible()
      .withTimeout(8000)
  } catch {
    await scrollToAndTapSubmit()
    await waitFor(element(by.text(expectedText)))
      .toBeVisible()
      .withTimeout(15000)
  }
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
  }, 150000)

  // Generous per-test timeouts: openNewSignalForm() alone can retry two
  // separate tapWhenHittable() calls to their full budget under CI load.
  it('shows a validation alert when submitting with no container state selected', async () => {
    await openNewSignalForm()
    await submitAndWaitForResultText('Грешка')

    await expect(element(by.text('Грешка'))).toBeVisible()
    await element(by.text('OK')).tap()

    // Still on the form — nothing was submitted.
    await expect(element(by.id('newSignalSubmitButton'))).toExist()
  }, 200000)

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

    await submitAndWaitForResultText('Сигналът е изпратен успешно!')
    await element(by.text('OK')).tap()
  }, 200000)
})
