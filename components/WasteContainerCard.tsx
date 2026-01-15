import React, {useState} from 'react'
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
  MapPin,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Camera,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  History,
} from 'lucide-react-native'
import {useAuth} from '../contexts/AuthContext'
import {cleanContainer} from '../lib/payload'
import * as ImagePicker from 'expo-image-picker'

interface WasteContainerCardProps {
  container: WasteContainer
  onClose?: () => void
  onContainerUpdated?: () => void
}

export function WasteContainerCard({
  container,
  onClose,
  onContainerUpdated,
}: WasteContainerCardProps) {
  const {t} = useTranslation()
  const router = useRouter()
  const {isContainerAdmin, token} = useAuth()
  const [isCleaning, setIsCleaning] = useState(false)
  const [notes, setNotes] = useState('')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null)
  const [showCleanForm, setShowCleanForm] = useState(false)
  const [showFullInfo, setShowFullInfo] = useState(false)
  const [showObservations, setShowObservations] = useState(false)
  const [observations, setObservations] = useState<any[]>([])
  const [loadingObservations, setLoadingObservations] = useState(false)

  const handleReportIssue = () => {
    // Close the card first
    if (onClose) {
      onClose()
    }

    // Navigate to signal creation form with prepopulated container data
    router.push({
      pathname: '/(tabs)/new-signal',
      params: {
        containerId: container.id,
        containerPublicNumber: container.publicNumber,
        containerName: container.publicNumber,
        containerLocation: JSON.stringify(container.location),
        prefilledObjectType: 'waste-container',
        returnTo: '/(tabs)/maps/waste-containers',
      },
    } as any)
  }

  const handleShowObservations = async () => {
    setShowObservations(true)
    setLoadingObservations(true)
    try {
      // Fetch observations for this container
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/waste-container-observations?where[container][equals]=${container.id}&depth=2&sort=-cleanedAt&limit=5`
      )
      const data = await response.json()
      console.log('Fetched observations:', data)

      // Transform photo URLs to include API URL
      const transformedObservations = (data.docs || []).map((obs: any) => ({
        ...obs,
        photo: obs.photo
          ? {
              ...obs.photo,
              url: obs.photo.url?.startsWith('http')
                ? obs.photo.url
                : `${process.env.EXPO_PUBLIC_API_URL}${obs.photo.url}`,
            }
          : undefined,
      }))

      setObservations(transformedObservations)
    } catch (error) {
      console.error('Error fetching observations:', error)
      Alert.alert(t('common.error'), 'Failed to load observations')
    } finally {
      setLoadingObservations(false)
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

  const handleSubmitCleaning = async () => {
    setIsCleaning(true)
    try {
      let photo
      if (photoUri) {
        photo = {
          uri: photoUri,
          type: 'image/jpeg',
          name: `observation-${container.id}-${Date.now()}.jpg`,
        }
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
    }
    return labels[type] || type
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: '#10B981',
      full: '#EF4444',
      maintenance: '#F59E0B',
      inactive: '#6B7280',
    }
    return colors[status] || '#6B7280'
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{flex: 1}}>
          <Text style={styles.containerNumber}>
            {t('wasteContainers.name')}: {container.publicNumber}
          </Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, {backgroundColor: getStatusColor(container.status)}]} />
            <Text style={styles.statusText}>{container.status.toUpperCase()}</Text>
          </View>
          <View style={styles.lastCleanedContainer}>
            <TouchableOpacity
              onPress={handleShowObservations}
              disabled={!container.lastCleaned}
              style={styles.lastCleanedButton}
            >
              <History size={16} color="#10B981" />
              <Text style={[styles.lastCleanedText, styles.lastCleanedLink]}>
                {t('wasteContainers.lastCleaned')}:{' '}
                {container.lastCleaned ? new Date(container.lastCleaned).toLocaleString() : 'N/A'}
              </Text>
            </TouchableOpacity>
            {container.lastCleanedPhoto && (
              <TouchableOpacity
                onPress={() => setShowPhotoModal(true)}
                style={styles.photoIconButton}
              >
                <Camera size={16} color="#10B981" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.headerButtons}>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {container.image?.url && (
        <Image source={{uri: container.image.url}} style={styles.image} resizeMode="cover" />
      )}

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Trash2 size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            {getWasteTypeLabel(container.wasteType)} •{' '}
            {getCapacitySizeLabel(container.capacitySize)} ({container.capacityVolume}m³)
          </Text>
        </View>

        {container.location.address && (
          <View style={styles.infoRow}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.infoText}>{container.location.address}</Text>
          </View>
        )}

        {container.serviceInterval && (
          <View style={styles.infoRow}>
            <Calendar size={16} color="#6B7280" />
            <Text style={styles.infoText}>{container.serviceInterval}</Text>
          </View>
        )}

        {container.servicedBy && (
          <View style={styles.infoRow}>
            <User size={16} color="#6B7280" />
            <Text style={styles.infoText}>{container.servicedBy}</Text>
          </View>
        )}

        {container.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>{t('wasteContainers.notes') || 'Notes'}:</Text>
            <Text style={styles.notesText}>{container.notes}</Text>
          </View>
        )}

        {/* Full Info Toggle Button */}
        <TouchableOpacity
          onPress={() => setShowFullInfo(!showFullInfo)}
          style={styles.fullInfoButton}
        >
          <Info size={16} color="#1E40AF" />
          <Text style={styles.fullInfoButtonText}>{t('wasteContainers.fullDetails')}</Text>
          {showFullInfo ? (
            <ChevronUp size={16} color="#1E40AF" />
          ) : (
            <ChevronDown size={16} color="#1E40AF" />
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

            <View style={styles.extendedInfoRow}>
              <Text style={styles.extendedInfoLabel}>{t('wasteContainers.status')}:</Text>
              <View style={styles.extendedStatusBadge}>
                <View
                  style={[styles.statusDot, {backgroundColor: getStatusColor(container.status)}]}
                />
                <Text style={styles.extendedInfoValue}>{container.status.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.extendedInfoRow}>
              <Text style={styles.extendedInfoLabel}>{t('wasteContainers.coordinates')}:</Text>
              <Text style={styles.extendedInfoValue}>
                {container.location.latitude.toFixed(6)}, {container.location.longitude.toFixed(6)}
              </Text>
            </View>

            {container.location.address && (
              <View style={styles.extendedInfoRow}>
                <Text style={styles.extendedInfoLabel}>{t('wasteContainers.address')}:</Text>
                <Text style={styles.extendedInfoValue}>{container.location.address}</Text>
              </View>
            )}

            {
              <View style={styles.extendedInfoRow}>
                <Text style={styles.extendedInfoLabel}>
                  {t('wasteContainers.serviceInterval')}:
                </Text>
                <Text style={styles.extendedInfoValue}>{container.serviceInterval}</Text>
              </View>
            }

            {
              <View style={styles.extendedInfoRow}>
                <Text style={styles.extendedInfoLabel}>{t('wasteContainers.servicedBy')}:</Text>
                <Text style={styles.extendedInfoValue}>{container.servicedBy}</Text>
              </View>
            }

            {container.lastCleaned && (
              <View style={styles.extendedInfoRow}>
                <Text style={styles.extendedInfoLabel}>{t('wasteContainers.lastCleaned')}:</Text>
                <Text style={styles.extendedInfoValue}>
                  {new Date(container.lastCleaned).toLocaleString()}
                </Text>
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

        <TouchableOpacity onPress={handleReportIssue} style={styles.reportButton}>
          <AlertTriangle size={16} color="#ffffff" />
          <Text style={styles.reportButtonText}>{t('wasteContainers.reportIssue')}</Text>
        </TouchableOpacity>

        {/* Clean Container button for Container Admins */}
        {isContainerAdmin && (container.status !== 'active' || !container.lastCleaned) && (
          <TouchableOpacity style={styles.cleanButton} onPress={handleCleanContainer}>
            <CheckCircle size={20} color="#ffffff" />
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
          >
            <View style={styles.modalContent}>
              {(selectedPhotoUrl || container.lastCleanedPhoto) && (
                <Image
                  source={{uri: selectedPhotoUrl || container.lastCleanedPhoto?.url}}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowPhotoModal(false)
                  setSelectedPhotoUrl(null)
                }}
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
              <Text style={styles.formTitle}>{t('wasteContainers.cleaningHistory')}</Text>
              <TouchableOpacity onPress={() => setShowObservations(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {loadingObservations ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1E40AF" />
              </View>
            ) : observations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('wasteContainers.noHistory')}</Text>
              </View>
            ) : (
              <ScrollView style={styles.observationsList}>
                {observations.map((observation: any, index: number) => (
                  <View key={observation.id} style={styles.observationItem}>
                    <View style={styles.observationRow}>
                      <View style={styles.observationHeader}>
                        <Calendar size={16} color="#666" />
                        <Text style={styles.observationDate}>
                          {new Date(observation.cleanedAt).toLocaleString()}
                        </Text>
                      </View>
                      {observation.photo ? (
                        <TouchableOpacity
                          onPress={() => {
                            // Show photo in full screen
                            setSelectedPhotoUrl(observation.photo.url)
                            setShowObservations(false)
                            setShowPhotoModal(true)
                          }}
                        >
                          <Image
                            source={{uri: observation.photo.url}}
                            style={styles.observationThumbnail}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.noPhotoContainer}>
                          <Camera size={14} color="#9CA3AF" />
                          <Text style={styles.noPhotoText}>
                            {t('wasteContainers.noPhotoUploaded')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
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
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formDescription}>{t('wasteContainers.cleanDescription')}</Text>

            {/* Photo Section */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionLabel}>{t('wasteContainers.photoOptional')}</Text>
              {photoUri ? (
                <View style={styles.photoPreview}>
                  <Image source={{uri: photoUri}} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setPhotoUri(null)}
                  >
                    <X size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.takePhotoButton} onPress={handleTakePhoto}>
                  <Camera size={20} color="#1E40AF" />
                  <Text style={styles.takePhotoButtonText}>{t('wasteContainers.takePhoto')}</Text>
                </TouchableOpacity>
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
              >
                <Text style={styles.formCancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.formSubmitButton, isCleaning && styles.cleanButtonDisabled]}
                onPress={handleSubmitCleaning}
                disabled={isCleaning}
              >
                {isCleaning ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <CheckCircle size={20} color="#ffffff" />
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  containerNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  lastCleanedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  lastCleanedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastCleanedText: {
    fontSize: 12,
    color: '#10B981',
  },
  photoIconButton: {
    padding: 4,
    marginLeft: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    padding: 14,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  reportButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6B7280',
    lineHeight: 24,
  },
  image: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  notesInputContainer: {
    marginBottom: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  cleanButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cleanButtonDisabled: {
    opacity: 0.6,
  },
  cleanButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 20,
    padding: 8,
  },
  formModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  formModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  formCloseButton: {
    padding: 4,
  },
  formDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  formSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  takePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#1E40AF',
    borderStyle: 'dashed',
    padding: 16,
    borderRadius: 8,
  },
  takePhotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  photoPreview: {
    position: 'relative',
    borderRadius: 8,
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
    borderRadius: 16,
    padding: 8,
  },
  formNotesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  formCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  formCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  formSubmitButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  formSubmitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  fullInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  fullInfoButtonText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '600',
  },
  extendedInfoContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  extendedInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  extendedInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  extendedInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
  },
  extendedInfoValue: {
    fontSize: 13,
    color: '#1F2937',
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
    fontSize: 13,
    color: '#1F2937',
    textAlign: 'right',
  },
  lastCleanedLink: {
    color: '#1e69af',
    textDecorationLine: 'underline',
  },
  observationsList: {
    paddingVertical: 8,
  },
  observationItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  observationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  observationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  observationDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flexShrink: 1,
  },
  observationDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  observationText: {
    fontSize: 13,
    color: '#6B7280',
  },
  observationNotes: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
    marginTop: 4,
  },
  observationPhoto: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  observationThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
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
    fontSize: 14,
    color: '#9CA3AF',
  },
  noPhotoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noPhotoText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
})
