import React, {useState, useRef, useCallback} from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native'
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view'
import {useTranslation} from 'react-i18next'
import {useRouter, useLocalSearchParams} from 'expo-router'
import {useFocusEffect} from '@react-navigation/native'
import {CameraView, useCameraPermissions} from 'expo-camera'
import {X, MapPin as MapPinIcon, Upload} from 'lucide-react-native'
import {WasteContainerForm, type WasteContainerFormData} from '../../../forms/waste-container'
import {
  createWasteContainer,
  updateWasteContainer,
  fetchWasteContainerById,
} from '../../../lib/payload'
import {useAuth} from '../../../contexts/AuthContext'
import {FullScreenPhotoViewer} from '../../../components/FullScreenPhotoViewer'
import * as ImagePicker from 'expo-image-picker'
import type {WasteContainer} from '../../../types/wasteContainer'

const {height} = Dimensions.get('window')

interface Photo {
  id: string
  uri: string
}

export default function NewCityObjectScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams()
  const cameraRef = useRef<CameraView>(null)
  const formRef = useRef<any>(null)
  const {isContainerAdmin, token} = useAuth()

  // Check if we're editing an existing container
  const containerId = params.containerId as string | undefined
  const isEditing = !!containerId

  const [permission, requestPermission] = useCameraPermissions()
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [photos, setPhotos] = useState<Photo[]>([])
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingContainer, setLoadingContainer] = useState(isEditing)
  const [container, setContainer] = useState<WasteContainer | undefined>(undefined)
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  // Hide camera temporarily before navigation to avoid iOS Fabric unmount assertion
  const [showCamera, setShowCamera] = useState(true)

  // Check permissions
  React.useEffect(() => {
    if (!isContainerAdmin && isEditing) {
      Alert.alert(t('common.error'), t('newCityObject.adminOnly'), [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ])
    }
  }, [isContainerAdmin, isEditing, t, router])

  // Load existing container if editing
  React.useEffect(() => {
    if (isEditing && containerId) {
      loadContainer(containerId)
    }
  }, [isEditing, containerId])

  const loadContainer = async (id: string) => {
    try {
      setLoadingContainer(true)
      const data = await fetchWasteContainerById(id)
      setContainer(data)
      setCurrentLocation({
        latitude: data.location.latitude,
        longitude: data.location.longitude,
      })
    } catch (error) {
      console.error('Error loading container:', error)
      Alert.alert(t('common.error'), t('newCityObject.loadError'), [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ])
    } finally {
      setLoadingContainer(false)
    }
  }

  // Update date/time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Get current location
  React.useEffect(() => {
    if (!isEditing && !currentLocation) {
      // Use a default Sofia location if we can't get user location
      setCurrentLocation({
        latitude: 42.6977,
        longitude: 23.3219,
      })
    }
  }, [isEditing, currentLocation])

  const takePhoto = async () => {
    if (!cameraRef.current) return

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        exif: true,
      })

      if (photo) {
        const newPhoto: Photo = {
          id: Date.now().toString(),
          uri: photo.uri,
        }

        setPhotos((prev) => [...prev, newPhoto])
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert(t('common.error'), t('newSignal.photoError'))
    }
  }

  const pickImageFromGallery = async () => {
    try {
      const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('newSignal.galleryPermissionRequired'))
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        exif: true,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]

        const newPhoto: Photo = {
          id: Date.now().toString(),
          uri: asset.uri,
        }

        setPhotos((prev) => [...prev, newPhoto])
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert(t('common.error'), t('newSignal.photoError'))
    }
  }

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
  }

  const handleCancel = useCallback(() => {
    setShowCamera(false)
    setTimeout(() => router.back(), 80)
  }, [router])

  const handleSubmit = async (formData: WasteContainerFormData) => {
    if (!isContainerAdmin) {
      Alert.alert(t('common.error'), t('newCityObject.adminOnly'))
      return
    }

    setLoading(true)
    try {
      // Prepare photo files for upload
      const photoFiles =
        photos.length > 0
          ? photos.map((photo) => ({
              uri: photo.uri,
              type: 'image/jpeg',
              name: `container-${formData.publicNumber}-${photo.id}.jpg`,
            }))
          : undefined

      if (isEditing && containerId) {
        // Update existing container
        if (!token) {
          throw new Error('Authentication required')
        }
        await updateWasteContainer(containerId, formData, token, photoFiles?.[0])
        Alert.alert(t('common.success'), t('newCityObject.updateSuccess'), [
          {
            text: 'OK',
            onPress: () => {
              setShowCamera(false)
              setTimeout(() => router.back(), 80)
            },
          },
        ])
      } else {
        // Create new container
        if (!token) {
          throw new Error('Authentication required')
        }
        await createWasteContainer(formData, token, photoFiles?.[0])
        Alert.alert(t('common.success'), t('newCityObject.createSuccess'), [
          {
            text: 'OK',
            onPress: () => {
              setPhotos([])
              setShowCamera(false)
              setTimeout(() => router.back(), 80)
            },
          },
        ])
      }
    } catch (error) {
      console.error('Error submitting container:', error)
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('newCityObject.createError')
      )
    } finally {
      setLoading(false)
    }
  }

  // Reset form when tab is focused
  useFocusEffect(
    useCallback(() => {
      if (!isEditing) {
        setPhotos([])
        setShowCamera(true)
      }
    }, [isEditing])
  )

  if (loadingContainer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.messageText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.messageText}>{t('newSignal.loading')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.messageText}>{t('newSignal.cameraPermissionRequired')}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>{t('newSignal.allowAccess')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={{paddingBottom: 20}}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={false}
        extraScrollHeight={Platform.OS === 'ios' ? 120 : 80}
      >
        {/* Camera Section */}
        <View style={styles.cameraContainer}>
          {showCamera && !isEditing ? (
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          ) : (
            <View style={styles.camera} />
          )}
          {/* Coordinates Overlay */}
          {currentLocation && (
            <View style={styles.coordinatesOverlay}>
              <MapPinIcon size={14} color="#fff" />
              <Text style={styles.coordinatesText}>
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Text>
            </View>
          )}
          {/* Date/Time Overlay */}
          <View style={styles.dateTimeOverlay}>
            <Text style={styles.dateTimeText}>
              {currentDateTime.toLocaleDateString('bg-BG', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}{' '}
              {currentDateTime.toLocaleTimeString('bg-BG', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </Text>
          </View>
          {!isEditing && (
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraButtonsContainer}>
                <View style={styles.uploadButtonPlaceholder} />
                <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadButton} onPress={pickImageFromGallery}>
                  <Upload size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Photo Chips */}
        {photos.length > 0 && (
          <View style={styles.photosContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((photo) => (
                <View key={photo.id} style={styles.photoChip}>
                  <TouchableOpacity
                    onPress={() => setViewingPhoto(photo.uri)}
                    style={styles.photoThumbnailContainer}
                  >
                    <Image source={{uri: photo.uri}} style={styles.photoThumbnail} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removePhoto(photo.id)}
                    style={styles.photoRemoveButton}
                  >
                    <X size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Container Form */}
        <WasteContainerForm
          ref={formRef}
          container={container}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={loading}
          isEditing={true}
          canEdit={isContainerAdmin}
        />
      </KeyboardAwareScrollView>

      {/* Full-Screen Photo Viewer */}
      <FullScreenPhotoViewer
        visible={viewingPhoto !== null}
        photoUri={viewingPhoto}
        onClose={() => setViewingPhoto(null)}
      />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  cameraContainer: {
    height: height * 0.4,
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
  },
  cameraButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  uploadButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(30, 64, 175, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonPlaceholder: {
    width: 50,
    height: 50,
  },
  photosContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  photoChip: {
    position: 'relative',
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  photoThumbnailContainer: {
    width: 80,
    height: 80,
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  coordinatesOverlay: {
    position: 'absolute',
    bottom: 1,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    zIndex: 1,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  dateTimeOverlay: {
    position: 'absolute',
    bottom: 1,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    zIndex: 1,
  },
  dateTimeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'right',
  },
  primaryButton: {
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
})
