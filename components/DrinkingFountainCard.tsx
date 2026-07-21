import React, {useEffect, useState} from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Image,
  Linking,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import {
  AlertTriangle,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  Droplet,
  Camera,
  ImageIcon,
  ExternalLink,
  CheckCircle,
} from 'lucide-react-native'
import type {DrinkingFountain} from '../lib/payload'
import {createSignal} from '../lib/payload'
import {getUniqueReporterId} from '../lib/deviceId'
import {useAuth} from '../contexts/AuthContext'
import {useContainerSignals} from '../hooks/useContainerSignals'
import {colors, fonts, fontSizes, radius, spacing} from '@/styles/tokens'

/** Colour a fountain by whether it works: blue = working, red = broken, grey = unknown. */
export function getFountainColor(fountain: Pick<DrinkingFountain, 'isActive'>): string {
  if (fountain.isActive === false) return colors.error
  if (fountain.isActive == null) return colors.textMuted
  return colors.info
}

/** The quick-pick issue types a citizen can report about a fountain. */
const FOUNTAIN_ISSUE_TYPES = ['notWorking', 'damaged', 'dirty', 'leaking', 'other'] as const
type FountainIssue = (typeof FOUNTAIN_ISSUE_TYPES)[number]

interface DrinkingFountainCardProps {
  fountain: DrinkingFountain
  onClose?: () => void
}

export function DrinkingFountainCard({fountain, onClose}: DrinkingFountainCardProps) {
  const {t} = useTranslation()
  const router = useRouter()
  const {token, isAuthenticated} = useAuth()

  const [showFullInfo, setShowFullInfo] = useState(false)
  const [showReportForm, setShowReportForm] = useState(false)
  const [issues, setIssues] = useState<FountainIssue[]>([])
  const [description, setDescription] = useState('')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deviceId, setDeviceId] = useState('')

  // Signals are linked to the fountain via cityObject.referenceId = publicNumber,
  // so the counts hook (shared with containers) works unchanged here.
  const {
    total: signalsTotal,
    active: signalsActive,
    loading: signalsLoading,
    error: signalsError,
  } = useContainerSignals(fountain.publicNumber ?? undefined)

  useEffect(() => {
    getUniqueReporterId()
      .then(setDeviceId)
      .catch((err) => console.error('Failed to get reporter ID:', err))
  }, [])

  const statusColor = getFountainColor(fountain)
  const statusLabel =
    fountain.isActive === true
      ? t('fountains.working')
      : fountain.isActive === false
        ? t('fountains.notWorking')
        : t('fountains.statusUnknown')

  const handleReportPress = () => {
    if (!isAuthenticated) {
      if (onClose) onClose()
      router.push({
        pathname: '/auth/login',
        params: {returnTo: '/(tabs)/maps'},
      } as any)
      return
    }
    setShowReportForm(true)
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

  const handleTakePhoto = async () => {
    if (!(await requestCameraPermission())) return
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    })
    if (!result.canceled) setPhotoUri(result.assets[0].uri)
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
    if (!result.canceled) setPhotoUri(result.assets[0].uri)
  }

  const toggleIssue = (key: FountainIssue) => {
    setIssues((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const handleSubmitReport = async () => {
    if (issues.length === 0) {
      Alert.alert(t('common.error'), t('fountains.selectIssue'))
      return
    }
    setSubmitting(true)
    try {
      const issuesLabel = issues.map((key) => t(`fountains.issues.${key}`)).join(', ')
      const photos = photoUri
        ? [{uri: photoUri, type: 'image/jpeg', name: `fountain-${fountain.id}-${Date.now()}.jpg`}]
        : undefined

      // Link the signal to the fountain the same way containers do: cityObject.type
      // 'drinking-fountain' + referenceId = the fountain's publicNumber (DF-…). The
      // reported issues are sent as the structured `fountainState` field.
      await createSignal(
        {
          title: `${t('fountains.name')} — ${issuesLabel}`,
          description: description.trim(),
          category: 'drinking-fountain',
          cityObject: {
            type: 'drinking-fountain',
            referenceId: fountain.publicNumber ?? undefined,
            name: fountain.publicNumber ?? fountain.address,
          },
          fountainState: issues,
          location: {
            latitude: fountain.latitude,
            longitude: fountain.longitude,
            address: fountain.address,
          },
          reporterUniqueId: deviceId,
        },
        photos,
        deviceId,
        token || undefined
      )

      setShowReportForm(false)
      setDescription('')
      setPhotoUri(null)
      setIssues([])
      Alert.alert(t('signals.success'), '', [{text: 'OK', onPress: () => onClose?.()}])
    } catch (error) {
      Alert.alert(
        t('signals.error'),
        error instanceof Error ? error.message : t('newSignal.submitError')
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Condition and water source are always visible in the sheet; the rest stays
  // behind the full-details toggle.
  const quickInfoRows: {label: string; value: string}[] = [
    fountain.statusName ? {label: t('fountains.condition'), value: fountain.statusName} : null,
    fountain.sourceName ? {label: t('fountains.source'), value: fountain.sourceName} : null,
  ].filter(Boolean) as {label: string; value: string}[]

  const detailRows: {label: string; value: string}[] = [
    fountain.activationName
      ? {label: t('fountains.activation'), value: fountain.activationName}
      : null,
    fountain.districtName ? {label: t('fountains.district'), value: fountain.districtName} : null,
    fountain.protectionStatus
      ? {label: t('fountains.protection'), value: fountain.protectionStatus}
      : null,
    {
      label: t('fountains.coordinates'),
      value: `${fountain.latitude.toFixed(6)}, ${fountain.longitude.toFixed(6)}`,
    },
  ].filter(Boolean) as {label: string; value: string}[]

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{flex: 1}}>
          <View style={styles.titleRow}>
            <Droplet size={18} color={colors.info} />
            <Text style={styles.title} numberOfLines={2}>
              {fountain.address || t('fountains.name')}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>
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

      <View style={styles.content}>
        {fountain.publicNumber && (
          <TouchableOpacity
            style={styles.signalsBadge}
            onPress={() => {
              if (onClose) onClose()
              // Navigate to Signals tab filtered for this fountain
              router.push({
                pathname: '/(tabs)/signals',
                params: {containerReferenceId: fountain.publicNumber},
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
        )}

        {quickInfoRows.length > 0 && (
          <View style={styles.quickInfoContainer}>
            {quickInfoRows.map((row) => (
              <View key={row.label} style={styles.extendedInfoRow}>
                <Text style={styles.extendedInfoLabel}>{row.label}:</Text>
                <Text style={styles.extendedInfoValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => setShowFullInfo(!showFullInfo)}
          style={styles.fullInfoButton}
          accessibilityRole="button"
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

        {showFullInfo && (
          <View style={styles.extendedInfoContainer}>
            {detailRows.map((row) => (
              <View key={row.label} style={styles.extendedInfoRow}>
                <Text style={styles.extendedInfoLabel}>{row.label}:</Text>
                <Text style={styles.extendedInfoValue}>{row.value}</Text>
              </View>
            ))}
            {fountain.externalLink ? (
              <TouchableOpacity
                style={styles.externalLinkRow}
                onPress={() => Linking.openURL(fountain.externalLink!)}
                accessibilityRole="link"
              >
                <ExternalLink size={16} color={colors.primary} />
                <Text style={styles.externalLinkText}>{t('fountains.moreInfo')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <TouchableOpacity
          onPress={handleReportPress}
          style={styles.reportButton}
          accessibilityRole="button"
          accessibilityLabel={t('fountains.reportIssue')}
        >
          <AlertTriangle size={16} color={colors.surface} />
          <Text style={styles.reportButtonText}>{t('fountains.reportIssue')}</Text>
        </TouchableOpacity>
      </View>

      {/* Report Issue Modal */}
      <Modal
        visible={showReportForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportForm(false)}
      >
        <View style={styles.formModalOverlay}>
          <View style={styles.formModalContent}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{t('fountains.reportIssue')}</Text>
              <TouchableOpacity
                onPress={() => setShowReportForm(false)}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formSectionLabel}>{t('fountains.issueType')} *</Text>
              <View style={styles.chipsRow}>
                {FOUNTAIN_ISSUE_TYPES.map((key) => {
                  const active = issues.includes(key)
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleIssue(key)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {t(`fountains.issues.${key}`)}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Text style={styles.formSectionLabel}>{t('newSignal.description')}</Text>
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

              <Text style={styles.formSectionLabel}>{t('wasteContainers.photoOptional')}</Text>
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
                  <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                    <Camera size={20} color={colors.primary} />
                    <Text style={styles.photoButtonText}>{t('wasteContainers.takePhoto')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoButton} onPress={handlePickFromLibrary}>
                    <ImageIcon size={20} color={colors.primary} />
                    <Text style={styles.photoButtonText}>
                      {t('wasteContainers.pickFromLibrary')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.formCancelButton}
                  onPress={() => setShowReportForm(false)}
                  disabled={submitting}
                >
                  <Text style={styles.formCancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formSubmitButton,
                    (submitting || issues.length === 0) && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmitReport}
                  disabled={submitting || issues.length === 0}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.surface} size="small" />
                  ) : (
                    <>
                      <CheckCircle size={20} color={colors.surface} />
                      <Text style={styles.formSubmitButtonText}>{t('newSignal.submit')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing['2xs'],
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.textPrimary,
    flex: 1,
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
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  signalsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
  quickInfoContainer: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
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
    gap: spacing.sm,
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
  externalLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing['2xs'],
  },
  externalLinkText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error,
    padding: 14,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  reportButtonText: {
    fontFamily: fonts.semiBold,
    color: colors.surface,
    fontSize: fontSizes.bodySm,
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
  formSectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.surface,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    minHeight: 90,
    color: colors.textPrimary,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoButton: {
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
  photoButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: colors.primary,
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
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
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
    backgroundColor: colors.primary,
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
  buttonDisabled: {
    opacity: 0.6,
  },
})
