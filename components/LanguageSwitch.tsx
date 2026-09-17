import {TouchableOpacity, Text, StyleSheet} from 'react-native'
import {useTranslation} from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {colors, fonts, fontSizes} from '@/styles/tokens'

export function LanguageSwitch() {
  const {i18n} = useTranslation()
  const currentLanguage = i18n.language

  const toggleLanguage = async () => {
    const newLanguage = currentLanguage === 'bg' ? 'en' : 'bg'
    await AsyncStorage.setItem('user-language', newLanguage)
    await i18n.changeLanguage(newLanguage)
  }

  return (
    <TouchableOpacity
      onPress={toggleLanguage}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={currentLanguage === 'bg' ? 'Switch to English' : 'Превключи на Български'}
      testID="languageSwitchButton"
    >
      <Text style={styles.language}>{currentLanguage === 'bg' ? 'EN' : 'БГ'}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    marginRight: 16,
  },
  language: {
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
})
