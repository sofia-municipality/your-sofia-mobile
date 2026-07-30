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
