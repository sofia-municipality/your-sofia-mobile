import {Link, Stack} from 'expo-router'
import {StyleSheet, Text, View} from 'react-native'
import {useTranslation} from 'react-i18next'
import {uiTokens} from '../styles/common'

export default function NotFoundScreen() {
  const {t} = useTranslation()

  return (
    <>
      <Stack.Screen options={{title: t('common.notFoundTitle')}} />
      <View style={styles.container}>
        <Text style={styles.text}>{t('common.notFoundMessage')}</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('common.goHome')}</Text>
        </Link>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: uiTokens.colors.background,
  },
  text: {
    fontSize: 20,
    fontWeight: 600,
    color: uiTokens.colors.textPrimary,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    color: uiTokens.colors.primary,
    fontWeight: '600',
  },
})
