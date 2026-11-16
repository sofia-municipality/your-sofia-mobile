import React from 'react'
import {render, screen} from '@testing-library/react-native'
import {DrinkingFountainMarker} from '../../components/DrinkingFountainMarker'

function getSvg() {
  const [svg] = screen.container.queryAll((node) => node.props.vbWidth !== undefined)
  return svg
}

describe('DrinkingFountainMarker', () => {
  it('renders a 32px marker by default', async () => {
    await render(<DrinkingFountainMarker color="#0284C7" />)

    expect(screen.root).toHaveStyle({width: 32, height: 32})
  })

  it('applies a custom size', async () => {
    await render(<DrinkingFountainMarker color="#0284C7" size={50} />)

    expect(screen.root).toHaveStyle({width: 50, height: 50})
  })

  it('uses the given color as the marker background', async () => {
    await render(<DrinkingFountainMarker color="#DC2626" />)

    const iconContainer = getSvg().parent!
    expect(iconContainer).toHaveStyle({backgroundColor: '#DC2626'})
  })

  it('scales the fountain glyph to 64% of the marker size', async () => {
    await render(<DrinkingFountainMarker color="#0284C7" size={50} />)

    const svg = getSvg()
    expect(svg.props.width).toBeCloseTo(32)
    expect(svg.props.height).toBeCloseTo(32)
  })

  it('draws the fountain glyph paths', async () => {
    await render(<DrinkingFountainMarker color="#0284C7" />)

    const paths = screen.container.queryAll((node) => node.props.d !== undefined)
    expect(paths).toHaveLength(7)
  })
})
