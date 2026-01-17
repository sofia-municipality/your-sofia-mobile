import React, {useState} from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'expo-router'
import {Images, Upload, CheckCircle, AlertCircle} from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'

type ProcessingMode = 'create-signals' | 'close-signals' | 'create-objects'

interface PhotoWithMetadata {
  uri: string
  id: string
  timestamp?: Date
  latitude?: number
  longitude?: number
}

export default function BulkPhotoUploadScreen() {
  const {t} = useTranslation()
  const router = useRouter()

  const [photos, setPhotos] = useState<PhotoWithMetadata[]>([])
  const [mode, setMode] = useState<ProcessingMode>('create-signals')
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  const handleSelectPhotos = async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(t('common.permissionDenied'), t('bulkPhotoUpload.mediaLibraryPermissionRequired'))
      return
    }

    setLoading(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        exif: true,
      })

      if (!result.canceled && result.assets.length > 0) {
        const newPhotos: PhotoWithMetadata[] = result.assets.map((asset, index) => ({
          uri: asset.uri,
          id: `${Date.now()}-${index}`,
          timestamp: asset.exif?.DateTimeOriginal
            ? new Date(asset.exif.DateTimeOriginal)
            : undefined,
          latitude: asset.exif?.GPSLatitude,
          longitude: asset.exif?.GPSLongitude,
        }))

        setPhotos((prev) => [...prev, ...newPhotos])
      }
    } catch (error) {
      console.error('Error selecting photos:', error)
      Alert.alert(t('common.error'), t('bulkPhotoUpload.selectError'))
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async () => {
    if (photos.length === 0) {
      Alert.alert(t('common.error'), t('bulkPhotoUpload.noPhotosSelected'))
      return
    }

    setProcessing(true)
    try {
      // Filter photos with coordinates and timestamp
      const validPhotos = photos.filter(
        (photo) => photo.latitude && photo.longitude && photo.timestamp
      )

      if (validPhotos.length === 0) {
        Alert.alert(t('common.error'), t('bulkPhotoUpload.noValidPhotos'))
        setProcessing(false)
        return
      }

      console.log('[BulkPhotoUpload] Processing mode:', mode)
      console.log('[BulkPhotoUpload] Valid photos:', validPhotos.length)

      // TODO: Implement API calls based on mode
      switch (mode) {
        case 'create-signals':
          // Create signals from photos with geolocation
          break
        case 'close-signals':
          // Close nearby signals with these photos
          break
        case 'create-objects':
          // Create new city objects from photos
          break
      }

      Alert.alert(
        t('common.success'),
        t('bulkPhotoUpload.processSuccess', {
          count: validPhotos.length,
          total: photos.length,
        }),
        [
          {
            text: 'OK',
            onPress: () => {
              setPhotos([])
              router.back()
            },
          },
        ]
      )
    } catch (error) {
      console.error('Error processing photos:', error)
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('bulkPhotoUpload.processError')
      )
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = () => {
    if (photos.length > 0) {
      Alert.alert(t('common.confirm'), t('bulkPhotoUpload.cancelConfirm'), [
        {text: t('common.no'), style: 'cancel'},
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: () => router.back(),
        },
      ])
    } else {
      router.back()
    }
  }

  const validPhotosCount = photos.filter(
    (photo) => photo.latitude && photo.longitude && photo.timestamp
  ).length

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Images size={32} color="#1E40AF" />
          <Text style={styles.headerTitle}>{t('bulkPhotoUpload.title')}</Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>{t('bulkPhotoUpload.instructions')}</Text>
        </View>

        {/* Mode Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('bulkPhotoUpload.mode')}</Text>

          <TouchableOpacity
            style={[styles.radioOption, mode === 'create-signals' && styles.radioOptionSelected]}
            onPress={() => setMode('create-signals')}
          >
            <View style={styles.radioCircle}>
              {mode === 'create-signals' && <View style={styles.radioCircleSelected} />}
            </View>
            <View style={styles.radioContent}>
              <Text style={styles.radioTitle}>{t('bulkPhotoUpload.createSignals')}</Text>
              <Text style={styles.radioDescription}>
                {t('bulkPhotoUpload.createSignalsDescription')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.radioOption, mode === 'close-signals' && styles.radioOptionSelected]}
            onPress={() => setMode('close-signals')}
          >
            <View style={styles.radioCircle}>
              {mode === 'close-signals' && <View style={styles.radioCircleSelected} />}
            </View>
            <View style={styles.radioContent}>
              <Text style={styles.radioTitle}>{t('bulkPhotoUpload.closeSignals')}</Text>
              <Text style={styles.radioDescription}>
                {t('bulkPhotoUpload.closeSignalsDescription')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.radioOption, mode === 'create-objects' && styles.radioOptionSelected]}
            onPress={() => setMode('create-objects')}
          >
            <View style={styles.radioCircle}>
              {mode === 'create-objects' && <View style={styles.radioCircleSelected} />}
            </View>
            <View style={styles.radioContent}>
              <Text style={styles.radioTitle}>{t('bulkPhotoUpload.createObjects')}</Text>
              <Text style={styles.radioDescription}>
                {t('bulkPhotoUpload.createObjectsDescription')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Select Photos Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={handleSelectPhotos}
            disabled={loading}
          >
            <Upload size={24} color="#1E40AF" />
            <Text style={styles.selectButtonText}>
              {loading ? t('common.loading') : t('bulkPhotoUpload.selectPhotos')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Photos Summary */}
        {photos.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.summaryText}>
                {t('bulkPhotoUpload.photosSelected', {count: photos.length})}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <AlertCircle size={20} color="#F59E0B" />
              <Text style={styles.summaryText}>
                {t('bulkPhotoUpload.validPhotos', {count: validPhotosCount})}
              </Text>
            </View>
            {validPhotosCount < photos.length && (
              <Text style={styles.warningText}>{t('bulkPhotoUpload.missingMetadataWarning')}</Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleCancel}
            disabled={processing}
          >
            <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (processing || photos.length === 0) && styles.buttonDisabled,
            ]}
            onPress={handleProcess}
            disabled={processing || photos.length === 0}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{t('bulkPhotoUpload.process')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  instructionsContainer: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1E40AF',
  },
  instructionsText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  radioOptionSelected: {
    borderColor: '#1E40AF',
    backgroundColor: '#EFF6FF',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioCircleSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1E40AF',
  },
  radioContent: {
    flex: 1,
  },
  radioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#1E40AF',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  warningText: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  bottomSpacer: {
    height: 20,
  },
})
