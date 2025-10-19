import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import en from './translations/en'
import bg from './translations/bg'
import servicesEn from './translations/services.en'
import servicesBg from './translations/services.bg'
import {LanguageDetectorAsyncModule} from 'i18next'

const languageDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  detect: async (callback: (lng: string | readonly string[] | undefined) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem('user-language')
      if (savedLanguage) {
        callback(savedLanguage)
        return savedLanguage
      }
      // Set Bulgarian as default
      callback('bg')
      return 'bg'
    } catch {
      callback('bg')
      return 'bg'
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem('user-language', lng)
    } catch {}
  },
}

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      en: {
        translation: en,
        services: servicesEn,
      },
      bg: {
        translation: bg,
        services: servicesBg,
      },
    },
    fallbackLng: 'bg',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
