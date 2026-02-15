import React from 'react'
import {View, Text, StyleSheet} from 'react-native'
import {useTranslation} from 'react-i18next'
import {BarChart3} from 'lucide-react-native'
import {commonStyles, uiTokens} from '../../styles/common'

export default function MetricsScreen() {
  const {t} = useTranslation()
  return (
    <View style={styles.container}>
      <View style={styles.contentCard}>
        <BarChart3 size={48} color={uiTokens.colors.primary} style={styles.icon} />
        <Text style={styles.title}>{t('metrics.title')}</Text>
        <Text style={styles.subtitle}>{t('metrics.comingSoon')}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTokens.colors.background,
    paddingHorizontal: uiTokens.spacing.xl,
  },
  contentCard: {
    ...commonStyles.card,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: uiTokens.spacing.xl,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: uiTokens.colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: uiTokens.colors.textMuted,
  },
})
