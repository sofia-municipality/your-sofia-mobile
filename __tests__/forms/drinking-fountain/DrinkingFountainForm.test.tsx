import React from 'react'
import {fireEvent, render, screen, userEvent, waitFor} from '@testing-library/react-native'
import {DrinkingFountainForm} from '../../../forms/drinking-fountain'
import {fetchCityDistricts, fetchFountainSources, fetchFountainStatuses} from '../../../lib/payload'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('../../../lib/payload', () => ({
  fetchCityDistricts: jest.fn(),
  fetchFountainSources: jest.fn(),
  fetchFountainStatuses: jest.fn(),
}))

const mockDistricts = fetchCityDistricts as jest.Mock
const mockSources = fetchFountainSources as jest.Mock
const mockStatuses = fetchFountainStatuses as jest.Mock

const districts = [
  {id: 1, districtId: 1, name: 'Sredets', code: 'SRD'},
  {id: 2, districtId: 2, name: 'Lozenets', code: 'LOZ'},
]
const sources = [{id: 10, name: 'City water supply'}]
const statuses = [{id: 20, name: 'Good condition'}]

const SELECTED = {backgroundColor: '#EEF2FF'}

const addressInput = () => screen.getByPlaceholderText('newCityObject.addressPlaceholder')

/** The two coordinate inputs have no placeholder or label; they render after the address input. */
function coordinateInputs() {
  const inputs = screen.container.queryAll(
    (node) => node.props.keyboardType === 'decimal-pad' && node.props.onChangeText !== undefined
  )
  return {latitude: inputs[0], longitude: inputs[1]}
}

type Props = Partial<React.ComponentProps<typeof DrinkingFountainForm>>

async function renderForm(props: Props = {}) {
  const onSubmit = jest.fn().mockResolvedValue(undefined)
  const onCancel = jest.fn()
  const element = (extra: Props = {}) => (
    <DrinkingFountainForm onSubmit={onSubmit} onCancel={onCancel} {...props} {...extra} />
  )
  await render(element())
  // Let the lookup requests settle.
  await waitFor(() => expect(mockStatuses).toHaveBeenCalled())
  return {onSubmit, onCancel, rerender: (extra: Props) => screen.rerender(element(extra))}
}

async function submit() {
  await fireEvent.press(screen.getByText('newCityObject.create'))
}

describe('DrinkingFountainForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDistricts.mockResolvedValue(districts)
    mockSources.mockResolvedValue(sources)
    mockStatuses.mockResolvedValue(statuses)
  })

  describe('defaults', () => {
    it('starts empty, working and centred on Sofia', async () => {
      await renderForm()

      expect(addressInput()).toHaveDisplayValue('')
      expect(screen.getByText('fountains.working').parent).toHaveStyle(SELECTED)
      expect(screen.getByText('fountains.notWorking').parent).not.toHaveStyle(SELECTED)
      expect(coordinateInputs().latitude).toHaveDisplayValue('42.6977')
      expect(coordinateInputs().longitude).toHaveDisplayValue('23.3219')
    })

    it('prefills the coordinates from the initial location', async () => {
      await renderForm({initialLocation: {latitude: 42.65, longitude: 23.38}})

      expect(coordinateInputs().latitude).toHaveDisplayValue('42.65')
      expect(coordinateInputs().longitude).toHaveDisplayValue('23.38')
    })
  })

  describe('GPS location', () => {
    it('follows location updates while the coordinates are untouched', async () => {
      const {rerender} = await renderForm({initialLocation: {latitude: 42.65, longitude: 23.38}})

      await rerender({initialLocation: {latitude: 42.7, longitude: 23.4}})

      expect(coordinateInputs().latitude).toHaveDisplayValue('42.7')
      expect(coordinateInputs().longitude).toHaveDisplayValue('23.4')
    })

    it('stops following once the user edits a coordinate', async () => {
      const {rerender} = await renderForm({initialLocation: {latitude: 42.65, longitude: 23.38}})

      await fireEvent.changeText(coordinateInputs().latitude, '42.61')
      await rerender({initialLocation: {latitude: 42.7, longitude: 23.4}})

      expect(coordinateInputs().latitude).toHaveDisplayValue('42.61')
      expect(coordinateInputs().longitude).toHaveDisplayValue('23.38')
    })
  })

  describe('lookups', () => {
    it('loads districts, sources and statuses', async () => {
      await renderForm()

      expect(await screen.findByText('Lozenets')).toBeOnTheScreen()
      expect(screen.getByText('fountains.district')).toBeOnTheScreen()
      expect(screen.getByText('City water supply')).toBeOnTheScreen()
      expect(screen.getByText('Good condition')).toBeOnTheScreen()
    })

    it('hides a picker whose lookup is empty', async () => {
      mockSources.mockResolvedValue([])
      await renderForm()

      await screen.findByText('Lozenets')
      expect(screen.queryByText('fountains.source')).not.toBeOnTheScreen()
    })

    it('hides a picker whose lookup fails and logs the error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockStatuses.mockRejectedValue(new Error('offline'))
      await renderForm()

      await screen.findByText('Lozenets')
      await waitFor(() =>
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load fountain statuses:',
          expect.objectContaining({message: 'offline'})
        )
      )
      expect(screen.queryByText('fountains.condition')).not.toBeOnTheScreen()
      consoleErrorSpy.mockRestore()
    })

    it('toggles a lookup selection', async () => {
      await renderForm()
      const lozenets = await screen.findByText('Lozenets')

      await fireEvent.press(lozenets)
      expect(screen.getByText('Lozenets').parent).toHaveStyle(SELECTED)

      await fireEvent.press(screen.getByText('Lozenets'))
      expect(screen.getByText('Lozenets').parent).not.toHaveStyle(SELECTED)
    })
  })

  describe('submitting', () => {
    it('requires an address', async () => {
      const {onSubmit} = await renderForm()

      await submit()

      expect(await screen.findByText('newCityObject.addressRequired')).toBeOnTheScreen()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('submits the entered values with the selected lookups', async () => {
      const {onSubmit} = await renderForm()
      await screen.findByText('Lozenets')

      await fireEvent.changeText(addressInput(), 'bul. Vitosha 1')
      await fireEvent.press(screen.getByText('fountains.notWorking'))
      await fireEvent.changeText(coordinateInputs().latitude, '42.69')
      await fireEvent.changeText(coordinateInputs().longitude, '23.32')
      await fireEvent.press(screen.getByText('Lozenets'))
      await fireEvent.press(screen.getByText('City water supply'))
      await fireEvent.press(screen.getByText('Good condition'))
      await submit()

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      expect(onSubmit.mock.calls[0][0]).toEqual({
        address: 'bul. Vitosha 1',
        isActive: false,
        location: {latitude: 42.69, longitude: 23.32},
        district: 2,
        source: 10,
        status: 20,
      })
    })

    it('omits deselected lookups', async () => {
      const {onSubmit} = await renderForm()
      await fireEvent.changeText(addressInput(), 'bul. Vitosha 1')
      await fireEvent.press(await screen.findByText('Lozenets'))
      await fireEvent.press(screen.getByText('Lozenets'))

      await submit()

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      expect(onSubmit.mock.calls[0][0].district).toBeUndefined()
    })

    it('calls onCancel', async () => {
      const {onCancel} = await renderForm()

      await fireEvent.press(screen.getByText('common.cancel'))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('locks the form while submitting', async () => {
      await renderForm({isSubmitting: true})
      await screen.findByText('Lozenets')

      expect(screen.getByText('newCityObject.submitting')).toBeDisabled()
      expect(screen.getByText('common.cancel')).toBeDisabled()
      expect(screen.getByText('fountains.notWorking')).toBeDisabled()
      expect(screen.getByText('Lozenets')).toBeDisabled()
      expect(addressInput().props.editable).toBe(false)
      expect(coordinateInputs().latitude.props.editable).toBe(false)
    })

    it('does not submit an out-of-range coordinate', async () => {
      const {onSubmit} = await renderForm()
      await fireEvent.changeText(addressInput(), 'bul. Vitosha 1')
      await fireEvent.changeText(coordinateInputs().latitude, '427')

      await submit()

      expect(onSubmit).not.toHaveBeenCalled()
    })

    // BUG: coordinates are re-parsed on every keystroke, so "42.7" typed by hand becomes 427.
    it.failing('lets the user type a decimal latitude', async () => {
      const user = userEvent.setup()
      await renderForm()

      await user.clear(coordinateInputs().latitude)
      await user.type(coordinateInputs().latitude, '42.7')

      expect(coordinateInputs().latitude).toHaveDisplayValue('42.7')
    })

    // BUG: location validation errors are never rendered, so an out-of-range coordinate
    // silently blocks the submit with no feedback to the user.
    it.failing('tells the user why an invalid coordinate blocks submission', async () => {
      const {onSubmit} = await renderForm()
      await fireEvent.changeText(addressInput(), 'bul. Vitosha 1')
      await fireEvent.changeText(coordinateInputs().latitude, '427')

      await submit()

      await waitFor(() => expect(coordinateInputs().latitude).toHaveStyle({borderColor: '#DC2626'}))
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })
})
