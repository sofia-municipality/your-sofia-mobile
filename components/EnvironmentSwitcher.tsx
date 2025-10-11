import React from 'react'
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native'
import {useEnvironment} from '@/contexts/EnvironmentContext'
import {Environment} from '@/lib/environment'
import {useTranslation} from 'react-i18next'

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
            } catch (error) {
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
      <Text style={styles.url}>URL: {config.apiUrl}</Text>

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
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  current: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  url: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  buttonText: {
    fontSize: 12,
    color: '#333',
  },
  buttonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
})
