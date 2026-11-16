import React, {createRef} from 'react'
import {fireEvent, render, screen, userEvent, waitFor} from '@testing-library/react-native'
import {WasteContainerForm} from '../../../forms/waste-container'
import type {WasteContainer} from '../../../types/wasteContainer'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

const container: WasteContainer = {
  id: 'c-1',
  publicNumber: 'WC-001',
  location: [23.33, 42.69],
  latitude: 42.69,
  longitude: 23.33,
  address: 'ul. Shipka 1',
  capacityVolume: 3.2,
  capacitySize: 'big',
  binCount: 4,
  wasteType: 'glass',
  status: 'active',
  notes: 'Behind the school',
  createdAt: '2025-06-01T12:00:00Z',
  updatedAt: '2026-01-10T12:00:00Z',
}

const PLACEHOLDERS = {
  publicNumber: 'newCityObject.publicNumberPlaceholder',
  capacityVolume: '1.0',
  binCount: '1',
  latitude: '42.6977',
  longitude: '23.3219',
  address: 'newCityObject.addressPlaceholder',
  notes: 'newCityObject.notesPlaceholder',
}

const SELECTED = {backgroundColor: '#EEF2FF'}

const input = (field: keyof typeof PLACEHOLDERS) => screen.getByPlaceholderText(PLACEHOLDERS[field])

async function renderForm(props: Partial<React.ComponentProps<typeof WasteContainerForm>> = {}) {
  const onSubmit = jest.fn().mockResolvedValue(undefined)
  const onCancel = jest.fn()
  await render(
    <WasteContainerForm onSubmit={onSubmit} onCancel={onCancel} isEditing canEdit {...props} />
  )
  return {onSubmit, onCancel}
}

async function pressSubmit(label = 'newCityObject.create') {
  await fireEvent.press(screen.getByText(label))
}

describe('WasteContainerForm', () => {
  describe('creating a container', () => {
    it('starts with sensible defaults centred on Sofia', async () => {
      await renderForm()

      expect(input('publicNumber')).toHaveDisplayValue('')
      expect(input('capacityVolume')).toHaveDisplayValue('1')
      expect(input('binCount')).toHaveDisplayValue('1')
      expect(input('latitude')).toHaveDisplayValue('42.6977')
      expect(input('longitude')).toHaveDisplayValue('23.3219')
      expect(input('address')).toHaveDisplayValue('')
      expect(input('notes')).toHaveDisplayValue('')
      expect(screen.getByText('wasteContainers.type.general').parent).toHaveStyle(SELECTED)
      expect(screen.getByText('wasteContainers.size.standard').parent).toHaveStyle(SELECTED)
      expect(screen.getByText('newCityObject.locationInfo')).toBeOnTheScreen()
      expect(screen.getByText('newCityObject.create')).toBeOnTheScreen()
    })

    it('offers every waste type and capacity size', async () => {
      await renderForm()

      for (const type of [
        'general',
        'recyclables',
        'organic',
        'glass',
        'paper',
        'plastic',
        'metal',
        'trashCan',
        'bulkyWasteZones',
      ]) {
        expect(screen.getByText(`wasteContainers.type.${type}`)).toBeOnTheScreen()
      }
      for (const size of ['tiny', 'small', 'standard', 'big', 'industrial']) {
        expect(screen.getByText(`wasteContainers.size.${size}`)).toBeOnTheScreen()
      }
    })

    it('submits the entered values', async () => {
      const {onSubmit} = await renderForm()

      await fireEvent.changeText(input('publicNumber'), 'WC-123')
      await fireEvent.press(screen.getByText('wasteContainers.type.paper'))
      await fireEvent.press(screen.getByText('wasteContainers.size.industrial'))
      await fireEvent.changeText(input('capacityVolume'), '2.5')
      await fireEvent.changeText(input('binCount'), '3')
      await fireEvent.changeText(input('latitude'), '42.7')
      await fireEvent.changeText(input('longitude'), '23.35')
      await fireEvent.changeText(input('address'), 'bul. Bulgaria 1')
      await fireEvent.changeText(input('notes'), 'Near the bus stop')
      await pressSubmit()

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      expect(onSubmit.mock.calls[0][0]).toEqual({
        publicNumber: 'WC-123',
        wasteType: 'paper',
        capacityVolume: 2.5,
        capacitySize: 'industrial',
        binCount: 3,
        location: {latitude: 42.7, longitude: 23.35, address: 'bul. Bulgaria 1'},
        notes: 'Near the bus stop',
      })
    })

    it('highlights the newly selected options', async () => {
      await renderForm()

      await fireEvent.press(screen.getByText('wasteContainers.type.paper'))

      expect(screen.getByText('wasteContainers.type.paper').parent).toHaveStyle(SELECTED)
      expect(screen.getByText('wasteContainers.type.general').parent).not.toHaveStyle(SELECTED)
    })

    it('requires a public number', async () => {
      const {onSubmit} = await renderForm()

      await pressSubmit()

      expect(await screen.findByText('newCityObject.publicNumberRequired')).toBeOnTheScreen()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('treats a non-numeric capacity as zero and rejects it', async () => {
      const {onSubmit} = await renderForm()
      await fireEvent.changeText(input('publicNumber'), 'WC-123')

      await fireEvent.changeText(input('capacityVolume'), 'abc')
      await pressSubmit()

      expect(input('capacityVolume')).toHaveDisplayValue('0')
      expect(await screen.findByText('newCityObject.capacityRequired')).toBeOnTheScreen()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows validation errors for nested location fields', async () => {
      const {onSubmit} = await renderForm()
      await fireEvent.changeText(input('publicNumber'), 'WC-123')

      await fireEvent.changeText(input('latitude'), '95')
      await pressSubmit()

      await waitFor(() => expect(input('latitude')).toHaveStyle({borderColor: '#DC2626'}))
      expect(input('longitude')).not.toHaveStyle({borderColor: '#DC2626'})
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('calls onCancel', async () => {
      const {onCancel} = await renderForm()

      await fireEvent.press(screen.getByText('common.cancel'))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    // BUG: numeric fields re-parse every keystroke with parseFloat and render the number back,
    // so a trailing "." is dropped and decimals like 2.5 cannot be typed character by character.
    it.failing('lets the user type a decimal capacity', async () => {
      const user = userEvent.setup()
      await renderForm()

      await user.clear(input('capacityVolume'))
      await user.type(input('capacityVolume'), '2.5')

      expect(input('capacityVolume')).toHaveDisplayValue('2.5')
    })

    // BUG: same root cause, clearing a numeric field immediately snaps it back to "0".
    it.failing('lets the user clear a numeric field', async () => {
      const user = userEvent.setup()
      await renderForm()

      await user.clear(input('binCount'))

      expect(input('binCount')).toHaveDisplayValue('')
    })
  })

  describe('editing an existing container', () => {
    it('prefills the form from the container', async () => {
      await renderForm({container})

      expect(input('publicNumber')).toHaveDisplayValue('WC-001')
      expect(input('capacityVolume')).toHaveDisplayValue('3.2')
      expect(input('binCount')).toHaveDisplayValue('4')
      expect(input('latitude')).toHaveDisplayValue('42.69')
      expect(input('longitude')).toHaveDisplayValue('23.33')
      expect(input('address')).toHaveDisplayValue('ul. Shipka 1')
      expect(input('notes')).toHaveDisplayValue('Behind the school')
      expect(screen.getByText('wasteContainers.type.glass').parent).toHaveStyle(SELECTED)
      expect(screen.getByText('wasteContainers.size.big').parent).toHaveStyle(SELECTED)
      expect(screen.getByText('newCityObject.update')).toBeOnTheScreen()
    })

    it('falls back to defaults for missing container fields', async () => {
      await renderForm({
        container: {...container, binCount: undefined, address: undefined, notes: undefined},
      })

      expect(input('binCount')).toHaveDisplayValue('1')
      expect(input('address')).toHaveDisplayValue('')
      expect(input('notes')).toHaveDisplayValue('')
    })

    it('submits the unchanged container values', async () => {
      const {onSubmit} = await renderForm({container})

      await pressSubmit('newCityObject.update')

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      expect(onSubmit.mock.calls[0][0]).toEqual({
        publicNumber: 'WC-001',
        wasteType: 'glass',
        capacityVolume: 3.2,
        capacitySize: 'big',
        binCount: 4,
        location: {latitude: 42.69, longitude: 23.33, address: 'ul. Shipka 1'},
        notes: 'Behind the school',
      })
    })
  })

  describe('while submitting', () => {
    it('locks every control and shows progress', async () => {
      const {onCancel} = await renderForm({isSubmitting: true})

      expect(screen.getByText('newCityObject.submitting')).toBeDisabled()
      expect(screen.getByText('common.cancel')).toBeDisabled()
      expect(screen.getByText('wasteContainers.type.paper')).toBeDisabled()
      expect(screen.getByText('wasteContainers.size.tiny')).toBeDisabled()
      for (const field of Object.keys(PLACEHOLDERS) as (keyof typeof PLACEHOLDERS)[]) {
        expect(input(field).props.editable).toBe(false)
      }

      await fireEvent.press(screen.getByText('common.cancel'))
      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('read-only', () => {
    it.each([
      ['canEdit is false', {isEditing: true, canEdit: false}],
      ['isEditing is false', {isEditing: false, canEdit: true}],
      ['no flags are passed', {isEditing: undefined, canEdit: undefined}],
    ])('shows plain values when %s', async (_label, flags) => {
      await renderForm({container, ...flags})

      expect(screen.queryByPlaceholderText(PLACEHOLDERS.publicNumber)).not.toBeOnTheScreen()
      expect(screen.getByText('WC-001')).toBeOnTheScreen()
      expect(screen.getByText('wasteContainers.type.glass')).toBeOnTheScreen()
      expect(screen.getByText('wasteContainers.size.big')).toBeOnTheScreen()
      expect(screen.getByText('3.2')).toBeOnTheScreen()
      expect(screen.getByText('4')).toBeOnTheScreen()
      expect(screen.getByText('42.69')).toBeOnTheScreen()
      expect(screen.getByText('23.33')).toBeOnTheScreen()
      expect(screen.getByText('ul. Shipka 1')).toBeOnTheScreen()
      expect(screen.queryByText('wasteContainers.type.paper')).not.toBeOnTheScreen()
      expect(screen.queryByText('newCityObject.locationInfo')).not.toBeOnTheScreen()
      expect(screen.queryByText('newCityObject.update')).not.toBeOnTheScreen()
      expect(screen.queryByText('common.cancel')).not.toBeOnTheScreen()
    })

    it('shows a dash for empty values', async () => {
      await renderForm({canEdit: false})

      // publicNumber, address and notes are empty
      expect(screen.getAllByText('-')).toHaveLength(3)
    })
  })

  describe('imperative handle', () => {
    it('lets the parent trigger a validated submit', async () => {
      const ref = createRef<{handleSubmit: (cb: (data: unknown) => void) => () => Promise<void>}>()
      const onValid = jest.fn()
      await render(
        <WasteContainerForm
          ref={ref}
          container={container}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
          canEdit
        />
      )

      await ref.current!.handleSubmit(onValid)()

      expect(onValid).toHaveBeenCalledWith(
        expect.objectContaining({publicNumber: 'WC-001', capacityVolume: 3.2}),
        undefined
      )
    })
  })
})
