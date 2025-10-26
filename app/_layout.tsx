import {useEffect} from 'react'
import {Stack} from 'expo-router'
import {StatusBar} from 'expo-status-bar'
import {Image} from 'react-native'
import {useFrameworkReady} from '@/hooks/useFrameworkReady'
import {LanguageSwitch} from '@/components/LanguageSwitch'
import {useTranslation} from 'react-i18next'
import {initializeReporterId} from '@/lib/deviceId'
import {EnvironmentProvider} from '@/contexts/EnvironmentContext'
import {AuthProvider} from '@/contexts/AuthContext'
import '../i18n'

export default function RootLayout() {
  useFrameworkReady()
  const {t} = useTranslation()

  // Initialize unique reporter ID on app start
  useEffect(() => {
    initializeReporterId()
      .then((id) => {
        console.log('Unique Reporter ID initialized:', id)
      })
      .catch((error) => {
        console.error('Failed to initialize reporter ID:', error)
      })
  }, [])

  return (
    <EnvironmentProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: true,
            headerTitle: t('common.header'),
            headerShadowVisible: true,
            headerLeft: () => (
              <Image
                source={require('../assets/images/sofia-gerb.png')}
                style={{
                  width: 24,
                  height: 24,
                  marginLeft: 16,
                  borderRadius: 12,
                }}
              />
            ),
            headerRight: () => <LanguageSwitch />,
          }}
        >
          <Stack.Screen name="(tabs)" options={{headerShown: true}} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </EnvironmentProvider>
  )
}
