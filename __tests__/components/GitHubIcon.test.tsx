import React from 'react'
import {render, screen} from '@testing-library/react-native'
import {siGithub} from 'simple-icons'
import {GitHubIcon} from '../../components/GitHubIcon'

describe('GitHubIcon', () => {
  it('renders a 24x24 black icon by default', async () => {
    await render(<GitHubIcon />)

    const svg = screen.root!
    expect(svg.props.width).toBe(24)
    expect(svg.props.height).toBe(24)
    expect(svg.props.fill).toBe('#000000')
  })

  it('applies a custom size and color', async () => {
    await render(<GitHubIcon size={18} color="#2F54C5" />)

    const svg = screen.root!
    expect(svg.props.width).toBe(18)
    expect(svg.props.height).toBe(18)
    expect(svg.props.fill).toBe('#2F54C5')
  })

  it('draws the GitHub glyph from simple-icons', async () => {
    await render(<GitHubIcon />)

    const paths = screen.container.queryAll((node) => node.props.d !== undefined)
    expect(paths).toHaveLength(1)
    expect(paths[0].props.d).toBe(siGithub.path)
  })
})
