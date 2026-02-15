import React from 'react'
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native'
import {useEnvironment} from '@/contexts/EnvironmentContext'
import {Environment} from '@/lib/environment'
import {useTranslation} from 'react-i18next'
import {commonStyles, uiTokens} from '../styles/common'

export function EnvironmentSwitcher() {
  const {environment, config, setEnvironment, canSwitch, allEnvironments} = useEnvironment()
  const {t} = useTranslation()

  if (!canSwitch) {
    return null // Don't show switcher in production builds
  }

  const handleEnvironmentChange = async (newEnv: Environment) => {
    if (newEnv === environment) return

    Alert.alert(
      t('settings.changeEnvironment'),
      t('settings.changeEnvironmentWarning', {env: newEnv}),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              await setEnvironment(newEnv)
              Alert.alert(t('common.success'), t('settings.environmentChanged', {env: newEnv}))
            } catch {
              Alert.alert(t('common.error'), t('settings.environmentChangeFailed'))
            }
          },
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 {t('settings.apiEnvironment')}</Text>
      <Text style={styles.subtitle}>{t('settings.devModeOnly')}</Text>
      <Text style={styles.current}>
        {t('settings.current')}: {config.displayName}
      </Text>
      <Text style={styles.url}>
        {t('settings.url')}: {config.apiUrl}
      </Text>

      <View style={styles.buttons}>
        {allEnvironments.map((env) => (
          <TouchableOpacity
            key={env.name}
            style={[styles.button, env.name === environment && styles.buttonActive]}
            onPress={() => handleEnvironmentChange(env.name)}
          >
            <Text style={[styles.buttonText, env.name === environment && styles.buttonTextActive]}>
              {env.displayName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.card,
    backgroundColor: uiTokens.colors.warningSoft,
    padding: uiTokens.spacing.lg,
    borderRadius: uiTokens.radius.sm,
    borderWidth: 1,
    borderColor: '#FACC15',
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: uiTokens.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
    marginBottom: 12,
  },
  current: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: uiTokens.colors.textPrimary,
  },
  url: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    backgroundColor: uiTokens.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: uiTokens.radius.sm,
    borderWidth: 1,
    borderColor: uiTokens.colors.border,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: uiTokens.colors.primary,
    borderColor: uiTokens.colors.primary,
  },
  buttonText: {
    fontSize: 12,
    color: uiTokens.colors.textSecondary,
  },
  buttonTextActive: {
    color: uiTokens.colors.surface,
    fontWeight: '600',
  },
})
