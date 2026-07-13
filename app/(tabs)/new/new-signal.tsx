import React, {useState, useRef, useCallback} from 'react'
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
  ActivityIndicator,
  Image,
  Platform,
  Modal,
  Linking,
} from 'react-native'
import MapView, {Marker, type Region} from 'react-native-maps'
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view'
import {useTranslation} from 'react-i18next'
import {useRouter, useLocalSearchParams} from 'expo-router'
import {useFocusEffect} from '@react-navigation/native'
import {CameraView, useCameraPermissions} from 'expo-camera'
import {X, MapPin as MapPinIcon, Upload} from 'lucide-react-native'
import * as Location from 'expo-location'
import {createSignal} from '../../../lib/payload'
import {getUniqueReporterId} from '../../../lib/deviceId'
import type {CreateSignalInput} from '../../../types/signal'
import {CONTAINER_STATES, getStateColor} from '../../../types/wasteContainer'
import {useNearbyObjects} from '../../../hooks/useNearbyObjects'
import {useSignalForm} from '../../../hooks/useSignalForm'
import {FullScreenPhotoViewer} from '../../../components/FullScreenPhotoViewer'
import {useAuth} from '@/contexts/AuthContext'
import {getDistanceFromLatLonInMeters} from '@/lib/mapUtils'
import {colors, fonts, fontSizes} from '@/styles/tokens'

const {height} = Dimensions.get('window')

const SOFIA_DEFAULT_REGION: Region = {
  latitude: 42.6977,
  longitude: 23.3219,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
}

interface MapObject {
  id: string
  name: string
  type: string
  distance: number
}

export default function NewSignal() {
  const {t} = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams()
  const {isContainerAdmin, token} = useAuth()
  const cameraRef = useRef<CameraView>(null)
  const scrollViewRef = useRef<ScrollView>(null)

  // Prepopulated data from container create a mapObject from params if available
  const prefilledMapObject: MapObject | null = React.useMemo(
    () =>
      params.containerPublicNumber
        ? {
            id: params.containerPublicNumber as string,
            name: params.containerName as string,
            type: params.prefilledObjectType as string,
            distance: 0,
          }
        : null,
    [params.containerPublicNumber, params.containerName, params.prefilledObjectType]
  )

  const containerLocation = React.useMemo(
    () => (params.containerLocation ? JSON.parse(params.containerLocation as string) : undefined),
    [params.containerLocation]
  )
  const prefilledObjectType = (params.prefilledObjectType as string) || null

  const [permission, requestPermission] = useCameraPermissions()
  const [deviceId, setDeviceId] = useState<string>('')
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [selectedObject, setSelectedObject] = useState<MapObject | null>(prefilledMapObject)
  const [uploadProgress, setUploadProgress] = useState<{
    stage: 'creating' | 'uploading' | null
    current: number
    total: number
  }>({stage: null, current: 0, total: 0})
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  const [showObjectLocationMap, setShowObjectLocationMap] = useState(false)
  const [pendingPinCoord, setPendingPinCoord] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  // Hide camera temporarily before navigation to avoid iOS Fabric unmount assertion
  const [showCamera, setShowCamera] = useState(true)

  // Use nearby objects hook
  const {
    nearbyObjects,
    setNearbyObjects,
    loadingNearbyObjects,
    currentLocation,
    setCurrentLocation,
    locationPermissionDenied,
    loadNearbyObjects: loadNearbyObjectsCallback,
  } = useNearbyObjects({
    selectedObject,
    containerLocation,
  })

  // Use signal form hook
  const {
    photos,
    selectedObjectType,
    setSelectedObjectType,
    selectedStates,
    description,
    setDescription,
    loading,
    setLoading,
    takePhoto: takePhotoAction,
    removePhoto,
    pickImageFromGallery,
    toggleState,
    resetFormState: resetFormStateAction,
  } = useSignalForm({
    prefilledMapObject,
    prefilledObjectType,
    scrollViewRef,
    setCurrentLocation,
    setCurrentDateTime,
    setNearbyObjects,
  })

  // Wrapper for resetFormState to also reset selectedObject
  const resetFormState = useCallback(() => {
    setSelectedObject(null)
    resetFormStateAction()
    // Ensure camera is visible when the form is reset (e.g., when tab focused)
    setShowCamera(true)
  }, [resetFormStateAction])

  // Wrapper for handleCancel to pass selectedObject and returnTo
  const handleCancel = useCallback(() => {
    // Hide camera first to ensure native camera view is unmounted cleanly
    setShowCamera(false)
    // small delay to allow native unmount to complete
    const returnTo = params.returnTo as string | undefined
    setTimeout(() => {
      if (returnTo) {
        router.replace(returnTo as any)
      } else {
        router.back()
      }
    }, 80)
  }, [router, params.returnTo])

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

  // Set default object type to waste-container
  React.useEffect(() => {
    if (!prefilledObjectType && !selectedObjectType) {
      setSelectedObjectType('waste-container')
    }
  }, [prefilledObjectType, selectedObjectType, setSelectedObjectType])

  // Load nearby containers when selectedObject becomes null
  React.useEffect(() => {
    console.log('[useEffect] selectedObject changed:', selectedObject?.name)
    console.log('[useEffect] prefilledMapObject:', prefilledMapObject?.name)
    if (!selectedObject && !prefilledMapObject) {
      loadNearbyObjectsCallback(selectedObject)
    }
  }, [selectedObject, prefilledMapObject, loadNearbyObjectsCallback])

  // Update form when params change (e.g., user selects different container)
  React.useEffect(() => {
    if (prefilledMapObject) {
      setSelectedObject(prefilledMapObject)
      setSelectedObjectType(prefilledObjectType ?? 'waste-container')
      setNearbyObjects([prefilledMapObject])
      if (containerLocation) {
        setCurrentLocation(containerLocation)
      }
    }
  }, [
    params.containerPublicNumber,
    params.containerName,
    params.containerLocation,
    prefilledMapObject,
    prefilledObjectType,
    containerLocation,
    setNearbyObjects,
    setCurrentLocation,
    setSelectedObjectType,
  ])

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

  // Wrapper for takePhoto to pass cameraRef
  const takePhoto = async () => {
    await takePhotoAction(cameraRef)
  }

  // Reset form when tab is focused/clicked
  useFocusEffect(
    useCallback(() => {
      // Only reset if there are no prefilled params
      if (!params.containerPublicNumber) {
        resetFormState()
        // Reload nearby containers
        loadNearbyObjectsCallback(null)
      }
    }, [params.containerPublicNumber, resetFormState, loadNearbyObjectsCallback])
  )

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

    // Proximity check: waste-container signals require user to be within 30m
    if (selectedObjectType === 'waste-container' && selectedObject && !isContainerAdmin) {
      if (containerLocation) {
        // Prefilled from map — containerLocation is known, get fresh GPS
        try {
          const {status} = await Location.requestForegroundPermissionsAsync()
          if (status === 'granted') {
            const gps = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            })
            const dist = getDistanceFromLatLonInMeters(
              gps.coords.latitude,
              gps.coords.longitude,
              containerLocation.latitude,
              containerLocation.longitude
            )
            if (dist > 30) {
              Alert.alert(t('common.error'), t('signals.proximityError'))
              return
            }
          }
        } catch {
          // GPS unavailable — backend will enforce
        }
      } else if (selectedObject.distance > 0 && selectedObject.distance > 30) {
        // Selected from nearby list — distance was calculated at load time
        Alert.alert(t('common.error'), t('signals.proximityError'))
        return
      }
    }

    setLoading(true)
    setUploadProgress({stage: 'creating', current: 0, total: photos.length})
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
          // Include referenceId if a specific object was selected
          referenceId: selectedObject ? selectedObject.id : undefined,
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
        photoFiles.length > 0 ? photoFiles : undefined,
        deviceId,
        token || undefined,
        (current, total) => {
          setUploadProgress({stage: 'uploading', current, total})
        }
      )

      console.log('[handleSubmit] Signal created:', newSignal.id)

      Alert.alert(t('signals.success'), '', [
        {
          text: 'OK',
          onPress: async () => {
            // Hide camera first so the native camera view unmounts before navigation.
            setShowCamera(false)
            // Small delay to allow unmount to happen cleanly on iOS Fabric
            await new Promise((r) => setTimeout(r, 80))

            // Reset form state
            resetFormState()

            // Navigate back with containerId if available
            const returnTo = params.returnTo as string | undefined
            const containerId = params.containerId as string | undefined

            if (returnTo && containerId) {
              router.push({
                pathname: returnTo as any,
                params: {refreshContainerId: containerId},
              })
            } else if (returnTo) {
              router.push(returnTo as any)
            } else {
              router.back()
            }
          },
        },
      ])
    } catch (error) {
      console.error('Error creating signal:', error)
      setUploadProgress({stage: null, current: 0, total: 0})
      Alert.alert(
        t('signals.error'),
        error instanceof Error ? error.message : t('newSignal.submitError')
      )
    } finally {
      setLoading(false)
      setUploadProgress({stage: null, current: 0, total: 0})
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
          {showCamera ? (
            <CameraView ref={cameraRef} style={styles.camera} facing="back" flash="auto" />
          ) : (
            // Keep a placeholder view to preserve layout while camera is hidden
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
                    <X size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Location Required Banner */}
        {!currentLocation && !loadingNearbyObjects && (
          <View style={styles.locationBanner}>
            <MapPinIcon size={20} color={colors.error} />
            <View style={styles.locationBannerContent}>
              <Text style={styles.locationBannerText}>{t('newSignal.locationRequiredBanner')}</Text>
              <TouchableOpacity
                style={styles.locationBannerButton}
                onPress={() => {
                  if (locationPermissionDenied) {
                    Linking.openSettings()
                  } else {
                    loadNearbyObjectsCallback(null)
                  }
                }}
              >
                <Text style={styles.locationBannerButtonText}>{t('newSignal.enableLocation')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Nearby Objects Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('newSignal.nearbyObjects')}</Text>

          {/* New Object Option - hidden when launched from a container card */}
          {!prefilledMapObject && (
            <TouchableOpacity
              style={[styles.objectCard, !selectedObject && styles.objectCardSelected]}
              onPress={() => {
                setSelectedObject(null)
                setPendingPinCoord(currentLocation)
                setShowObjectLocationMap(true)
              }}
            >
              <View style={styles.objectInfo}>
                <MapPinIcon size={20} color={colors.primary} />
                <Text style={styles.objectName}>{t('newSignal.newObject')}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Nearby Objects List */}
          {loadingNearbyObjects ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>{t('newSignal.loadingNearbyObjects')}</Text>
            </View>
          ) : nearbyObjects.length > 0 ? (
            nearbyObjects.map((obj) => (
              <TouchableOpacity
                key={obj.id}
                style={[
                  styles.objectCard,
                  selectedObject?.id === obj.id && styles.objectCardSelected,
                ]}
                onPress={() => {
                  setSelectedObject(obj)
                  setSelectedObjectType('waste-container')
                }}
              >
                <View style={styles.objectInfo}>
                  <MapPinIcon size={20} color={colors.textSecondary} />
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
                    type.id !== 'waste-container' && styles.typeChipDisabled,
                  ]}
                  onPress={() => setSelectedObjectType(type.id)}
                  disabled={type.id !== 'waste-container'}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      selectedObjectType === type.id && styles.typeChipTextSelected,
                      type.id !== 'waste-container' && styles.typeChipTextDisabled,
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
            {CONTAINER_STATES.map((state) => {
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
            })}
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('newSignal.description')}</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder={t('newSignal.descriptionPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Upload Progress */}
        {uploadProgress.stage && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {uploadProgress.stage === 'creating'
                ? t('newSignal.creatingSignal')
                : `${t('newSignal.uploadingPhotos')} ${uploadProgress.current}/${uploadProgress.total}`}
            </Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width:
                      uploadProgress.stage === 'creating'
                        ? '50%'
                        : `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

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
            style={[styles.primaryButton, (loading || !currentLocation) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !currentLocation}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? t('newSignal.submitting') : t('newSignal.submit')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </KeyboardAwareScrollView>

      {/* Full-Screen Photo Viewer */}
      <FullScreenPhotoViewer
        visible={viewingPhoto !== null}
        photoUri={viewingPhoto}
        onClose={() => setViewingPhoto(null)}
      />

      {/* New Object Location Map Modal */}
      <Modal
        visible={showObjectLocationMap}
        animationType="slide"
        onRequestClose={() => setShowObjectLocationMap(false)}
      >
        <SafeAreaView style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <Text style={styles.mapModalTitle}>{t('newSignal.selectObjectLocation')}</Text>
            <TouchableOpacity
              onPress={() => setShowObjectLocationMap(false)}
              style={styles.mapModalCloseButton}
            >
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <MapView
            style={styles.mapModalMap}
            initialRegion={
              pendingPinCoord
                ? {
                    latitude: pendingPinCoord.latitude,
                    longitude: pendingPinCoord.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }
                : SOFIA_DEFAULT_REGION
            }
            onPress={(e) => setPendingPinCoord(e.nativeEvent.coordinate)}
          >
            {pendingPinCoord && (
              <Marker
                coordinate={pendingPinCoord}
                draggable
                onDragEnd={(e) => setPendingPinCoord(e.nativeEvent.coordinate)}
              />
            )}
          </MapView>
          <View style={styles.mapModalFooter}>
            <Text style={styles.mapModalHint}>
              {pendingPinCoord
                ? `${pendingPinCoord.latitude.toFixed(5)}, ${pendingPinCoord.longitude.toFixed(5)}`
                : t('newSignal.tapMapToSetLocation')}
            </Text>
            <TouchableOpacity
              style={[styles.mapModalConfirmButton, !pendingPinCoord && styles.buttonDisabled]}
              disabled={!pendingPinCoord}
              onPress={() => {
                if (pendingPinCoord) {
                  setCurrentLocation(pendingPinCoord)
                }
                setShowObjectLocationMap(false)
              }}
            >
              <Text style={styles.primaryButtonText}>{t('newSignal.confirmObjectLocation')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
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
    backgroundColor: colors.surface2,
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
  photoChipText: {
    fontSize: fontSizes.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
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
    fontSize: fontSizes.caption,
    color: '#fff',
    fontFamily: fonts.semiBold,
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
    fontSize: fontSizes.caption,
    color: '#fff',
    fontFamily: fonts.semiBold,
    textAlign: 'right',
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  locationBannerContent: {
    flex: 1,
    gap: 10,
  },
  locationBannerText: {
    fontSize: fontSizes.bodySm,
    color: colors.textPrimary,
  },
  locationBannerButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  locationBannerButtonText: {
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.semiBold,
    color: '#fff',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: colors.textPrimary,
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
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  objectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  objectName: {
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  objectDistance: {
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: fontSizes.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  loadingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
  },
  typeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surface2,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: 100,
    alignItems: 'center',
  },
  typeChipSelected: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary,
  },
  typeChipDisabled: {
    opacity: 0.4,
    backgroundColor: colors.surface2,
  },
  typeChipText: {
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },
  typeChipTextSelected: {
    color: colors.primary,
  },
  typeChipTextDisabled: {
    color: colors.textMuted,
  },
  stateTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stateTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: 100,
    alignItems: 'center',
  },
  stateTagText: {
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
  },
  stateTagTextActive: {
    color: colors.surface,
  },
  descriptionInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  progressText: {
    fontSize: fontSizes.bodySm,
    color: colors.primary,
    fontFamily: fonts.semiBold,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: fontSizes.body,
    fontFamily: fonts.bold,
    color: '#fff',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: fontSizes.body,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  bottomSpacer: {
    height: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  mapModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fff',
  },
  mapModalTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  mapModalCloseButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  mapModalMap: {
    flex: 1,
  },
  mapModalFooter: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  mapModalHint: {
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mapModalConfirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
})
