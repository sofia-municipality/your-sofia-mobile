import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react-native'
import {MissionCreateModal} from '../../../forms/mission/MissionCreateModal'
import {MissionForm} from '../../../forms/mission/MissionForm'

jest.mock('react-native-maps', () => {
  const React = require('react')
  const {View} = require('react-native')
  return {
    __esModule: true,
    default: ({children}: any) => <View>{children}</View>,
    Marker: ({children}: any) => <View>{children}</View>,
  }
})

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('MissionCreateModal', () => {
  it('renders the mission creation title and subtitle', async () => {
    const {getByText} = await render(
      <MissionCreateModal
        visible
        onClose={() => undefined}
        onSubmit={() => Promise.resolve()}
        isSubmitting={false}
      />
    )

    expect(getByText('missions.form.createMissionTitle')).toBeTruthy()
    expect(getByText('missions.form.createMissionSubtitle')).toBeTruthy()
  })

  it('renders city object and location details in the mission form', async () => {
    const {getByText} = await render(
      <MissionForm
        onSubmit={() => Promise.resolve()}
        onCancel={() => undefined}
        cityObject={{name: 'Test city object'}}
        location={{latitude: 42.6977, longitude: 23.3219, address: 'Test address'}}
      />
    )

    expect(getByText('Test city object')).toBeTruthy()
    expect(getByText('Test address')).toBeTruthy()
  })
})

describe('MissionCreateModal behaviour', () => {
  type Props = Partial<React.ComponentProps<typeof MissionCreateModal>>

  async function renderModal(props: Props = {}) {
    const onClose = jest.fn()
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    await render(
      <MissionCreateModal
        visible
        onClose={onClose}
        onSubmit={onSubmit}
        isSubmitting={false}
        {...props}
      />
    )
    return {onClose, onSubmit}
  }

  function requestClose() {
    const [modal] = screen.container.queryAll((node) => node.props.onRequestClose !== undefined)
    return fireEvent(modal, 'requestClose')
  }

  it('renders nothing when hidden', async () => {
    await renderModal({visible: false})

    expect(screen.queryByText('missions.form.createMissionTitle')).not.toBeOnTheScreen()
  })

  it('closes from the close button', async () => {
    const {onClose} = await renderModal()

    await fireEvent.press(screen.getByRole('button', {name: 'common.close'}))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes from the form cancel button', async () => {
    const {onClose} = await renderModal()

    await fireEvent.press(screen.getByText('missions.form.cancel'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on the hardware back button', async () => {
    const {onClose} = await renderModal()

    await requestClose()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cannot be closed while submitting', async () => {
    const {onClose} = await renderModal({isSubmitting: true})

    expect(screen.getByRole('button', {name: 'common.close'})).toBeDisabled()
    await fireEvent.press(screen.getByRole('button', {name: 'common.close'}))
    await requestClose()

    expect(onClose).not.toHaveBeenCalled()
  })

  it('passes the signal, city object and location through to the form', async () => {
    await renderModal({
      signalId: '42',
      cityObject: {name: 'WC-001'},
      location: {address: 'ul. Shipka 1', latitude: 42.69, longitude: 23.32},
    })

    expect(screen.getByRole('link', {name: 'missions.form.openSignal'})).toBeOnTheScreen()
    expect(screen.getByText('WC-001')).toBeOnTheScreen()
    expect(screen.getByText('ul. Shipka 1')).toBeOnTheScreen()
    expect(screen.getByRole('button', {name: 'common.map'})).toBeOnTheScreen()
  })

  it('submits the form data', async () => {
    const {onSubmit} = await renderModal()
    const field = (key: string) => screen.getByPlaceholderText(`missions.form.${key}`)
    await fireEvent.changeText(field('titlePlaceholder'), 'Clean the park')
    await fireEvent.changeText(field('generalInstructionsPlaceholder'), 'Bring bags')
    await fireEvent.changeText(field('taskTitlePlaceholder'), 'Collect litter')
    await fireEvent.changeText(field('taskInstructionsPlaceholder'), 'Everything visible')
    await fireEvent.changeText(field('taskAcceptanceCriteriaPlaceholder'), 'No litter left')

    await fireEvent.press(screen.getByText('missions.form.create'))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({title: 'Clean the park', generalInstructions: 'Bring bags'}),
      undefined
    )
  })
})
