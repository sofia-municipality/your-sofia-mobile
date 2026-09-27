import {expect, by, device, element} from 'detox'

describe('Home screen', () => {
  beforeAll(async () => {
    await device.launchApp({permissions: {notifications: 'YES', location: 'always'}})
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('App home screen loaded', async () => {
    try {
      await element(by.text('Напред')).tap()
    } catch (e) {
      console.warn('Getting started guide was probably already shown', e)
    }

    await expect(element(by.text('Начало'))).toBeVisible()
  })
})
