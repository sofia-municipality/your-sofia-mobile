import React from 'react'
import {render, screen} from '@testing-library/react-native'
import {WasteContainerMarker} from '../../components/WasteContainerMarker'

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  const icon = (name: string) => {
    const Icon = (props: object) => <View testID={`icon-${name}`} {...props} />
    Icon.displayName = name
    return Icon
  }
  return {
    Trash2: icon('Trash2'),
    Recycle: icon('Recycle'),
    Shapes: icon('Shapes'),
    Container: icon('Container'),
  }
})

describe('WasteContainerMarker', () => {
  describe('icon selection', () => {
    it('shows the generic container icon when no waste type is given', async () => {
      await render(<WasteContainerMarker color="green" />)
      expect(screen.getByTestId('icon-Container')).toBeOnTheScreen()
    })

    it('shows the generic container icon for general waste', async () => {
      await render(<WasteContainerMarker color="green" wasteType="general" />)
      expect(screen.getByTestId('icon-Container')).toBeOnTheScreen()
    })

    it('shows the recycle icon for recyclables', async () => {
      await render(<WasteContainerMarker color="green" wasteType="recyclables" />)
      expect(screen.getByTestId('icon-Recycle')).toBeOnTheScreen()
    })

    it('shows the trash icon for trash cans', async () => {
      await render(<WasteContainerMarker color="green" wasteType="trashCan" />)
      expect(screen.getByTestId('icon-Trash2')).toBeOnTheScreen()
    })

    it('shows the shapes icon when the container has bulky waste, regardless of type', async () => {
      await render(
        <WasteContainerMarker
          color="green"
          wasteType="recyclables"
          state={['full', 'bulkyWaste']}
        />
      )
      expect(screen.getByTestId('icon-Shapes')).toBeOnTheScreen()
      expect(screen.queryByTestId('icon-Recycle')).not.toBeOnTheScreen()
    })

    it('falls back to the waste type icon when state has no bulky waste', async () => {
      await render(<WasteContainerMarker color="green" wasteType="trashCan" state={['full']} />)
      expect(screen.getByTestId('icon-Trash2')).toBeOnTheScreen()
    })
  })

  describe('sizing and color', () => {
    it('renders a 32px marker with a 64% icon by default', async () => {
      await render(<WasteContainerMarker color="green" />)

      expect(screen.root).toHaveStyle({width: 32, height: 32})
      expect(screen.getByTestId('icon-Container').props.size).toBeCloseTo(20.48)
    })

    it('scales the marker and icon with the size prop', async () => {
      await render(<WasteContainerMarker color="green" size={50} />)

      expect(screen.root).toHaveStyle({width: 50, height: 50})
      expect(screen.getByTestId('icon-Container').props.size).toBeCloseTo(32)
    })

    it('uses the given color as background and a white icon', async () => {
      await render(<WasteContainerMarker color="#DC2626" />)

      const icon = screen.getByTestId('icon-Container')
      expect(icon.props.color).toBe('#FFFFFF')
      expect(icon.parent).toHaveStyle({backgroundColor: '#DC2626'})
    })
  })
})
