import React from 'react'
import {render} from '@testing-library/react-native'
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
  it('renders the mission creation title and subtitle', () => {
    const {getByText} = render(
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

  it('renders city object and location details in the mission form', () => {
    const {getByText} = render(
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
