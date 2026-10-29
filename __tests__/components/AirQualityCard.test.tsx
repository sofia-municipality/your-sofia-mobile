import React from 'react'
import {render} from '@testing-library/react-native'
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
})
