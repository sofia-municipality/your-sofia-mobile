import React from 'react'
import {render, screen} from '@testing-library/react-native'
import {AirQualityCard} from '../../components/AirQualityCard'
import type {AirQualityData} from '../../types/airQuality'

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockData: AirQualityData = {
  aqi: 45,
  location: 'Sofia Center',
  timestamp: '2024-01-15T10:00:00Z',
  mainPollutant: 'PM2.5',
  status: 'Good',
}

const mockDataModerate: AirQualityData = {
  aqi: 75,
  location: 'Sofia Center',
  timestamp: '2024-01-15T10:00:00Z',
  mainPollutant: 'PM2.5',
  status: 'Moderate',
}

describe('AirQualityCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders air quality data correctly', async () => {
    const {getByText} = await render(<AirQualityCard data={mockData} />)

    expect(getByText('45 - airQuality.status.good')).toBeTruthy()
  })

  it('renders different status text for moderate air quality', async () => {
    const {getByText} = await render(<AirQualityCard data={mockDataModerate} />)

    expect(getByText('75 - airQuality.status.moderate')).toBeTruthy()
  })

  it('displays the air quality title', async () => {
    const {getByText} = await render(<AirQualityCard data={mockData} />)

    expect(getByText('airQuality.title')).toBeTruthy()
  })

  it('applies correct background color for good air quality', async () => {
    const {getByTestId} = await render(<AirQualityCard data={mockData} />)

    const container = getByTestId('air-quality-card-container')
    //log the style prop to see its structure
    expect(container.props.style[1].backgroundColor).toBe('#DCFCE7') // green-100
  })

  it('applies correct background color for moderate air quality', async () => {
    const {getByTestId} = await render(<AirQualityCard data={mockDataModerate} />)

    const container = getByTestId('air-quality-card-container')
    expect(container.props.style[1].backgroundColor).toBe('#FEF9C3') // yellow-100
  })

  describe('accessibility', () => {
    it('renders status as text not color-only', async () => {
      const {getByText} = await render(<AirQualityCard data={mockData} />)
      // Status must be conveyed via visible text, not color alone
      expect(getByText('45 - airQuality.status.good')).toBeTruthy()
    })

    it('renders status text for moderate quality', async () => {
      const {getByText} = await render(<AirQualityCard data={mockDataModerate} />)
      expect(getByText('75 - airQuality.status.moderate')).toBeTruthy()
    })
  })

  describe('AQI thresholds', () => {
    it.each([
      [0, 'Good', 'airQuality.status.good', '#22C55E', '#DCFCE7'],
      [50, 'Good', 'airQuality.status.good', '#22C55E', '#DCFCE7'],
      [51, 'Moderate', 'airQuality.status.moderate', '#EAB308', '#FEF9C3'],
      [100, 'Moderate', 'airQuality.status.moderate', '#EAB308', '#FEF9C3'],
      [101, 'Unhealthy', 'airQuality.status.unhealthy', '#F97316', '#FFEDD5'],
      [150, 'Unhealthy', 'airQuality.status.unhealthy', '#F97316', '#FFEDD5'],
      [151, 'Very Unhealthy', 'airQuality.status.veryUnhealthy', '#DC2626', '#FEE2E2'],
      [200, 'Very Unhealthy', 'airQuality.status.veryUnhealthy', '#DC2626', '#FEE2E2'],
      [201, 'Hazardous', 'airQuality.status.hazardous', '#A855F7', '#F3E8FF'],
      [350, 'Hazardous', 'airQuality.status.hazardous', '#A855F7', '#F3E8FF'],
    ] as const)(
      'AQI %i (%s) shows "%s" in %s on %s',
      async (aqi, status, label, textColor, backgroundColor) => {
        await render(<AirQualityCard data={{...mockData, aqi, status}} />)

        expect(screen.getByTestId('air-quality-card-container')).toHaveStyle({backgroundColor})
        expect(screen.getByText(`${aqi} - ${label}`)).toHaveStyle({color: textColor})
      }
    )
  })
})
