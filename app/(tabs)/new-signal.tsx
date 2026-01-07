import React, {useState, useRef} from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'expo-router'
import {CameraView, useCameraPermissions} from 'expo-camera'
import * as Location from 'expo-location'
import {X, MapPin as MapPinIcon} from 'lucide-react-native'
import {createSignal} from '../../lib/payload'
import {getUniqueReporterId} from '../../lib/deviceId'
import type {CreateSignalInput} from '../../types/signal'

const {height} = Dimensions.get('window')

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

export default function NewScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const cameraRef = useRef<CameraView>(null)

  const [permission, requestPermission] = useCameraPermissions()
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [selectedObject, setSelectedObject] = useState<MapObject | null>(null)
  const [selectedObjectType, setSelectedObjectType] = useState<string | null>(null)
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [nearbyObjects, setNearbyObjects] = useState<MapObject[]>([])
  const [loading, setLoading] = useState(false)
  const [deviceId, setDeviceId] = useState<string>('')
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())

  // Mock nearby objects
  // TODO: replace with actual API call
  const mockNearbyObjects: MapObject[] = [
    {id: '1', name: 'Контейнер #123', type: 'waste-container', distance: 15},
    {id: '2', name: 'Контейнер #124', type: 'waste-container', distance: 28},
  ]

  const objectTypes = [
    {id: 'waste-container', label: t('newSignal.objectTypes.wasteContainer')},
    {id: 'street-light', label: t('newSignal.objectTypes.streetLight')},
    {id: 'road-damage', label: t('newSignal.objectTypes.roadDamage')},
    {id: 'park-bench', label: t('newSignal.objectTypes.parkBench')},
    {id: 'playground', label: t('newSignal.objectTypes.playground')},
    {id: 'drinking-fountain', label: t('newSignal.objectTypes.drinkingFountain')},
    {id: 'tree', label: t('newSignal.objectTypes.tree')},
    {id: 'car', label: t('newSignal.objectTypes.car')},
    {id: 'pole', label: t('newSignal.objectTypes.pole')},
    {id: 'other', label: t('newSignal.objectTypes.other')},
  ]

  // Request location and load nearby objects
  React.useEffect(() => {
    loadNearbyObjects()
  }, [])

  // Get device unique ID from secure storage
  React.useEffect(() => {
    getUniqueReporterId()
      .then((id) => {
        setDeviceId(id)
      })
      .catch((error) => {
        console.error('Failed to get reporter ID:', error)
      })
  }, [])

  // Update date/time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadNearbyObjects = async () => {
    try {
      const {status} = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })
      // TODO: Fetch nearby objects from API based on location
      setNearbyObjects(mockNearbyObjects)
    } catch (error) {
      console.error('Error loading nearby objects:', error)
    }
  }

  const takePhoto = async () => {
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
        setPhotos([...photos, newPhoto])
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert(t('common.error'), t('newSignal.photoError'))
    }
  }

  const removePhoto = (id: string) => {
    setPhotos(photos.filter((p) => p.id !== id))
  }

  const toggleState = (state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    )
  }

  const handleSubmit = async () => {
    if (!selectedObjectType) {
      Alert.alert(t('common.error'), t('newSignal.selectObjectType'))
      return
    }

    // Validate container states for waste-container type
    if (selectedObjectType === 'waste-container' && selectedStates.length === 0) {
      Alert.alert(t('common.error'), t('newSignal.selectContainerState'))
      return
    }

    if (!currentLocation) {
      Alert.alert(t('common.error'), t('signals.locationPermissionRequired'))
      return
    }

    setLoading(true)
    try {
      // Determine category from selected object or object type
      let category: CreateSignalInput['category'] = 'other'
      let cityObject: CreateSignalInput['cityObject'] | undefined
      let title = ''

      if (selectedObjectType) {
        // Map object type to category
        const categoryMap: Record<string, CreateSignalInput['category']> = {
          'waste-container': 'waste-container',
          'street-light': 'lighting',
          'road-damage': 'street-damage',
          'park-bench': 'green-spaces',
          playground: 'green-spaces',
          'drinking-fountain': 'other',
          tree: 'green-spaces',
          car: 'parking',
          pole: 'other',
          other: 'other',
        }
        category = categoryMap[selectedObjectType] || 'other'

        // Create city object reference
        cityObject = {
          type: selectedObjectType as any,
          name: selectedObject ? selectedObject.name : undefined,
        }

        // Generate signal title from object type and states
        if (selectedObjectType === 'waste-container' && selectedStates.length > 0) {
          const statesText = selectedStates
            .map((state) => t(`signals.containerStates.${state}`))
            .join(', ')
          title = `${t('newSignal.objectTypes.wasteContainer')} - ${statesText}`
        } else {
          title = t(`newSignal.objectTypes.${selectedObjectType.replace('-', '')}`)
        }
      } else if (selectedObject) {
        // Selected an existing nearby object
        title = selectedObject.name
        category = selectedObject.type as CreateSignalInput['category']
        cityObject = {
          type: selectedObject.type as any,
          referenceId: selectedObject.id,
          name: selectedObject.name,
        }
      }

      // Prepare signal data
      const signalData: CreateSignalInput = {
        title,
        description: description.trim(),
        category,
        cityObject,
        containerState: selectedStates.length > 0 ? (selectedStates as any) : undefined,
        location: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        reporterUniqueId: deviceId,
      }

      console.log('[handleSubmit] Creating signal:', signalData)

      // Prepare photos for upload
      const photoFiles = photos.map((photo) => ({
        uri: photo.uri,
        type: 'image/jpeg',
        name: `signal-photo-${photo.id}.jpg`,
      }))

      // Create signal via API with photos
      const newSignal = await createSignal(
        signalData,
        t('common.header') === 'Твоята София' ? 'bg' : 'en',
        photoFiles.length > 0 ? photoFiles : undefined,
        deviceId
      )

      console.log('[handleSubmit] Signal created:', newSignal.id)

      Alert.alert(t('signals.success'), '', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form state
            setPhotos([])
            setSelectedObject(null)
            setSelectedObjectType(null)
            setSelectedStates([])
            setDescription('')

            // Navigate to signals tab
            router.push('/(tabs)/signals')
          },
        },
      ])
    } catch (error) {
      console.error('Error creating signal:', error)
      Alert.alert(
        t('signals.error'),
        error instanceof Error ? error.message : t('newSignal.submitError')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (photos.length > 0 || description.trim() || selectedObject) {
      Alert.alert(t('common.confirm'), t('newSignal.cancelConfirm'), [
        {text: t('common.no'), style: 'cancel'},
        {text: t('common.yes'), onPress: () => router.back()},
      ])
    } else {
      router.back()
    }
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Camera Section */}
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
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
            <View style={styles.cameraOverlay}>
              <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>

        {/* Photo Chips */}
        {photos.length > 0 && (
          <View style={styles.photosContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((photo) => (
                <View key={photo.id} style={styles.photoChip}>
                  <Text style={styles.photoChipText} numberOfLines={1}>
                    {t('newSignal.photo')} {photos.indexOf(photo) + 1}
                  </Text>
                  <TouchableOpacity onPress={() => removePhoto(photo.id)}>
                    <X size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Nearby Objects Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('newSignal.nearbyObjects')}</Text>

          {/* New Object Option */}
          <TouchableOpacity
            style={[styles.objectCard, !selectedObject && styles.objectCardSelected]}
            onPress={() => setSelectedObject(null)}
          >
            <View style={styles.objectInfo}>
              <MapPinIcon size={20} color="#1E40AF" />
              <Text style={styles.objectName}>{t('newSignal.newObject')}</Text>
            </View>
          </TouchableOpacity>

          {/* Nearby Objects List */}
          {nearbyObjects.length > 0 ? (
            nearbyObjects.map((obj) => (
              <TouchableOpacity
                key={obj.id}
                style={[styles.objectCard, selectedObject === obj && styles.objectCardSelected]}
                onPress={() => setSelectedObject(obj)}
              >
                <View style={styles.objectInfo}>
                  <MapPinIcon size={20} color="#6B7280" />
                  <View>
                    <Text style={styles.objectName}>{obj.name}</Text>
                    <Text style={styles.objectDistance}>
                      {obj.distance}
                      {t('newSignal.distance')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('newSignal.noNearbyObjects')}</Text>
          )}
        </View>

        {/* Object Type Selection - only show when new object is selected */}
        {!selectedObject && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('newSignal.objectType')}</Text>
            <View style={styles.typeChipsContainer}>
              {objectTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeChip,
                    selectedObjectType === type.id && styles.typeChipSelected,
                  ]}
                  onPress={() => setSelectedObjectType(type.id)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      selectedObjectType === type.id && styles.typeChipTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('newSignal.objectState')} *</Text>
          <View style={styles.stateTagsContainer}>
            {['full', 'dirty', 'damaged', 'for-collection', 'maintenance', 'fallen'].map(
              (state) => {
                const getStateColor = (state: string) => {
                  switch (state) {
                    case 'full':
                      return '#DC2626' // Red
                    case 'dirty':
                      return '#92400E' // Brown
                    case 'damaged':
                      return '#1F2937' // Black/Dark Gray
                    case 'for-collection':
                      return '#3B82F6' // Blue
                    case 'maintenance':
                      return '#F97316' // Orange
                    case 'fallen':
                      return '#7C3AED' // Purple
                    default:
                      return '#1E40AF' // Default Blue
                  }
                }

                const stateColor = getStateColor(state)
                const isActive = selectedStates.includes(state)

                return (
                  <TouchableOpacity
                    key={state}
                    style={[
                      styles.stateTag,
                      isActive && {
                        backgroundColor: stateColor,
                        borderColor: stateColor,
                      },
                    ]}
                    onPress={() => toggleState(state)}
                    disabled={loading}
                  >
                    <Text style={[styles.stateTagText, isActive && styles.stateTagTextActive]}>
                      {t(`signals.containerStates.${state}`)}
                    </Text>
                  </TouchableOpacity>
                )
              }
            )}
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('newSignal.description')}</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder={t('newSignal.descriptionPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>{t('newSignal.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? t('newSignal.submitting') : t('newSignal.submit')}
            </Text>
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
    marginBottom: 20,
  },
  cameraContainer: {
    height: height * 0.4,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
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
  photosContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  photoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 8,
  },
  photoChipText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  objectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  objectCardSelected: {
    borderColor: '#1E40AF',
    backgroundColor: '#EFF6FF',
  },
  objectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  objectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  objectDistance: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  typeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  typeChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E40AF',
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeChipTextSelected: {
    color: '#1E40AF',
  },
  stateTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stateTag: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  stateTagText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  stateTagTextActive: {
    color: '#ffffff',
  },
  descriptionInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
