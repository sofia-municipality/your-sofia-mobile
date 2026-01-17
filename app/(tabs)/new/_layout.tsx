import {Stack} from 'expo-router'
import {useTranslation} from 'react-i18next'

export default function NewLayout() {
  const {t} = useTranslation()

  return (
    <Stack initialRouteName="index">
      <Stack.Screen
        name="index"
        options={{
          title: t('new.title'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="new-signal"
        options={{
          title: t('newSignal.title'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="new-city-object"
        options={{
          title: t('newCityObject.title'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="bulk-photo-upload"
        options={{
          title: t('bulkPhotoUpload.title'),
          headerShown: true,
        }}
      />
    </Stack>
  )
}
