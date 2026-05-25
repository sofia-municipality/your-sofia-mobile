import React, {useState, useRef} from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'expo-router'
import type {WasteContainer} from '../types/wasteContainer'
import {
  Trash2,
  AlertTriangle,
  CheckCircle,
  Camera,
  ImageIcon,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  Edit,
} from 'lucide-react-native'
import {useAuth} from '../contexts/AuthContext'
import {useContainerSignals} from '../hooks/useContainerSignals'
import {cleanContainer, updateWasteContainer} from '../lib/payload'
import * as ImagePicker from 'expo-image-picker'
import {WasteContainerForm} from '../forms/waste-container'
import type {WasteContainerFormData} from '../forms/waste-container'
import {Signal} from '@/types/signal'
import {environmentManager} from '@/lib/environment'
import {colors, fonts, fontSizes, radius, spacing} from '@/styles/tokens'

interface WasteContainerCardProps {
  container: WasteContainer
  onClose?: () => void
  onContainerUpdated?: () => void
}

function getNextCollectionLabel(daysOfWeek: string[], t: (key: string) => string): string {
  if (!daysOfWeek?.length) return ''
  const days = daysOfWeek.map(Number)
  const now = new Date()
  const todayISO = now.getDay() === 0 ? 7 : now.getDay()
  for (let offset = 0; offset <= 6; offset++) {
    const checkISO = ((todayISO - 1 + offset) % 7) + 1
    if (days.includes(checkISO)) {
      if (offset === 0) return t('wasteContainers.collectionToday')
      if (offset === 1) return t('wasteContainers.collectionTomorrow')
      return t(`wasteContainers.collectionDay.${checkISO}`)
    }
  }
  return ''
}

function getFrequencyLabel(
  daysOfWeek: string[],
  timesPerDay: number,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const perWeek = daysOfWeek.length * timesPerDay
  return t('wasteContainers.collectionFrequency', {count: perWeek})
}

export function WasteContainerCard({
  container,
  onClose,
  onContainerUpdated,
}: WasteContainerCardProps) {
  const {t} = useTranslation()
  const router = useRouter()
  const {isContainerAdmin, token, isAuthenticated} = useAuth()
  const {
    total: signalsTotal,
    active: signalsActive,
    loading: signalsLoading,
    error: signalsError,
  } = useContainerSignals(container.publicNumber, {
    initialTotal: container.signalCount,
    initialActive: container.activeSignalCount,
  })
  const [isCleaning, setIsCleaning] = useState(false)
  const [notes, setNotes] = useState('')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null)
  const [showCleanForm, setShowCleanForm] = useState(false)
  const [showFullInfo, setShowFullInfo] = useState(false)
  const [showObservations, setShowObservations] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const formRef = useRef<any>(null)
  const [lastObservationPhotos, setLastObservationPhotos] = useState<any[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(true)
  const [recentObservations, setRecentObservations] = useState<any[]>([])

  const handleReportIssue = () => {
    if (!isAuthenticated) {
      if (onClose) onClose()
      const signalPath =
        `/(tabs)/new/new-signal` +
        `?containerId=${container.id}` +
        `&containerPublicNumber=${encodeURIComponent(container.publicNumber)}` +
        `&containerName=${encodeURIComponent(container.publicNumber)}` +
        `&containerLocation=${encodeURIComponent(JSON.stringify({latitude: container.latitude, longitude: container.longitude}))}` +
        `&prefilledObjectType=waste-container` +
        `&returnTo=${encodeURIComponent('/(tabs)/maps/waste-containers')}`
      router.push({pathname: '/auth/login', params: {returnTo: signalPath}} as any)
      return
    }

    // Close the card first
    if (onClose) {
      onClose()
    }

    // Navigate to signal creation form with prepopulated container data
    router.push({
      pathname: '/(tabs)/new/new-signal',
      params: {
        containerId: container.id,
        containerPublicNumber: container.publicNumber,
        containerName: container.publicNumber,
        containerLocation: JSON.stringify({
          latitude: container.latitude,
          longitude: container.longitude,
        }),
        prefilledObjectType: 'waste-container',
        returnTo: '/(tabs)/maps/waste-containers',
      },
    } as any)
  }

  // Fetch last observation photos and signal photos on mount
  React.useEffect(() => {
    const fetchLastObservationPhotos = async () => {
      setLoadingPhotos(true)
      try {
        // Fetch observation photos
        const observationsResponse = await fetch(
          `${environmentManager.getApiUrl()}/api/waste-container-observations?where[container][equals]=${container.id}&depth=2&sort=-cleanedAt&limit=3`
        )
        const observationsData = await observationsResponse.json()
        setRecentObservations(observationsData.docs || [])
        const observationPhotos = (observationsData.docs || [])
          .filter((obs: any) => obs.photo)
          .map((obs: any) => ({
            id: `obs-${obs.id}`,
            url: obs.photo.url?.startsWith('http')
              ? obs.photo.url
              : `${environmentManager.getApiUrl()}${obs.photo.url}`,
            createdAt: obs.cleanedAt,
            type: 'cleaning',
          }))

        // Fetch signals for this container
        const signalsResponse = await fetch(
          `${environmentManager.getApiUrl()}/api/signals?where[cityObject.referenceId][equals]=${container.publicNumber}&depth=2&sort=-createdAt&limit=3`
        )
        const signalsData = await signalsResponse.json()

        const signalPhotos = (signalsData.docs || []).flatMap((signal: Signal) => {
          if (!signal.images || signal.images.length === 0) return []
          return signal.images.map((photo: any) => ({
            id: `signal-${signal.id}-${photo.id}`,
            url: photo.url?.startsWith('http')
              ? photo.url
              : `${environmentManager.getApiUrl()}${photo.url}`,
            createdAt: signal.createdAt,
            type: 'signal',
          }))
        })

        // Merge and sort by date (most recent first)
        const allPhotos = [...observationPhotos, ...signalPhotos].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        // Take only the first 3 photos
        setLastObservationPhotos(allPhotos.slice(0, 3))
      } catch (error) {
        console.error('Error fetching last observation photos:', error)
      } finally {
        setLoadingPhotos(false)
      }
    }

    fetchLastObservationPhotos()
  }, [container.id, container.publicNumber])

  const handleEditSubmit = async (data: WasteContainerFormData) => {
    setIsUpdating(true)
    try {
      if (!token) {
        throw new Error('Authentication required')
      }
      await updateWasteContainer(container.id, data, token)
      Alert.alert(t('common.success'), t('newCityObject.updateSuccess'))
      setShowEditForm(false)
      if (onContainerUpdated) {
        onContainerUpdated()
      }
    } catch (error) {
      console.error('Failed to update container:', error)
      Alert.alert(t('common.error'), t('newCityObject.createError'))
    } finally {
      setIsUpdating(false)
    }
  }

  const requestCameraPermission = async () => {
    const {status} = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        t('wasteContainers.permissionDenied'),
        t('wasteContainers.cameraPermissionRequired')
      )
      return false
    }
    return true
  }

  const handleCleanContainer = () => {
    if (!token) {
      Alert.alert(t('common.error'), t('auth.notAuthenticated'))
      return
    }
    setShowCleanForm(true)
  }

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission()
    if (!hasPermission) return

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    })

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  const handlePickFromLibrary = async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        t('wasteContainers.permissionDenied'),
        t('wasteContainers.mediaLibraryPermissionRequired')
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    })

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  const handleSubmitCleaning = async () => {
    if (!photoUri) {
      Alert.alert(t('common.error'), t('wasteContainers.photoRequired'))
      return
    }

    setIsCleaning(true)
    try {
      const photo = {
        uri: photoUri,
        type: 'image/jpeg',
        name: `observation-${container.id}-${Date.now()}.jpg`,
      }

      await cleanContainer(container.id, token!, photo, notes)

      // Close form and reset state first
      setShowCleanForm(false)
      setPhotoUri(null)
      setNotes('')

      // Show success alert and execute callbacks only after user dismisses it
      Alert.alert(t('common.success'), t('wasteContainers.cleanSuccess'), [
        {
          text: 'OK',
          onPress: () => {
            if (onContainerUpdated) {
              onContainerUpdated()
            }
            if (onClose) {
              onClose()
            }
          },
        },
      ])
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('wasteContainers.cleanError')
      )
    } finally {
      setIsCleaning(false)
    }
  }

  const getCapacitySizeLabel = (size: string) => {
    const labels: Record<string, string> = {
      tiny: t('wasteContainers.size.tiny') || 'Tiny',
      small: t('wasteContainers.size.small') || 'Small',
      standard: t('wasteContainers.size.standard') || 'Standard',
      big: t('wasteContainers.size.big') || 'Big',
      industrial: t('wasteContainers.size.industrial') || 'Industrial',
    }
    return labels[size] || size
  }

  const getWasteTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      general: t('wasteContainers.type.general') || 'General Waste',
      recyclables: t('wasteContainers.type.recyclables') || 'Recyclables',
      organic: t('wasteContainers.type.organic') || 'Organic',
      glass: t('wasteContainers.type.glass') || 'Glass',
      paper: t('wasteContainers.type.paper') || 'Paper',
      plastic: t('wasteContainers.type.plastic') || 'Plastic',
      metal: t('wasteContainers.type.metal') || 'Metal',
      trashCan: t('wasteContainers.type.trashCan') || 'Trash Can',
    }
    return labels[type] || type
  }

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      active: colors.success,
      full: colors.error,
      maintenance: '#F59E0B',
      inactive: colors.textSecondary,
    }
    return statusColors[status] || colors.textSecondary
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{flex: 1}}>
          <View style={styles.titleRow}>
            <Text style={styles.containerNumber}>
              {t('wasteContainers.name')}: {container.publicNumber}
            </Text>
            {isContainerAdmin && (
              <TouchableOpacity
                onPress={() => setShowEditForm(true)}
                accessibilityRole="button"
                accessibilityLabel={t('common.edit')}
              >
                <Edit size={16} color={colors.primaryLight} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, {backgroundColor: getStatusColor(container.status)}]} />
            <Text style={styles.statusText}>
              {t(`wasteContainers.statuses.${container.status}`)}
            </Text>
            <View style={styles.infoRow}>
              <Trash2 size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {getWasteTypeLabel(container.wasteType)} •{' '}
                {getCapacitySizeLabel(container.capacitySize)} ({container.capacityVolume}m³)
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerButtons}>
          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.signalsBadge}
          onPress={() => {
            if (onClose) onClose()
            // Navigate to Signals tab and apply container filter
            router.push({
              pathname: '/(tabs)/signals',
              params: {containerReferenceId: container.publicNumber},
            } as any)
          }}
          disabled={signalsLoading || !!signalsError}
          accessibilityRole="button"
          accessibilityLabel={t('wasteContainers.signalsActive', {
            active: signalsActive,
            count: signalsTotal ?? 0,
          })}
        >
          {signalsLoading ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : signalsError ? (
            <AlertTriangle size={16} color="#F59E0B" />
          ) : (
            <>
              <AlertTriangle
                size={16}
                color={signalsActive && signalsActive > 0 ? colors.error : colors.textSecondary}
              />
              <Text
                style={[
                  styles.signalsText,
                  signalsActive && signalsActive > 0 ? styles.signalsTextActive : undefined,
                ]}
              >
                {`${t('wasteContainers.signalsActive', {active: signalsActive, count: signalsTotal ?? 0})}`}
              </Text>
            </>
          )}
        </TouchableOpacity>
        {/* Last Observation Photos */}
        {loadingPhotos ? (
          <View style={styles.lastPhotosLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : lastObservationPhotos.length > 0 ? (
          <View style={styles.lastPhotosContainer}>
            <Text style={styles.lastPhotosLabel}>{t('wasteContainers.lastObservations')}:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={styles.lastPhotosScroll}
            >
              {lastObservationPhotos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => {
                    setSelectedPhotoUrl(photo.url)
                    setShowPhotoModal(true)
                  }}
                  style={styles.lastPhotoItem}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(`wasteContainers.${photo.type}`)}: ${new Date(photo.createdAt).toLocaleDateString()}`}
                >
                  <Image
                    source={{uri: photo.url}}
                    style={styles.lastPhotoThumbnail}
                    resizeMode="cover"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <Text style={styles.lastPhotoDate}>
                    {t(`wasteContainers.${photo.type}`)}:
                    {new Date(photo.createdAt).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          container.image?.url && (
            <Image source={{uri: container.image.url}} style={styles.image} resizeMode="cover" />
          )
        )}

        {/* Full Info Toggle Button */}
        <TouchableOpacity
          onPress={() => setShowFullInfo(!showFullInfo)}
          style={styles.fullInfoButton}
          accessibilityRole="button"
          accessibilityLabel={t('wasteContainers.fullDetails')}
          accessibilityState={{expanded: showFullInfo}}
        >
          <Info size={16} color={colors.primary} />
          <Text style={styles.fullInfoButtonText}>{t('wasteContainers.fullDetails')}</Text>
          {showFullInfo ? (
            <ChevronUp size={16} color={colors.primary} />
          ) : (
            <ChevronDown size={16} color={colors.primary} />
          )}
        </TouchableOpacity>

        {/* Extended Info Section */}
        {showFullInfo && (
          <View style={styles.extendedInfoContainer}>
            <View style={styles.extendedInfoRow}>
              <Text style={styles.extendedInfoLabel}>{t('wasteContainers.publicNumber')}:</Text>
              <Text style={styles.extendedInfoValue}>{container.publicNumber}</Text>
            </View>

            <View style={styles.extendedInfoRow}>
              <Text style={styles.extendedInfoLabel}>{t('wasteContainers.wasteType')}:</Text>
              <Text style={styles.extendedInfoValue}>{getWasteTypeLabel(container.wasteType)}</Text>
            </View>

            <View style={styles.extendedInfoRow}>
              <Text style={styles.extendedInfoLabel}>{t('wasteContainers.capacitySize')}:</Text>
              <Text style={styles.extendedInfoValue}>
                {getCapacitySizeLabel(container.capacitySize)}
              </Text>
            </View>

            <View style={styles.extendedInfoRow}>
              <Text style={styles.extendedInfoLabel}>{t('wasteContainers.capacityVolume')}:</Text>
              <Text style={styles.extendedInfoValue}>{container.capacityVolume}m³</Text>
            </View>

            {
              <View style={styles.extendedInfoRow}>
                <Text style={styles.extendedInfoLabel}>{t('wasteContainers.binCount')}:</Text>
                <Text style={styles.extendedInfoValue}>{container.binCount}</Text>
              </View>
            }

            <View style={styles.extendedInfoRow}>
              <Text style={styles.extendedInfoLabel}>{t('wasteContainers.coordinates')}:</Text>
              <Text style={styles.extendedInfoValue}>
                {container.latitude.toFixed(6)}, {container.longitude.toFixed(6)}
              </Text>
            </View>

            {container.address && (
              <View style={styles.extendedInfoRow}>
                <Text style={styles.extendedInfoLabel}>{t('wasteContainers.address')}:</Text>
                <Text style={styles.extendedInfoValue}>{container.address}</Text>
              </View>
            )}

            {container.collectionDaysOfWeek && container.collectionDaysOfWeek.length > 0 && (
              <>
                <View style={styles.extendedInfoRow}>
                  <Text style={styles.extendedInfoLabel}>
                    {t('wasteContainers.nextCollection')}:
                  </Text>
                  <Text style={styles.extendedInfoValue}>
                    {getNextCollectionLabel(container.collectionDaysOfWeek, t)}
                  </Text>
                </View>
                <View style={styles.extendedInfoRow}>
                  <Text style={styles.extendedInfoLabel}>
                    {t('wasteContainers.collectionFrequencyLabel')}:
                  </Text>
                  <Text style={styles.extendedInfoValue}>
                    {getFrequencyLabel(
                      container.collectionDaysOfWeek,
                      container.collectionTimesPerDay ?? 1,
                      t
                    )}
                  </Text>
                </View>
              </>
            )}

            {
              <View style={styles.extendedInfoRow}>
                <Text style={styles.extendedInfoLabel}>{t('wasteContainers.servicedBy')}:</Text>
                <Text style={styles.extendedInfoValue}>{container.servicedBy}</Text>
              </View>
            }

            {container.lastCleaned && (
              <View style={styles.extendedInfoRow}>
                <Text style={styles.extendedInfoLabel}>{t('wasteContainers.lastCleaned')}:</Text>
                <TouchableOpacity
                  onPress={() => setShowObservations(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('wasteContainers.lastCleaned')}
                >
                  <Text style={[styles.extendedInfoValue, styles.linkText]}>
                    {new Date(container.lastCleaned).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {container.state && container.state.length > 0 && (
              <View style={styles.extendedInfoRow}>
                <Text style={styles.extendedInfoLabel}>
                  {t('wasteContainers.containerStates')}:
                </Text>
                <View style={styles.statesContainer}>
                  {container.state.map((state, index) => (
                    <Text key={index} style={styles.stateItem}>
                      • {state}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.extendedInfoRow}>
              <Text style={styles.extendedInfoLabel}>{t('wasteContainers.createdAt')}:</Text>
              <Text style={styles.extendedInfoValue}>
                {new Date(container.createdAt).toLocaleString()}
              </Text>
            </View>

            <View style={styles.extendedInfoRow}>
              <Text style={styles.extendedInfoLabel}>{t('wasteContainers.updatedAt')}:</Text>
              <Text style={styles.extendedInfoValue}>
                {new Date(container.updatedAt).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={handleReportIssue}
          style={styles.reportButton}
          accessibilityRole="button"
          accessibilityLabel={t('wasteContainers.reportIssue')}
        >
          <AlertTriangle size={16} color={colors.surface} />
          <Text style={styles.reportButtonText}>{t('wasteContainers.reportIssue')}</Text>
        </TouchableOpacity>

        {/* Clean Container button for Container Admins */}
        {isContainerAdmin && (container.status !== 'active' || !container.lastCleaned) && (
          <TouchableOpacity
            style={styles.cleanButton}
            onPress={handleCleanContainer}
            accessibilityRole="button"
            accessibilityLabel={t('wasteContainers.cleanContainer')}
          >
            <CheckCircle size={20} color={colors.surface} />
            <Text style={styles.cleanButtonText}>{t('wasteContainers.cleanContainer')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Photo Modal */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPhotoModal(false)
          setSelectedPhotoUrl(null)
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            activeOpacity={1}
            onPress={() => {
              setShowPhotoModal(false)
              setSelectedPhotoUrl(null)
            }}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <View style={styles.modalContent}>
              {(selectedPhotoUrl || container.lastCleanedPhoto) && (
                <Image
                  source={{uri: selectedPhotoUrl || container.lastCleanedPhoto?.url}}
                  style={styles.modalImage}
                  resizeMode="contain"
                  accessibilityLabel={t('wasteContainers.photo')}
                />
              )}
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowPhotoModal(false)
                  setSelectedPhotoUrl(null)
                }}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Observations History Modal */}
      <Modal
        visible={showObservations}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowObservations(false)}
      >
        <View style={styles.formModalOverlay}>
          <View style={styles.formModalContent}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{t('wasteContainers.lastObservations')}</Text>
              <TouchableOpacity
                onPress={() => setShowObservations(false)}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {recentObservations.length === 0 ? (
              <Text style={styles.noObservationsText}>{t('wasteContainers.noHistory')}</Text>
            ) : (
              recentObservations.map((obs: any, index: number) => {
                const photoUrl = obs.photo?.url
                  ? obs.photo.url.startsWith('http')
                    ? obs.photo.url
                    : `${environmentManager.getApiUrl()}${obs.photo.url}`
                  : null
                return (
                  <View key={obs.id ?? index} style={styles.observationRow}>
                    {photoUrl ? (
                      <TouchableOpacity
                        onPress={() => {
                          setShowObservations(false)
                          setSelectedPhotoUrl(photoUrl)
                          setShowPhotoModal(true)
                        }}
                        accessibilityRole="imagebutton"
                        accessibilityLabel={new Date(obs.cleanedAt).toLocaleString()}
                      >
                        <Image
                          source={{uri: photoUrl}}
                          style={styles.observationThumbnail}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.observationThumbnailPlaceholder}>
                        <CheckCircle size={20} color={colors.textSecondary} />
                      </View>
                    )}
                    <Text style={styles.observationDate}>
                      {new Date(obs.cleanedAt).toLocaleString()}
                    </Text>
                  </View>
                )
              })
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Container Modal */}
      <Modal
        visible={showEditForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditForm(false)}
      >
        <View style={styles.formModalOverlay}>
          <View style={[styles.formModalContent, {maxHeight: '95%'}]}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {t('common.edit')} {t('wasteContainers.name')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowEditForm(false)}
                style={styles.formCloseButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <WasteContainerForm
                ref={formRef}
                container={container}
                onSubmit={handleEditSubmit}
                onCancel={() => setShowEditForm(false)}
                isSubmitting={isUpdating}
                isEditing={true}
                canEdit={true}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Clean Container Form Modal */}
      <Modal
        visible={showCleanForm}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCleanForm(false)}
      >
        <View style={styles.formModalOverlay}>
          <View style={styles.formModalContent}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{t('wasteContainers.cleanContainer')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCleanForm(false)
                  setPhotoUri(null)
                  setNotes('')
                }}
                style={styles.formCloseButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.formDescription}>{t('wasteContainers.cleanDescription')}</Text>

            {/* Photo Section */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionLabel}>{t('wasteContainers.photoRequired')}</Text>
              {photoUri ? (
                <View style={styles.photoPreview}>
                  <Image source={{uri: photoUri}} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setPhotoUri(null)}
                    accessibilityRole="button"
                    accessibilityLabel={t('wasteContainers.deletePhoto')}
                  >
                    <X size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoButtonsRow}>
                  <TouchableOpacity
                    style={styles.takePhotoButton}
                    onPress={handleTakePhoto}
                    accessibilityRole="button"
                    accessibilityLabel={t('wasteContainers.takePhoto')}
                  >
                    <Camera size={20} color={colors.primary} />
                    <Text style={styles.takePhotoButtonText}>{t('wasteContainers.takePhoto')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.takePhotoButton}
                    onPress={handlePickFromLibrary}
                    accessibilityRole="button"
                    accessibilityLabel={t('wasteContainers.pickFromLibrary')}
                  >
                    <ImageIcon size={20} color={colors.primary} />
                    <Text style={styles.takePhotoButtonText}>
                      {t('wasteContainers.pickFromLibrary')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {!photoUri && (
                <Text style={styles.photoRequiredText}>{t('wasteContainers.photoRequired')}</Text>
              )}
            </View>

            {/* Notes Section */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionLabel}>{t('wasteContainers.addNotes')}</Text>
              <TextInput
                style={styles.formNotesInput}
                placeholder={t('wasteContainers.addNotes')}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel={t('wasteContainers.addNotes')}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.formCancelButton}
                onPress={() => {
                  setShowCleanForm(false)
                  setPhotoUri(null)
                  setNotes('')
                }}
                disabled={isCleaning}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                accessibilityState={{disabled: isCleaning}}
              >
                <Text style={styles.formCancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.formSubmitButton,
                  (isCleaning || !photoUri) && styles.cleanButtonDisabled,
                ]}
                onPress={handleSubmitCleaning}
                disabled={isCleaning || !photoUri}
                accessibilityRole="button"
                accessibilityLabel={t('common.confirm')}
                accessibilityState={{disabled: isCleaning || !photoUri}}
              >
                {isCleaning ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <>
                    <CheckCircle size={20} color={colors.surface} />
                    <Text style={styles.formSubmitButtonText}>{t('common.confirm')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    paddingBottom: spacing['2xs'],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing['2xs'],
  },
  editButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.caption,
    color: colors.primary,
  },
  containerNumber: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  statusText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  signalsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing['2xs'],
    gap: 2,
  },
  signalsText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
    marginLeft: spacing['2xs'],
  },
  signalsTextActive: {
    textDecorationLine: 'underline',
    color: colors.primary,
  },
  lastCleanedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing['2xs'],
  },
  lastCleanedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  lastCleanedText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.caption,
    color: colors.success,
  },
  photoIconButton: {
    padding: spacing['2xs'],
    marginLeft: spacing['2xs'],
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error,
    padding: 14,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  reportButtonText: {
    fontFamily: fonts.semiBold,
    color: colors.surface,
    fontSize: fontSizes.bodySm,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  image: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: spacing.md,
    paddingTop: spacing['2xs'],
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
    flex: 1,
  },
  notesContainer: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
  },
  notesLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing['2xs'],
  },
  notesText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  notesInputContainer: {
    marginBottom: spacing.sm,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  cleanButton: {
    flexDirection: 'row',
    backgroundColor: colors.success,
    padding: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  cleanButtonDisabled: {
    opacity: 0.6,
  },
  cleanButtonText: {
    fontFamily: fonts.semiBold,
    color: colors.surface,
    fontSize: fontSizes.bodySm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    aspectRatio: 4 / 3,
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.xl,
    padding: spacing.xs,
  },
  formModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  formModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    maxHeight: '90%',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  formTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
  },
  formCloseButton: {
    padding: spacing['2xs'],
  },
  formDescription: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: spacing.md,
  },
  formSectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  takePhotoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  takePhotoButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: colors.primary,
  },
  photoRequiredText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.label,
    color: colors.error,
    marginTop: spacing.xs,
  },
  photoPreview: {
    position: 'relative',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.full,
    padding: spacing.xs,
  },
  formNotesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    minHeight: 100,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  formCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  formCancelButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
  },
  formSubmitButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.success,
    padding: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  formSubmitButtonText: {
    fontFamily: fonts.semiBold,
    color: colors.surface,
    fontSize: fontSizes.bodySm,
  },
  fullInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  fullInfoButtonText: {
    fontFamily: fonts.semiBold,
    color: colors.primary,
    fontSize: fontSizes.body,
  },
  extendedInfoContainer: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  extendedInfoTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    marginBottom: spacing['2xs'],
  },
  extendedInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  extendedInfoLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    flex: 1,
  },
  extendedInfoValue: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.label,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  extendedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    flex: 1,
  },
  statesContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stateItem: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.label,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  lastCleanedLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  noObservationsText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  observationThumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  observationsList: {
    paddingVertical: spacing.xs,
  },
  observationItem: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  observationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['2xs'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  observationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  observationDate: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  observationDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  observationText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  observationNotes: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing['2xs'],
  },
  observationPhoto: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  observationThumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: colors.textMuted,
  },
  noPhotoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noPhotoText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  lastPhotosLoading: {
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  lastPhotosContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  lastPhotosLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.caption,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  lastPhotosScroll: {
    flexDirection: 'row',
  },
  lastPhotoItem: {
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  lastPhotoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
  lastPhotoDate: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: spacing['2xs'],
  },
})
