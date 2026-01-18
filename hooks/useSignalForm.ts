import {useState, useCallback} from 'react'
import {Alert, ScrollView} from 'react-native'
import {useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import * as ImagePicker from 'expo-image-picker'
import {CameraView} from 'expo-camera'
import {convertGPSToDecimal, parseExifDateTime} from '../lib/exifUtils'

interface PhotoFile {
  uri: string
  id: string
}

interface MapObject {
  id: string
  name: string
  type: string
  distance: number
}

interface UseSignalFormProps {
  prefilledMapObject: MapObject | null
  prefilledObjectType: string | null
  scrollViewRef: React.RefObject<ScrollView | null>
  setCurrentLocation: (location: {latitude: number; longitude: number} | null) => void
  setCurrentDateTime: (date: Date) => void
  setNearbyObjects: (objects: MapObject[]) => void
}

export function useSignalForm({
  prefilledMapObject,
  prefilledObjectType,
  scrollViewRef,
  setCurrentLocation,
  setCurrentDateTime,
  setNearbyObjects,
}: UseSignalFormProps) {
  const router = useRouter()
  const {t} = useTranslation()

  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [selectedObjectType, setSelectedObjectType] = useState<string | null>(
    prefilledObjectType ?? 'waste-container'
  )
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const resetFormState = useCallback(() => {
    setPhotos([])
    setNearbyObjects([])
    setSelectedObjectType(null)
    setSelectedStates([])
    setDescription('')
    setCurrentLocation(null)

    // Clear URL params
    router.setParams({
      containerPublicNumber: undefined,
      containerName: undefined,
      containerLocation: undefined,
      prefilledObjectType: undefined,
    })
    // Scroll to top
    scrollViewRef.current?.scrollTo({y: 0, animated: true})
  }, [router, scrollViewRef, setCurrentLocation, setNearbyObjects])

  const takePhoto = useCallback(
    async (cameraRef: React.RefObject<CameraView | null>) => {
      if (!cameraRef.current) return

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        })

        if (photo) {
          const newPhoto: PhotoFile = {
            uri: photo.uri,
            id: Date.now().toString(),
          }
          setPhotos((prev) => [...prev, newPhoto])
        }
      } catch (error) {
        console.error('Error taking photo:', error)
        Alert.alert(t('common.error'), t('newSignal.photoError'))
      }
    },
    [t]
  )

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const pickImageFromGallery = useCallback(async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permissionResult.granted) {
        Alert.alert(t('common.error'), t('newSignal.galleryPermissionRequired'))
        return
      }

      // Pick image with EXIF data
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        exif: true, // Request EXIF data
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]

        // Add photo to list
        const newPhoto: PhotoFile = {
          uri: asset.uri,
          id: Date.now().toString(),
        }
        setPhotos((prev) => [...prev, newPhoto])

        // Extract and update location from EXIF if available
        if (asset.exif) {
          const {GPSLatitude, GPSLongitude, GPSLatitudeRef, GPSLongitudeRef} = asset.exif

          if (GPSLatitude && GPSLongitude) {
            // Convert GPS coordinates to decimal degrees
            const lat = convertGPSToDecimal(GPSLatitude, GPSLatitudeRef)
            const lon = convertGPSToDecimal(GPSLongitude, GPSLongitudeRef)

            if (lat && lon) {
              setCurrentLocation({
                latitude: lat,
                longitude: lon,
              })
              Alert.alert(t('newSignal.metadataFound'), t('newSignal.metadataLocationUpdated'))
            }
          }

          // Extract and update datetime from EXIF if available
          const dateTimeOriginal = asset.exif.DateTimeOriginal || asset.exif.DateTime
          if (dateTimeOriginal) {
            // Parse EXIF datetime format: "YYYY:MM:DD HH:MM:SS"
            const parsedDate = parseExifDateTime(dateTimeOriginal)
            if (parsedDate) {
              setCurrentDateTime(parsedDate)
              Alert.alert(t('newSignal.metadataFound'), t('newSignal.metadataDateTimeUpdated'))
            }
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert(t('common.error'), t('newSignal.photoError'))
    }
  }, [t, setCurrentLocation, setCurrentDateTime])

  const toggleState = useCallback((state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    )
  }, [])

  const handleCancel = useCallback(
    (selectedObject: MapObject | null, returnTo?: string) => {
      if (photos.length > 0 || description.trim() || selectedObject) {
        Alert.alert(t('common.confirm'), t('newSignal.cancelConfirm'), [
          {text: t('common.no'), style: 'cancel'},
          {
            text: t('common.yes'),
            onPress: () => {
              resetFormState()
              if (returnTo) {
                router.push(returnTo as any)
              } else {
                router.back()
              }
            },
          },
        ])
      } else {
        resetFormState()
        if (returnTo) {
          router.push(returnTo as any)
        } else {
          router.back()
        }
      }
    },
    [photos, description, t, resetFormState, router]
  )

  return {
    // State
    photos,
    selectedObjectType,
    setSelectedObjectType,
    selectedStates,
    description,
    setDescription,
    loading,
    setLoading,

    // Actions
    takePhoto,
    removePhoto,
    pickImageFromGallery,
    toggleState,
    resetFormState,
    handleCancel,
  }
}
