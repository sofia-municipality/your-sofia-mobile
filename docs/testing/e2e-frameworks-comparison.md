# End-to-end UI testing frameworks for React Native — comparison

Context: this app is built with **Expo** (managed workflow, `jest-expo` for unit tests, EAS Build/Update). That constraint rules some options in/out below. See [issue #136](https://github.com/sofia-municipality/your-sofia-mobile/issues/136) for the broader testing-gap research this document supports.

## Summary table

| Framework                  | Approach                                                                       | Expo managed support                                                                           | Setup effort | Flakiness               | Verdict                                                                                |
| -------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------ | ----------------------- | -------------------------------------------------------------------------------------- |
| **Maestro**                | Black-box, drives the OS accessibility layer                                   | Native — works against an EAS dev-client/preview build, no native code needed                  | Low          | Very low                | **Recommended**                                                                        |
| **Detox**                  | Gray-box, hooks into the JS thread to detect idle state                        | No — needs a release/dev-client binary with JS bundled; Expo requires the EAS Build workaround | High         | Very low (once working) | Viable fallback for complex sync-heavy flows                                           |
| **Appium** (+ WebdriverIO) | Black-box, WebDriver protocol over platform automation (UiAutomator2/XCUITest) | Yes, works against any built binary                                                            | High         | Medium                  | Viable if you need cross-platform reuse with a non-JS team or device-farm integrations |
| **Cavy**                   | In-app JS test runner, taps components via refs                                | Yes, pure JS                                                                                   | Low          | Medium                  | Not recommended — unmaintained                                                         |
| **Playwright / Cypress**   | Browser automation (WebDriver/CDP)                                             | N/A                                                                                            | —            | —                       | **Not applicable** — these drive browsers/webviews, not native iOS/Android UI          |

## Maestro

**What it is:** A YAML-flow-based E2E tool built specifically for mobile, from the makers of mobile.dev (now part of the Expo ecosystem's recommended tooling).

**Pros**

- Zero native build config — runs against any installed app (dev client, preview build, or production build)
- YAML flows are readable by non-engineers (PM/QA can write or review flows)
- Built-in smart waits, retries, and element-not-found tolerance — lowest reported flakiness of the options here
- First-class support for Expo; Expo's own docs recommend it for E2E as of SDK-era tooling in 2026
- Fast to get a first flow running (minutes, not days)
- Has a hosted "Maestro Cloud" option for device-farm runs, but works fine with local/CI emulators too

**Cons**

- Younger project than Detox/Appium — smaller plugin/ecosystem, less prior art for edge cases
- Being black-box, it can't assert on JS-level app state (e.g., "wait for this specific network idle" without an explicit visual cue) — you write to the UI, not the internals
- Per-flow execution is a bit slower than Detox for equivalent flows (reports of ~12–18s vs Detox's ~8–12s), though this rarely matters given how much less setup/CI time it costs overall
- Less mature support for deep native-module interactions (camera, biometrics) may need workarounds/mocking

## Detox

**What it is:** Wix's gray-box E2E framework, tightly coupled to the React Native/JS runtime so it can detect true idle state before asserting.

**Pros**

- Very low flakiness once configured — it literally waits for the JS thread, animations, and network calls to settle instead of guessing with timeouts
- Fastest per-test execution of the options here
- Mature, widely used in large RN codebases, good docs and community troubleshooting history
- Can assert deep app/JS state, not just what's on screen

**Cons**

- **Does not support Expo's managed workflow directly** — it requires a binary with the JS bundle compiled in, not a dev-server-served bundle. For this repo, that means an EAS Build profile dedicated to Detox (extra CI complexity to maintain)
- Heaviest setup of all options: native build config, per-platform driver setup (iOS simulator vs Android emulator have different footguns), and CI machine requirements (macOS runners for iOS)
- Upgrades to Expo SDK / RN version can break the native glue and require re-tuning
- Overkill for a team whose primary friction is "we have zero E2E tests today" — the payoff curve favors mature apps with complex sync/animation-heavy flows

## Appium (with WebdriverIO as the client)

**What it is:** The general mobile-automation standard — a WebDriver-protocol server that drives native automation frameworks (UiAutomator2 on Android, XCUITest on iOS). WebdriverIO is the most common JS client/test-runner layered on top (raw Appium clients exist for Python/Java/etc. too).

**Pros**

- Truly cross-platform and cross-app-framework — same skill set carries over to non-RN native apps or web
- Huge, long-established ecosystem: device farms (BrowserStack, Sauce Labs, AWS Device Farm) all speak Appium natively
- WebdriverIO adds a friendlier async API and Page Object patterns on top of raw Appium's session/promise handling
- Works against any built binary, Expo or not — no special managed-workflow issue like Detox has

**Cons**

- Selectors are the weak point for RN: elements are commonly matched only by `accessibilityLabel`, since RN doesn't expose rich locators the way native views do — this pushes extra `accessibilityLabel`/testID discipline onto every component
- Most moving parts of any option here: Appium server + driver processes + WebdriverIO config + device/emulator management
- Medium flakiness in practice — timing issues are common unless you invest in explicit waits
- Slower iteration loop than Maestro for a small team just trying to get started

## Cavy

**What it is:** A lightweight, pure-JS integration test framework that taps into component refs from inside the app itself, avoiding native tooling entirely.

**Pros**

- Pure JavaScript, no native build or driver setup — genuinely the fastest to bootstrap
- Runs the same on iOS/Android since it's driven from JS, not per-platform native automation

**Cons**

- **Effectively unmaintained** — latest release is several years old, thin community, no meaningful updates for modern RN/Expo/Fabric architecture
- Because it taps refs rather than driving real touch/accessibility events, it tests less realistically than the black-box tools (it can miss issues a real tap/gesture would surface)
- Not recommended for a new adoption in 2026

## Playwright / Cypress (not applicable)

Worth naming only to rule out: these are browser-automation tools (WebDriver/CDP for real browsers). They can drive a **React Native Web** build or a webview screen, but cannot drive native iOS/Android UI. Irrelevant unless this app grows a meaningful RN-Web surface that needs its own coverage — that would be a separate, additional tool, not a substitute for native E2E.

## Recommendation for this repo

**Adopt Maestro.** It's the only option that works cleanly against this app's Expo managed workflow without extra native build maintenance, has the lowest flakiness profile, and lets flows be authored quickly. Keep Detox in mind only if a specific flow later proves too timing-sensitive for Maestro's black-box waits — it can be added later without displacing Maestro for everything else. Skip Appium unless there's an existing device-farm/Appium investment elsewhere in the org to leverage, and skip Cavy outright.

Suggested first Maestro flows (matching the priorities from issue #136):

1. Login → land on home tab
2. Report a signal: pick category → attach photo → set location → submit → confirmation
3. Subscribe to notifications: pick categories + a location filter → save → reload → confirm persisted
4. Browse a map tab and open a waste container / signal marker detail

## Sources

- [The 3 Best React Native Testing Frameworks](https://maestro.dev/insights/best-react-native-testing-frameworks)
- [Detox vs. Maestro: Reducing Flakiness in React Native](https://maestro.dev/insights/detox-vs-maestro-reducing-flakiness-react-native)
- [Detox vs Maestro: Comparing Modern Mobile Testing Frameworks](https://www.getpanto.ai/blog/detox-vs-maestro)
- [Detox vs Maestro vs Appium: React Native E2E 2026](https://www.pkgpulse.com/blog/detox-vs-maestro-vs-appium-react-native-e2e-testing-2026)
- [4 Best Detox Alternatives for React Native Testing in 2026](https://getautonoma.com/blog/detox-alternatives-react-native)
- [e2e testing for Expo managed workflow · Issue #22363 · expo/expo](https://github.com/expo/expo/issues/22363)
- [Expo | Detox](https://wix.github.io/Detox/docs/19.x/guide/expo/)
- [Detox vs Appium: React Native Testing Decision Guide](https://getautonoma.com/blog/detox-vs-appium-react-native)
- [React Native Appium Testing: Complete Guide](https://getautonoma.com/blog/react-native-appium-testing-guide)
- [Test Automation in React Native apps using Appium and WebdriverIO](https://www.velotio.com/engineering-blog/test-automation-in-react-native-apps-using-appium-and-webdriverio)
- [Cavy — GitHub](https://github.com/pixielabs/cavy)
- [10 Best React Native Testing Tools in 2026 (Reviewed & Compared)](https://www.getpanto.ai/blog/react-native-testing-tools)
