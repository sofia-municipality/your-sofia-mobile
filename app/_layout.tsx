import {useEffect, useState} from 'react'
import {Stack, useRouter} from 'expo-router'
import {StatusBar} from 'expo-status-bar'
import {Image, TouchableOpacity} from 'react-native'
import {User} from 'lucide-react-native'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {useFrameworkReady} from '@/hooks/useFrameworkReady'
import {useTranslation} from 'react-i18next'
import {initializeReporterId} from '@/lib/deviceId'
import {EnvironmentProvider} from '@/contexts/EnvironmentContext'
import {AuthProvider} from '@/contexts/AuthContext'
import {OboAppAuthProvider} from '@/contexts/OboAppAuthContext'
import '../i18n'

export default function RootLayout() {
  useFrameworkReady()
  const {t} = useTranslation()
  const router = useRouter()
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

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
    <QueryClientProvider client={queryClient}>
      <EnvironmentProvider>
        <AuthProvider>
          <OboAppAuthProvider>
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
                      marginLeft: 6,
                      borderRadius: 12,
                    }}
                  />
                ),
                headerRight: () => (
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/profile')}
                    accessibilityLabel={t('profile.title')}
                  >
                    <User size={24} style={{marginLeft: 6}} color="#1E40AF" />
                  </TouchableOpacity>
                ),
              }}
            >
              <Stack.Screen name="(tabs)" options={{headerShown: true}} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </OboAppAuthProvider>
        </AuthProvider>
      </EnvironmentProvider>
    </QueryClientProvider>
  )
}
