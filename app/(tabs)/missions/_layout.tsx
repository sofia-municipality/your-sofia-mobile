import {Stack} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {missionColors} from '@/styles/missionsTheme'
import {fonts} from '@/styles/tokens'

export default function MissionsLayout() {
  const {t} = useTranslation()

  return (
    <Stack
      screenOptions={{
        headerStyle: {backgroundColor: missionColors.bg},
        headerTintColor: missionColors.textPrimary,
        headerTitleStyle: {fontFamily: fonts.bold},
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{title: t('missions.title')}} />
      <Stack.Screen name="[id]" options={{title: t('missions.missionDetails')}} />
      <Stack.Screen name="verify" options={{title: t('missions.verifyMissions')}} />
    </Stack>
  )
}
