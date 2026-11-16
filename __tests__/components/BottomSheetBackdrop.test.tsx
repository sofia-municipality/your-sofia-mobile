import React from 'react'
import {Dimensions, Text} from 'react-native'
import {fireEvent, render, screen} from '@testing-library/react-native'
import {BottomSheetBackdrop} from '../../components/BottomSheetBackdrop'

type HostElement = ReturnType<typeof screen.getByText>

function getDismissArea() {
  return screen.root!.children[0] as HostElement
}

describe('BottomSheetBackdrop', () => {
  it('renders its children', async () => {
    await render(
      <BottomSheetBackdrop>
        <Text>Sheet content</Text>
      </BottomSheetBackdrop>
    )

    expect(screen.getByText('Sheet content')).toBeOnTheScreen()
  })

  it('fills the window height', async () => {
    await render(
      <BottomSheetBackdrop>
        <Text>Sheet content</Text>
      </BottomSheetBackdrop>
    )

    expect(screen.root).toHaveStyle({height: Dimensions.get('window').height})
  })

  it('calls onPress when the backdrop is pressed', async () => {
    const onPress = jest.fn()
    await render(
      <BottomSheetBackdrop onPress={onPress}>
        <Text>Sheet content</Text>
      </BottomSheetBackdrop>
    )

    await fireEvent.press(getDismissArea())

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('disables the dismiss area when no onPress is provided', async () => {
    await render(
      <BottomSheetBackdrop>
        <Text>Sheet content</Text>
      </BottomSheetBackdrop>
    )

    expect(getDismissArea()).toBeDisabled()
  })

  it('enables the dismiss area when onPress is provided', async () => {
    await render(
      <BottomSheetBackdrop onPress={jest.fn()}>
        <Text>Sheet content</Text>
      </BottomSheetBackdrop>
    )

    expect(getDismissArea()).toBeEnabled()
  })
})
