import React from 'react'
import {View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'expo-router'
import {AlertTriangle, MapPin, Images} from 'lucide-react-native'

export default function NewScreen() {
  const {t} = useTranslation()
  const router = useRouter()

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('new.title')}</Text>
          <Text style={styles.subtitle}>{t('new.subtitle')}</Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('../(tabs)/new/new-signal')}
            >
              <View style={styles.iconContainer}>
                <AlertTriangle size={36} color="#1E40AF" />
              </View>
              <Text style={styles.buttonTitle}>{t('new.newSignal')}</Text>
              <Text style={styles.buttonDescription}>{t('new.newSignalDescription')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonDisabled]}
              onPress={() => router.push('../(tabs)/new/new-city-object')}
              disabled={true}
            >
              <View style={styles.iconContainer}>
                <MapPin size={36} color="#9CA3AF" />
              </View>
              <Text style={[styles.buttonTitle, styles.buttonTitleDisabled]}>
                {t('new.newCityObject')}
              </Text>
              <Text style={[styles.buttonDescription, styles.buttonDescriptionDisabled]}>
                {t('new.newCityObjectDescription')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('../(tabs)/new/bulk-photo-upload')}
            >
              <View style={styles.iconContainer}>
                <Images size={36} color="#1E40AF" />
              </View>
              <Text style={styles.buttonTitle}>{t('new.bulkPhotoUpload')}</Text>
              <Text style={styles.buttonDescription}>{t('new.bulkPhotoUploadDescription')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
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
    borderColor: '#E5E7EB',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  buttonTitleDisabled: {
    color: '#9CA3AF',
  },
  buttonDescriptionDisabled: {
    color: '#D1D5DB',
  },
})
