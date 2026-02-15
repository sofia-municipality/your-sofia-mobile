import {Stack} from 'expo-router'
import {useTranslation} from 'react-i18next'

export default function HomeLayout() {
  const {t} = useTranslation()
  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen
        name="index"
        options={{
          title: t('common.back'),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  )
}
