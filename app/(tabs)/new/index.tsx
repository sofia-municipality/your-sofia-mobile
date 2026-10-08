import React from 'react'
import {View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'expo-router'
import {AlertTriangle, MapPin, Images} from 'lucide-react-native'
import {useAuth} from '@/contexts/AuthContext'
import {colors, fonts, fontSizes} from '@/styles/tokens'

export default function NewScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const {isAuthenticated, isBulkUploadAllowed} = useAuth()

  const requireAuth = (destination: string) => {
    if (!isAuthenticated) {
      router.push({pathname: '/auth/login', params: {returnTo: destination}} as any)
      return false
    }
    return true
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (requireAuth('/(tabs)/new/new-signal')) router.push('../(tabs)/new/new-signal')
              }}
              accessibilityRole="button"
              accessibilityLabel={t('new.newSignal')}
              testID="newSignalButton"
            >
              <View style={styles.iconContainer}>
                <AlertTriangle size={36} color={colors.primary} />
              </View>
              <Text style={styles.buttonTitle}>{t('new.newSignal')}</Text>
              <Text style={styles.buttonDescription}>{t('new.newSignalDescription')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button]}
              onPress={() => {
                if (requireAuth('/(tabs)/new/new-city-object'))
                  router.push('../(tabs)/new/new-city-object')
              }}
              accessibilityRole="button"
              accessibilityLabel={t('new.newCityObject')}
            >
              <View style={styles.iconContainer}>
                <MapPin size={36} color={colors.primary} />
              </View>
              <Text style={[styles.buttonTitle]}>{t('new.newCityObject')}</Text>
              <Text style={[styles.buttonDescription]}>{t('new.newCityObjectDescription')}</Text>
            </TouchableOpacity>

            {isBulkUploadAllowed && (
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  if (requireAuth('/(tabs)/new/bulk-photo-upload'))
                    router.push('../(tabs)/new/bulk-photo-upload')
                }}
                accessibilityRole="button"
                accessibilityLabel={t('new.bulkPhotoUpload')}
              >
                <View style={styles.iconContainer}>
                  <Images size={36} color={colors.primary} />
                </View>
                <Text style={styles.buttonTitle}>{t('new.bulkPhotoUpload')}</Text>
                <Text style={styles.buttonDescription}>{t('new.bulkPhotoUploadDescription')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  buttonsContainer: {
    gap: 12,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.surface2,
  },
  buttonTitleDisabled: {
    color: colors.textMuted,
  },
  buttonDescriptionDisabled: {
    color: colors.border,
  },
})
