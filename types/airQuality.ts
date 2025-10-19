export interface AirQualityData {
  aqi: number
  location: string
  timestamp: string
  mainPollutant: string
  status: 'Good' | 'Moderate' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous'
}
