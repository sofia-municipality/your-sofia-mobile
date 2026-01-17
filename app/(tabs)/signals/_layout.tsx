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
        options={({route}) => {
          const params = route.params as {id?: string}
          return {
            title: t('signals.form.headerView') + (params?.id ? ` #${params.id}` : ''),
            headerShown: true,
            headerTitleAlign: 'left',
            presentation: 'card',
          }
        }}
      />
    </Stack>
  )
}
