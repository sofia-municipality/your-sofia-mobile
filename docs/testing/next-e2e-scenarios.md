# Candidate E2E scenarios (easiest next additions)

`e2e/login.e2e.js` already covers profile → login navigation and the empty-form
validation alert. The candidates below are ranked by how little new risk they
add: no network mocking, no auth state, and (where possible) the same
matcher/ambiguity patterns already solved in `login.e2e.js`.

All of these can live in the existing `beforeAll`/`beforeEach` from
`login.e2e.js` (app launch + "what's new" dismissal + wait for the profile
icon), so no new setup is required.

## 1. Forgot-password: empty submit shows validation alert (easiest)

Single-field, purely client-side validation (`app/auth/forgot-password.tsx:27-31`)
— no network call happens before the alert fires. Same shape as the existing
empty-login test, just one field instead of two.

```
profile.title (tap) → Вход (atIndex(0), tap) → Забравена парола? (tap)
  → Изпрати (tap, no input)
  → expect "Грешка" visible
  → expect "Въведете имейл адреса си, за да получите инструкции за нова парола." visible
  → OK (tap)
```

Labels used: `Забравена парола?` (`auth.forgotPassword`), `Изпрати`
(`auth.forgotPasswordButton`), error body `auth.enterEmailToResetPassword`.
Watch for the same kind of duplicate-label ambiguity as `Вход`/`Напред` if the
submit button label is ever reused elsewhere on the screen — it isn't today,
so no `atIndex` should be needed here.

## 2. Register: empty submit shows validation alert

Mirrors the login test almost exactly. `app/auth/register.tsx:31-34` checks
all four fields client-side before touching the network.

```
profile.title (tap) → Вход (atIndex(0), tap) → Регистрация (link, tap)
  → Регистрация (submit button — likely atIndex(1), same ambiguity as
    login's "Вход": the screen heading and the submit button share the
    label auth.register) → tap
  → expect "Грешка" visible
  → expect "Моля, попълнете всички полета" visible
  → OK (tap)
```

Confirm the heading-vs-button `atIndex` empirically with
`detox test --loglevel verbose`, same as the existing login test's comment
explains for "Вход".

## 3. Register: password confirmation / strength validations

Same screen, still zero network calls — each check short-circuits before
`register()` is called (`app/auth/register.tsx:36-58`). Four independent
cases, all reusable with one helper that fills name/email and varies the two
password fields:

| Password   | Confirm    | Expected alert body                                |
| ---------- | ---------- | -------------------------------------------------- |
| `abc123`   | `xyz999`   | `Паролите не съвпадат`                             |
| `abc12`    | `abc12`    | `Паролата трябва да бъде поне 6 символа`           |
| `ABCDEF1!` | `ABCDEF1!` | `auth.passwordNeedsLowercase` (raw key, see below) |
| `abcdef1!` | `abcdef1!` | `auth.passwordNeedsUppercase` (raw key, see below) |

`register.tsx:46-58` calls `t('auth.passwordNeedsLowercase')`,
`passwordNeedsUppercase`, `passwordNeedsDigit`, and `passwordNeedsSpecialChar`,
but none of the four keys exist in `translations/bg.ts` or `translations/en.ts`
— confirmed by grep, zero hits. i18next has no matching resource so it
renders the literal key string in the `Alert`, the same class of bug the
existing login test's comment calls out for `profile.title`. Two options:
assert on the literal fallback text (documents the bug but is brittle if the
fallback format ever changes), or fix the missing translations first and
assert on the real Bulgarian copy. Prefer the latter — it's a one-line
addition per locale file and removes a user-facing bug, not just a test
inconvenience.

## 4. Unauthenticated user is redirected from “new signal”

This verifies the access-control boundary without requiring a valid account or
an API response. The New tab is hidden for ordinary unauthenticated users, so
start from a route or entry point that exposes the action in the test build.
The login screen receives a `returnTo` parameter and should preserve the
intended destination after authentication.

```
open New/report entry point → Нов сигнал (tap)
  → expect login screen
  → expect email and password fields
```

If the hidden tab cannot be opened through the UI, cover the same behavior with
a deep link to `/(tabs)/new/new-signal`. This is a useful smoke test for route
guards and should not assert that login succeeds unless the test environment
has a dedicated account fixture.

## 5. Home news list/map toggle

The toggle is client-side and has an explicit accessibility label. It can run
with the existing home screen setup, although the list/map content depends on
the news fixture or a reachable API.

```
Home → expect news list or loading state
  → See map (tap)
  → expect map view
  → See list (tap)
  → expect news list or empty state
```

Use the translated accessibility labels `common.seeMap` and `common.seeList`
rather than matching the button's visible text. Add a retry assertion when the
API is intentionally unavailable: the error state must show the `common.retry`
control and pressing it must trigger another fetch.

## 6. Notification preferences can be edited and saved

This is the highest-value authenticated settings flow. It needs a registered
push token and an API fixture that accepts the subscription update; otherwise
the expected result is the explicit “no push token” error rather than success.

```
Profile → Настройки за известия (tap)
  → toggle notifications off
  → tap Запази
  → expect success alert
  → OK
  → reload screen
  → expect notifications remain disabled
```

Add a second case with notifications enabled and one category selected. Verify
that the saved request contains the selected category and that disabling
notifications clears categories and location filters before saving. The toggle
is a native `Switch`, so locate it by its accessible role/value rather than by
screen coordinates.

## 7. Add and remove a notification location filter

This exercises the picker-to-settings bridge, which is a separate state path
from category selection. Use a deterministic district fixture so the scenario
does not depend on map permissions or the device's current location.

```
Profile → Настройки за известия → Добави местоположение
  → Район (tap)
  → select a district → confirm
  → expect district filter on the settings screen
  → remove the filter
  → expect it is no longer shown
```

Repeat with an area or point only on a device configuration that can grant
location permission. The important assertions are that the selected filter is
returned to the parent screen and that removing it updates the unsaved draft.

## 8. Change language and verify it persists after relaunch

The language switch is available from the profile screen and persists through
AsyncStorage. This should be a separate test from content/API localization so
it remains deterministic even when news is unavailable.

```
Profile → language switch (tap) → English
  → expect profile labels in English
  → relaunch app
  → open Profile
  → expect profile labels still in English
  → switch back to Български
```

Use one stable label from each language for the assertions, such as the profile
screen title and notification settings label. Clear app storage in setup only
if the runner does not already reset the app between scenarios; clearing it
inside the test would defeat the persistence check.

## 9. New-signal form blocks an empty submission

After authentication, the new-signal screen should reject a submission without
a category, description, or location before attempting the API call. This is a
good candidate for a fully offline test if the screen can be reached with a
pre-seeded session.

```
authenticated New tab → Нов сигнал (tap)
  → submit with all fields empty
  → expect validation alert
  → OK (tap)
  → remain on the new-signal form
```

Record the exact Bulgarian alert copy after the first run rather than guessing
it from the translation key. Also assert that no success confirmation appears
and that the route does not navigate away. A companion case should fill the
description but omit the location to verify the location-specific validation.

## 10. Open a signal from the list and return

This covers the list-to-detail route and back navigation using a seeded signal,
without testing signal creation or mutation.

```
Signals tab → tap a signal row
  → expect signal detail title, status, and description
  → back
  → expect the signals list
```

Give the seeded row an accessibility label that includes its title and status,
as the list already composes that label. Include one fixture with an update so
the detail screen's update indicator is covered as well. Keep the fixture
stable; selecting the first server-returned row makes this scenario flaky when
data ordering changes.
