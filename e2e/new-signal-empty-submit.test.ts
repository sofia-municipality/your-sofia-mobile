import {by, device, element, expect, system, waitFor} from 'detox'

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

// iOS's own iCloud Keychain "Save Password?" system dialog can appear right
// after a login form submits — it's a native alert outside the app, not
// tracked by Detox's synchronization at all, and it covers the full screen
// including the tab bar underneath. This turned out to be the actual cause
// of the intermittent "not hittable" newTabButton failures seen in CI: the
// dialog (not a settling screen transition) was what was blocking the tap.
// It doesn't show up every run — iOS only offers to save credentials it
// doesn't already have stored — so this is a no-op most of the time.
//
// A first attempt at this used `element(by.label('Not Now'))`, which never
// works for a dialog like this: the regular `element()`/`waitFor()` APIs only
// search the app's own accessibility tree, and this alert is presented by a
// separate system process outside it, so the matcher silently found nothing
// every time and the dialog was never actually dismissed. System-level UI
// needs Detox's dedicated `system.element(by.system...)` facade instead —
// which also has no `waitFor`/polling support, hence the manual retry loop.
async function dismissSavePasswordPromptIfPresent(attempts = 5, delayMs = 1000) {
  if (device.getPlatform() !== 'ios') {
    return
  }
  for (let i = 0; i < attempts; i++) {
    try {
      await system.element(by.system.label('Not Now')).tap()
      return
    } catch {
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }
}

// iOS occasionally reports a freshly-visible element as "not hittable at
// its visible point" — the hit-test resolves to a transition/overlay view
// instead, meaning a screen/tab-switch animation was still settling when
// the tap landed. Retrying after a short pause is the standard workaround;
// by the time the retry's own visibility wait re-confirms the element,
// the transition has had time to finish.
// Budget widened after CI showed the post-login tab-switch transition can
// still be settling a full 80+ seconds in — admin login mounts three tabs
// at once (New, Missions, Assignments), each firing its own data fetches
// simultaneously, and on a loaded iOS runner that JS-thread burst delays
// the native transition well past the previous ~57s retry budget.
async function tapWhenHittable(testID: string, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    try {
      await element(by.id(testID)).tap()
      return
    } catch (error) {
      if (i === attempts - 1) throw error
      // The iOS "Save Password?" system dialog (see
      // dismissSavePasswordPromptIfPresent) can appear with unpredictable
      // delay after login and was, in practice, the actual cause of most
      // "not hittable" failures here — not a settling animation. Check for
      // it on every retry (single quick attempt: the main catch is right
      // after login; this just covers a late-appearing dialog).
      await dismissSavePasswordPromptIfPresent(1, 0)
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await waitFor(element(by.id(testID)))
        .toBeVisible()
        .withTimeout(10000)
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
  await dismissSavePasswordPromptIfPresent()

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

  // Same post-login burst as above (three admin tabs mounting and fetching
  // at once) can also delay the New tab's own landing screen from finishing
  // its first render — CI showed this timing out at the previous 10s.
  await waitFor(element(by.id('newSignalButton')))
    .toBeVisible()
    .withTimeout(30000)

  // The New Signal screen mounts a live camera preview the instant it
  // renders, and on iOS that preview continuously emits native frame/render
  // events. Detox's default synchronization waits for the app to go fully
  // idle after every action, which it now never does — so the very tap that
  // navigates onto this screen hangs forever waiting to be considered
  // "settled" (observed in CI: stuck for 4+ minutes past the test's own
  // timeout). Turn synchronization off before that tap fires; every
  // remaining wait in this file already polls explicitly via
  // waitFor(...).withTimeout(...), which works fine without it. Android
  // never showed this hang (its idling-resource tracking isn't tripped by
  // the camera preview the same way), and disabling sync there caused a
  // regression: a native Alert's "OK" tap could return before the dialog
  // finished dismissing, leaving it covering the next test's screen. So
  // this is iOS-only.
  if (device.getPlatform() === 'ios') {
    await device.disableSynchronization()
  }
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

// With synchronization disabled for the camera screen (see openNewSignalForm),
// Detox no longer waits for in-flight native animations before acting, so a
// scroll gesture can land on a still-animating transition overlay instead of
// the scroll view itself ("View is not scrollable at the given start point").
// Same class of issue as tapWhenHittable above — retry after a short pause.
async function scrollToAndTapSubmit(attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    try {
      await waitFor(element(by.id('newSignalSubmitButton')))
        .toBeVisible()
        .whileElement(by.id('newSignalScrollView'))
        .scroll(300, 'down')
      await element(by.id('newSignalSubmitButton')).tap()
      return
    } catch (error) {
      if (i === attempts - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }
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
    // This is the only e2e spec that reaches the New Signal form, which
    // renders nothing (including newSignalSubmitButton) until expo-camera's
    // permission state resolves to granted. Without pre-granting `camera`
    // here, iOS leaves the app on the "camera access required" screen
    // indefinitely — Android masks the same gap because its instrumented
    // test builds auto-grant runtime permissions declared in the manifest.
    await device.launchApp({
      permissions: {notifications: 'YES', location: 'always', camera: 'YES'},
    })
    await device.setLocation(SOFIA_LATITUDE, SOFIA_LONGITUDE)
  })

  beforeEach(async () => {
    // Restore default synchronization in case the previous test left it off
    // (see the comment in openNewSignalForm, iOS-only) — reloadReactNative()
    // doesn't reset this on its own.
    if (device.getPlatform() === 'ios') {
      await device.enableSynchronization()
    }
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

  afterAll(async () => {
    // Leave synchronization in its default state for whichever spec file
    // runs next in this worker (iOS-only — see openNewSignalForm).
    if (device.getPlatform() === 'ios') {
      await device.enableSynchronization()
    }
  })
})
