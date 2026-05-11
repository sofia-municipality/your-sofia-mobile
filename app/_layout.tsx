import {useEffect} from 'react'
import {Stack, useRouter} from 'expo-router'
import {StatusBar} from 'expo-status-bar'
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native'
import {User} from 'lucide-react-native'
import {useFrameworkReady} from '@/hooks/useFrameworkReady'
import {useTranslation} from 'react-i18next'
import {initializeReporterId} from '@/lib/deviceId'
import {EnvironmentProvider} from '@/contexts/EnvironmentContext'
import {AuthProvider} from '@/contexts/AuthContext'
import {NotificationsProvider} from '@/contexts/NotificationsContext'
import {AppErrorBoundary} from '@/components/AppErrorBoundary'
import {useFonts} from 'expo-font'
import {
  SofiaSans_400Regular,
  SofiaSans_500Medium,
  SofiaSans_600SemiBold,
  SofiaSans_700Bold,
  SofiaSans_800ExtraBold,
} from '@expo-google-fonts/sofia-sans'
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono'
import {colors, fonts, fontSizes, radius} from '@/styles/tokens'
import '../i18n'

export default function RootLayout() {
  useFrameworkReady()

  const [fontsLoaded] = useFonts({
    SofiaSans_400Regular,
    SofiaSans_500Medium,
    SofiaSans_600SemiBold,
    SofiaSans_700Bold,
    SofiaSans_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  })

  if (!fontsLoaded) {
    return <View style={{flex: 1, backgroundColor: colors.bg}} />
  }

  return <AppShell />
}

function AppShell() {
  const {t} = useTranslation()
  const router = useRouter()

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
      <AppErrorBoundary>
        <AuthProvider>
          <NotificationsProvider>
            <Stack
              screenOptions={{
                headerShown: true,
                headerTitle: () => (
                  <View style={headerStyles.titleContainer}>
                    <Text style={headerStyles.title}>{t('common.header')}</Text>
                    <View style={headerStyles.betaBadge}>
                      <Text style={headerStyles.betaBadgeText}>BETA</Text>
                    </View>
                  </View>
                ),
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
                    <User size={24} style={{marginLeft: 6}} color={colors.primary} />
                  </TouchableOpacity>
                ),
              }}
            >
              <Stack.Screen name="(tabs)" options={{headerShown: true}} />
              <Stack.Screen
                name="auth/login"
                options={{
                  headerTitle: t('auth.login'),
                  headerLeft: undefined,
                  headerBackVisible: true,
                }}
              />
              <Stack.Screen
                name="auth/register"
                options={{
                  headerTitle: t('auth.register'),
                  headerLeft: undefined,
                  headerBackVisible: true,
                }}
              />
              <Stack.Screen
                name="whats-new"
                options={{
                  headerShown: false,
                  presentation: 'transparentModal',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </NotificationsProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </EnvironmentProvider>
  )
}

const headerStyles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
  },
  betaBadge: {
    backgroundColor: colors.error,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 1,
  },
  betaBadgeText: {
    fontFamily: fonts.extraBold,
    fontSize: 8,
    color: colors.surface,
    letterSpacing: 0.8,
  },
})
