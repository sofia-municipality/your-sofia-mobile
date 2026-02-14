import {SafeAreaView, StyleSheet, Text, View} from 'react-native'
import {useTranslation} from 'react-i18next'
import {ImplementMeGithub} from '@/components/ImplementMeGithub'
import {uiTokens} from '@/styles/common'

export default function OboAppNotificationsScreen() {
  const {t} = useTranslation()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('oboappNotifications.title')}</Text>
        <Text style={styles.subtitle}>{t('oboappNotifications.subtitle')}</Text>
        <ImplementMeGithub
          issueUrl="https://github.com/sofia-municipality/your-sofia-mobile/issues"
          extendedText={t('oboappNotifications.comingSoon')}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: uiTokens.colors.background,
  },
  content: {
    padding: uiTokens.spacing.xl,
    gap: uiTokens.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: uiTokens.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
    lineHeight: 20,
  },
})
