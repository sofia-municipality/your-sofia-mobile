import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function SignalsLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          title: t('signals.title'),
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: t('signals.form.newSignal'),
          headerShown: true,
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
