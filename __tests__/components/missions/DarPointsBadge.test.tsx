import React from 'react'
import {render, screen} from '@testing-library/react-native'
import {DarPointsBadge} from '../../../components/missions/DarPointsBadge'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: {count?: number}) =>
      options?.count !== undefined ? `${options.count} ${key}` : key,
  }),
}))

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  return {Gem: (props: object) => <View testID="icon-Gem" {...props} />}
})

describe('DarPointsBadge', () => {
  it('shows the amount with a "+" prefix by default', async () => {
    await render(<DarPointsBadge amount={5} />)

    expect(screen.getByText('+5 missions.darPoints')).toBeOnTheScreen()
  })

  it('passes the amount as the pluralization count', async () => {
    await render(<DarPointsBadge amount={1} />)

    expect(screen.getByText('+1 missions.darPoints')).toBeOnTheScreen()
  })

  it('supports a custom prefix', async () => {
    await render(<DarPointsBadge amount={3} prefix="-" />)

    expect(screen.getByText('-3 missions.darPoints')).toBeOnTheScreen()
  })

  it('supports an empty prefix', async () => {
    await render(<DarPointsBadge amount={10} prefix="" />)

    expect(screen.getByText('10 missions.darPoints')).toBeOnTheScreen()
  })

  it('renders a gold gem icon', async () => {
    await render(<DarPointsBadge amount={5} />)

    expect(screen.getByTestId('icon-Gem').props.color).toBe('#FFD84D')
  })
})
