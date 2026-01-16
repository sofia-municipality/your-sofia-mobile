import {Stack} from 'expo-router'
import {useTranslation} from 'react-i18next'

export default function SignalsLayout() {
  const {t} = useTranslation()

  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen
        name="index"
        options={{
          title: t('signals.title'),
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: t('signals.form.headerNew'),
          headerShown: true,
          headerTitleAlign: 'left',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('signals.form.headerView'),
          headerShown: false, // TODO: Use true when edit is implemented in standard header
          headerTitleAlign: 'left',
          presentation: 'card',
        }}
      />
    </Stack>
  )
}
