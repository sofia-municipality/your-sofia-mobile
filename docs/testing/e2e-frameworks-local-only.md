# Local-only end-to-end UI testing frameworks for React Native

Scope: this document covers only frameworks that can run their **entire test cycle on your own machine/CI runner against a local emulator or simulator**, with no dependency on a cloud device-farm or hosted testing service to function. (Some of these frameworks _also_ offer an optional paid cloud product — noted where relevant — but none of them require it.)

Explicitly out of scope because they are cloud-service-dependent, not local frameworks: **Maestro Cloud**, **BrowserStack App Automate**, **Sauce Labs**, **AWS Device Farm**. These are device-farm products that some of the frameworks below can optionally plug into — they aren't testing frameworks themselves and none of them are covered here.

Context: this app is Expo (managed workflow), which affects setup effort below. See [issue #136](https://github.com/sofia-municipality/your-sofia-mobile/issues/136) for the broader testing-gap research this supports, and `docs/testing/e2e-frameworks-comparison.md` for the fuller comparison this document is narrowed from.

## Summary table

| Framework                     | Approach                                                 | Runs fully local?                                                                      | Expo managed support                                           | Setup effort | Flakiness               |
| ----------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------ | ----------------------- |
| **Maestro** (CLI, local mode) | Black-box, drives the OS accessibility layer             | Yes — `maestro test` runs against a local emulator/simulator/device, no cloud required | Native — works against an EAS dev-client/preview build         | Low          | Very low                |
| **Detox**                     | Gray-box, hooks into the JS thread to detect idle state  | Yes — always runs against a local simulator/emulator; has no cloud offering of its own | No — needs the EAS Build workaround to get a JS-bundled binary | High         | Very low (once working) |
| **Appium** (+ WebdriverIO)    | Black-box, WebDriver protocol over UiAutomator2/XCUITest | Yes — point it at a local emulator/simulator; device farms are optional, not required  | Yes, works against any built binary                            | High         | Medium                  |
| **Cavy**                      | In-app JS test runner, taps components via refs          | Yes — pure JS, nothing external at all                                                 | Yes, pure JS                                                   | Low          | Medium                  |

## Maestro (local mode)

**Pros**

- `maestro test` runs entirely against your local emulator/simulator/USB-connected device — no account, no network call required for the test run itself
- Zero native build config — works against any installed app (dev client, preview, or production build)
- YAML flows are readable by non-engineers
- Built-in smart waits/retries give the lowest flakiness of the local options
- First-class Expo support — works with an EAS dev-client or preview build with no extra native wiring

**Cons**

- Still needs a real emulator/simulator running locally (as do all options here) — this isn't a headless/no-device tool
- Less mature ecosystem than Detox/Appium for edge cases
- Being black-box, can't assert on internal JS state, only what's rendered
- Slightly slower per-flow execution than Detox (~12–18s vs ~8–12s)

## Detox

**Pros**

- Runs 100% locally by design — there's no cloud product to opt into even if you wanted one, so there's no accidental drift toward hosted infra
- Very low flakiness once configured — waits for real JS-thread/animation/network idle instead of guessing with timeouts
- Fastest per-test execution of the local options
- Mature, large community, deep troubleshooting history

**Cons**

- **Does not support Expo's managed workflow directly** — needs a binary with the JS bundle compiled in, which for this repo means a dedicated EAS Build profile just for Detox
- Heaviest setup: native build config, per-platform driver quirks, macOS runner requirement for iOS in CI
- SDK/RN upgrades can break the native glue and need re-tuning
- Overkill weight for a team with zero E2E today

## Appium (with WebdriverIO)

**Pros**

- Runs fully locally against a local emulator/simulator with no account or hosted service required — device farms are an optional later add-on, never a dependency
- Cross-platform, reusable skill set beyond just this RN app
- Large ecosystem and long track record
- WebdriverIO gives a friendlier async API and Page Object pattern over raw Appium

**Cons**

- RN elements are mostly matched only by `accessibilityLabel` — pushes accessibility-prop discipline onto every component
- Most moving parts of any local option: Appium server process + platform driver + WebdriverIO config + emulator management
- Medium flakiness unless you invest in explicit waits
- Slowest to get a first flow running of the options here

## Cavy

**Pros**

- Pure JavaScript, runs inside the app itself — no server process, no driver, no external dependency of any kind, local or cloud
- Fastest to bootstrap of all four
- Identical behavior on iOS/Android since it's JS-driven, not per-platform native automation

**Cons**

- **Effectively unmaintained** — last meaningful release is years old, no support for modern RN/Fabric/Expo tooling
- Taps component refs rather than real touch/accessibility events, so it validates less realistically than the other three
- Not recommended for new adoption despite being fully local

## Recommendation for this repo

Unchanged from the broader comparison: **Maestro**, run locally against an EAS dev-client or preview build. It's the only option here with both zero required cloud dependency _and_ zero Expo-managed-workflow friction. Detox and Appium are viable fully-local fallbacks if a specific flow later needs Detox's gray-box synchronization or Appium's cross-platform reuse, but bring meaningfully more setup weight. Skip Cavy regardless of its simplicity — it's unmaintained.
