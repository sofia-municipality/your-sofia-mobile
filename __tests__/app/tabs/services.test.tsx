import React from 'react'
import {render, screen} from '@testing-library/react-native'
import ServicesScreen from '../../../app/(tabs)/services'
import servicesEn from '../../../translations/services.en'
import servicesBg from '../../../translations/services.bg'

const mockUsedKeys = new Set<string>()

jest.mock('react-i18next', () => {
  const translators: Record<string, (key: string) => string> = {}
  return {
    useTranslation: (ns = 'translation') => {
      translators[ns] ??= (key: string) => {
        mockUsedKeys.add(`${ns}:${key}`)
        return key
      }
      return {t: translators[ns]}
    },
  }
})

const CATEGORIES = {
  'permits.title': ['permits.buildingPermits', 'permits.businessLicense'],
  'certificates.title': ['certificates.birth', 'certificates.marriage'],
  'transportation.title': ['transportation.parking', 'transportation.publicTransport'],
  'health.title': ['health.registration', 'health.socialBenefits'],
  'education.title': ['education.enrollment'],
  'municipal.title': ['municipal.propertyReg', 'municipal.waste'],
}

describe('ServicesScreen', () => {
  beforeEach(() => {
    mockUsedKeys.clear()
  })

  it('shows the search hint', async () => {
    await render(<ServicesScreen />)

    expect(screen.getByText('search.placeholder')).toBeOnTheScreen()
  })

  it('lists every service under its category', async () => {
    await render(<ServicesScreen />)

    for (const [category, services] of Object.entries(CATEGORIES)) {
      const section = screen.getByText(category).parent!
      for (const service of services) {
        const card = screen.getByText(`${service}.title`).parent!.parent!
        expect(card.parent?.parent).toBe(section)
        expect(card).toHaveTextContent(`${service}.description`, {exact: false})
        expect(card).toHaveTextContent('status.available', {exact: false})
      }
    }
    expect(screen.getAllByText('status.available')).toHaveLength(11)
  })

  it('shows the support section', async () => {
    await render(<ServicesScreen />)

    expect(screen.getByText('support.title')).toBeOnTheScreen()
    expect(screen.getByText('support.description')).toBeOnTheScreen()
    expect(screen.getByText('support.button')).toBeOnTheScreen()
  })

  it('has an English and a Bulgarian text for every key it uses', async () => {
    await render(<ServicesScreen />)
    const lookup = (dict: object, key: string) =>
      key.split('.').reduce<any>((node, part) => node?.[part], dict)

    const keys = [...mockUsedKeys]
    expect(keys.every((key) => key.startsWith('services:'))).toBe(true)
    const missing = keys
      .map((key) => key.slice('services:'.length))
      .filter(
        (key) =>
          typeof lookup(servicesEn, key) !== 'string' || typeof lookup(servicesBg, key) !== 'string'
      )

    expect(keys.length).toBeGreaterThan(30)
    expect(missing).toEqual([])
  })
})
