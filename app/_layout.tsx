import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from 'react-i18next';
import '../i18n';

export default function RootLayout() {
  useFrameworkReady();
  const { t } = useTranslation();

  return (
    <>
      <Stack screenOptions={{ 
        headerShown: true,
        headerTitle: t('common.header'),
        headerShadowVisible: true,
        headerLeft: () => (
          <Image 
            source={require('../assets/images/sofia-gerb.png')}
            style={{ width: 24, height: 24, marginLeft: 16, borderRadius: 12 }}
          />
        ),
        headerRight: () => (
          <LanguageSwitch />
        ),
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: true }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
