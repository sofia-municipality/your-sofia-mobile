import {by, device, element, expect, waitFor} from 'detox'

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

describe('Signal list -> detail -> back', () => {
  beforeAll(async () => {
    await device.launchApp({permissions: {notifications: 'YES', location: 'always'}})
  })

  beforeEach(async () => {
    await device.reloadReactNative()
    await dismissWhatsNewIfPresent()
  })

  it('opens the fixture signal from the list and navigates back', async () => {
    await waitFor(element(by.id('signalsTabButton')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('signalsTabButton')).tap()

    // Defaults to "mine", which is empty for an anonymous/unauthenticated
    // device — switch to "all signals" to see the seeded fixture.
    await waitFor(element(by.id('signalsFilterAllChip')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('signalsFilterAllChip')).tap()

    await waitFor(element(by.id('signalListItem-1')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('signalListItem-1')).tap()

    // toExist() rather than toBeVisible(): the detail screen is a scrollable
    // form (title, status badges, lifecycle banner, container state, ...
    // above the description), and on a smaller emulator viewport this text
    // can fail the default 75%-of-own-area visibility check even though it
    // genuinely rendered — confirmed via the CI screenshot, same class of
    // issue as the home list/map toggle test.
    await waitFor(element(by.text('E2E Fixture Signal')))
      .toExist()
      .withTimeout(10000)
    await expect(element(by.text('E2E Fixture Signal'))).toExist()
    await expect(
      element(by.text('Seeded fixture signal for Detox E2E tests — do not delete.'))
    ).toExist()

    await element(by.id('signalDetailBackButton')).tap()

    await waitFor(element(by.id('signalListItem-1')))
      .toExist()
      .withTimeout(10000)
    await expect(element(by.id('signalListItem-1'))).toExist()
  })
})
