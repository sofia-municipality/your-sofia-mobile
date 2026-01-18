import React from 'react'
import {View, Text, StyleSheet} from 'react-native'
import {useTranslation} from 'react-i18next'
import {BarChart3} from 'lucide-react-native'

export default function MetricsScreen() {
  const {t} = useTranslation()
  return (
    <View style={styles.container}>
      <BarChart3 size={48} color="#1E40AF" style={styles.icon} />
      <Text style={styles.title}>{t('metrics.title')}</Text>
      <Text style={styles.subtitle}>{t('metrics.comingSoon')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
})
