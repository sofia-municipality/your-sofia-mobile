import React from 'react'
import {render, screen} from '@testing-library/react-native'
import {WasteContainerCluster} from '../../components/WasteContainerCluster'

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  return {
    Container: (props: object) => <View testID="icon-Container" {...props} />,
  }
})

describe('WasteContainerCluster', () => {
  describe('color', () => {
    it.each([
      ['inactive', 0, '#9CA3AF'],
      ['inactive', 3, '#9CA3AF'],
      ['pending', 0, '#9CA3AF'],
      ['full', 0, 'red'],
      ['full', 3, 'red'],
      ['maintenance', 0, 'orange'],
      ['active', 2, 'orange'],
      ['active', 0, 'green'],
    ])(
      'status "%s" with %i active signals is %s',
      async (dominantStatus, activeSignalCount, expected) => {
        await render(
          <WasteContainerCluster
            count={5}
            dominantStatus={dominantStatus}
            activeSignalCount={activeSignalCount}
          />
        )

        expect(screen.getByTestId('icon-Container').parent).toHaveStyle({
          backgroundColor: expected,
        })
        expect(screen.getByText('5').parent).toHaveStyle({backgroundColor: expected})
      }
    )
  })

  describe('size and label', () => {
    it.each([
      [1, 28, '1', 12, 10],
      [9, 28, '9', 12, 10],
      [10, 36, '10', 15, 11],
      [99, 36, '99', 15, 11],
      [100, 44, '100', 18, 13],
      [999, 44, '999', 18, 13],
      [1000, 52, '1k+', 22, 13],
      [2500, 52, '2k+', 22, 13],
    ])(
      'count %i renders a %ipx cluster labelled "%s"',
      async (count, size, label, iconSize, fontSize) => {
        await render(
          <WasteContainerCluster count={count} dominantStatus="active" activeSignalCount={0} />
        )

        expect(screen.root).toHaveStyle({width: size, height: size})
        expect(screen.getByText(label)).toHaveStyle({fontSize})
        expect(screen.getByTestId('icon-Container').props.size).toBe(iconSize)
      }
    )
  })

  it('draws a white container icon', async () => {
    await render(<WasteContainerCluster count={3} dominantStatus="active" activeSignalCount={0} />)

    expect(screen.getByTestId('icon-Container').props.color).toBe('#fff')
  })
})
