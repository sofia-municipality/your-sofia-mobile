import React from 'react'
import {View, Text, StyleSheet} from 'react-native'
import {Wind} from 'lucide-react-native'
import {AirQualityData} from '../types/airQuality'
import {useTranslation} from 'react-i18next'
import {ImplementMeGithub} from './ImplementMeGithub'

interface Props {
  data: AirQualityData
}

export function AirQualityCard({data}: Props) {
  const {t} = useTranslation()

  const getStatusColor = (aqi: number) => {
    if (aqi <= 50) return '#22C55E' // green-500
    if (aqi <= 100) return '#EAB308' // yellow-500
    if (aqi <= 150) return '#F97316' // orange-500
    if (aqi <= 200) return '#EF4444' // red-500
    return '#A855F7' // purple-500
  }

  const getStatusBgColor = (aqi: number) => {
    if (aqi <= 50) return '#DCFCE7' // green-100
    if (aqi <= 100) return '#FEF9C3' // yellow-100
    if (aqi <= 150) return '#FFEDD5' // orange-100
    if (aqi <= 200) return '#FEE2E2' // red-100
    return '#F3E8FF' // purple-100
  }

  const getTranslatedStatus = (status: AirQualityData['status']) => {
    const statusMap: Record<AirQualityData['status'], string> = {
      Good: t('airQuality.status.good'),
      Moderate: t('airQuality.status.moderate'),
      Unhealthy: t('airQuality.status.unhealthy'),
      'Very Unhealthy': t('airQuality.status.veryUnhealthy'),
      Hazardous: t('airQuality.status.hazardous'),
    }
    return statusMap[status]
  }

  return (
    <View style={[styles.container, {backgroundColor: getStatusBgColor(data.aqi)}]}>
      <View style={styles.iconContainer}>
        <Wind size={20} color={getStatusColor(data.aqi)} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{t('airQuality.title')}</Text>
        <Text style={[styles.status, {color: getStatusColor(data.aqi)}]}>
          {data.aqi} - {getTranslatedStatus(data.status)}
        </Text>
      </View>
      <ImplementMeGithub issueUrl="https://github.com/sofia-municipality/your-sofia-mobile/issues/2" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100, // Very high value for pill shape
    padding: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    color: '#4B5563',
    fontFamily: 'Inter-Medium',
  },
  status: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginTop: 2,
  },
})
