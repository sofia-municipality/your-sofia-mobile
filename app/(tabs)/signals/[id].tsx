import React, {useState, useEffect} from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useRouter, useLocalSearchParams} from 'expo-router'
import {SafeAreaView} from 'react-native-safe-area-context'
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
  MapPin,
  Calendar,
  Tag,
  FileText,
  AlertCircle,
} from 'lucide-react-native'
import {fetchSignalById, updateSignal} from '../../../lib/payload'
import {getUniqueReporterId} from '../../../lib/deviceId'
import type {Signal} from '../../../types/signal'
import {getStateColor, type ContainerState} from '../../../types/containerState'

export default function SignalDetailsScreen() {
  const {t, i18n} = useTranslation()
  const router = useRouter()
  const {id} = useLocalSearchParams<{id: string}>()

  const [signal, setSignal] = useState<Signal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [deviceId, setDeviceId] = useState<string>('')

  // Edit form state
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [selectedStates, setSelectedStates] = useState<string[]>([])

  useEffect(() => {
    loadSignal()
    loadDeviceId()
  }, [id, i18n.language])

  const loadDeviceId = async () => {
    const id = await getUniqueReporterId()
    setDeviceId(id)
  }

  const loadSignal = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const data = await fetchSignalById(id, i18n.language as 'bg' | 'en')
      setSignal(data)

      // Initialize edit form
      setEditedTitle(data.title || '')
      setEditedDescription(data.description || '')
      setSelectedStates(data.containerState || [])
    } catch (err) {
      console.error('Error loading signal:', err)
      setError(err instanceof Error ? err.message : t('signals.error'))
    } finally {
      setLoading(false)
    }
  }

  // Check if user can edit this signal
  useEffect(() => {
    if (signal && deviceId) {
      const canUserEdit = signal.reporterUniqueId === deviceId
      setCanEdit(canUserEdit)
    }
  }, [signal, deviceId])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    if (!signal) return

    // Reset form to original values
    setEditedTitle(signal.title || '')
    setEditedDescription(signal.description || '')
    setSelectedStates(signal.containerState || [])
    setIsEditing(false)
  }

  const toggleState = (state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    )
  }

  const handleSave = async () => {
    if (!signal || !deviceId) return

    // Validate
    if (!editedTitle.trim()) {
      Alert.alert(t('signals.error'), t('signals.validation.titleRequired'))
      return
    }

    try {
      setSaving(true)

      const updateData = {
        title: editedTitle.trim(),
        description: editedDescription.trim(),
        containerState: selectedStates as ContainerState[],
        reporterUniqueId: deviceId, // Send for server-side verification
      }

      const response = await updateSignal(signal.id, updateData, i18n.language as 'bg' | 'en')

      console.log('[Signal Update] Response:', {
        response,
      })

      // Payload CMS update returns { doc: Signal, message: string }
      // Extract the doc property which contains the actual signal
      const updatedSignal = (response as any).doc

      // Ensure reporterUniqueId is preserved in the updated signal
      // (in case the API response doesn't include it)
      setSignal(updatedSignal)
      setIsEditing(false)
      Alert.alert(t('signals.success'), t('signals.updateSuccess'))
    } catch (err) {
      console.error('Error updating signal:', err)
      Alert.alert(t('signals.error'), err instanceof Error ? err.message : t('signals.updateError'))
    } finally {
      setSaving(false)
    }
  }

  const getStatusIcon = (status: Signal['status']) => {
    const iconProps = {size: 20}
    switch (status) {
      case 'pending':
        return <AlertCircle {...iconProps} color="#F59E0B" />
      case 'in-progress':
        return <AlertCircle {...iconProps} color="#3B82F6" />
      case 'resolved':
        return <AlertCircle {...iconProps} color="#10B981" />
      case 'rejected':
        return <AlertCircle {...iconProps} color="#EF4444" />
      default:
        return null
    }
  }

  const getStatusColor = (status: Signal['status']) => {
    const colors = {
      pending: '#F59E0B',
      'in-progress': '#3B82F6',
      resolved: '#10B981',
      rejected: '#EF4444',
    }
    return colors[status] || '#6B7280'
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !signal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || t('signals.notFound')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSignal}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('signals.form.headerView')} #{signal.id}
        </Text>
        <View style={styles.headerActions}>
          {isEditing ? (
            <>
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={styles.headerButton}
                disabled={saving}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.headerButton, styles.saveButton]}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Save size={24} color="#ffffff" />
                )}
              </TouchableOpacity>
            </>
          ) : canEdit ? (
            <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
              <Edit3 size={24} color="#1E40AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[styles.statusBadge, {backgroundColor: `${getStatusColor(signal.status)}20`}]}
          >
            {getStatusIcon(signal.status)}
            <Text style={[styles.statusText, {color: getStatusColor(signal.status)}]}>
              {t(`signals.status.${signal.status}`)}
            </Text>
          </View>
        </View>

        {/* Category Badge */}
        <View style={styles.metaRow}>
          <Tag size={16} color="#6B7280" />
          <Text style={styles.categoryText}>{t(`signals.categories.${signal.category}`)}</Text>
        </View>

        {/* Title */}
        {isEditing ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('signals.form.title')}</Text>
            <TextInput
              style={styles.input}
              value={editedTitle}
              onChangeText={setEditedTitle}
              placeholder={t('signals.form.titlePlaceholder')}
              editable={!saving}
            />
          </View>
        ) : (
          <Text style={styles.title}>{signal.title}</Text>
        )}

        {/* Description */}
        {isEditing ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('signals.form.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editedDescription}
              onChangeText={setEditedDescription}
              placeholder={t('signals.form.descriptionPlaceholder')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!saving}
            />
          </View>
        ) : signal.description ? (
          <Text style={styles.description}>{signal.description}</Text>
        ) : null}

        {/* Container State */}
        {signal.category === 'waste-container' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('signals.form.containerState')}</Text>
            {isEditing ? (
              <View style={styles.stateTagsContainer}>
                {['full', 'dirty', 'damaged'].map((state) => (
                  <TouchableOpacity
                    key={state}
                    style={[
                      styles.stateTag,
                      selectedStates.includes(state) && {
                        backgroundColor: getStateColor(state),
                        borderColor: getStateColor(state),
                      },
                    ]}
                    onPress={() => toggleState(state)}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.stateTagText,
                        selectedStates.includes(state) && styles.stateTagTextSelected,
                      ]}
                    >
                      {t(`signals.containerStates.${state}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : signal.containerState && signal.containerState.length > 0 ? (
              <View style={styles.stateTagsContainer}>
                {signal.containerState.map((state) => (
                  <View
                    key={state}
                    style={[
                      styles.stateTag,
                      {
                        backgroundColor: getStateColor(state),
                        borderColor: getStateColor(state),
                      },
                    ]}
                  >
                    <Text style={styles.stateTagTextSelected}>
                      {t(`signals.containerStates.${state}`)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}

        {/* City Object */}
        {signal.cityObject?.name && (
          <View style={styles.section}>
            <View style={styles.metaRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.metaText}>{signal.cityObject.name}</Text>
            </View>
          </View>
        )}

        {/* Location */}
        {signal.location?.address && (
          <View style={styles.section}>
            <View style={styles.metaRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.metaText}>{signal.location.address}</Text>
            </View>
          </View>
        )}

        {/* Created Date */}
        <View style={styles.section}>
          <View style={styles.metaRow}>
            <Calendar size={16} color="#6B7280" />
            <Text style={styles.metaText}>
              {new Date(signal.createdAt).toLocaleDateString(i18n.language, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {/* Admin Notes (if any) */}
        {signal.adminNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('signals.adminNotes')}</Text>
            <View style={styles.adminNotesContainer}>
              <FileText size={16} color="#1E40AF" />
              <Text style={styles.adminNotesText}>{signal.adminNotes}</Text>
            </View>
          </View>
        )}

        {/* Edit Permission Info */}
        {!canEdit && !isEditing && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{t('signals.cannotEdit')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  saveButton: {
    backgroundColor: '#1E40AF',
    borderRadius: 8,
  },
  scrollView: {
    flex: 1,
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    paddingHorizontal: 16,
    marginTop: 16,
    lineHeight: 32,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    paddingHorizontal: 16,
    marginTop: 12,
    lineHeight: 24,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
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
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#ffffff',
  },
  stateTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  stateTagTextSelected: {
    color: '#ffffff',
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  adminNotesContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1E40AF',
  },
  adminNotesText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  infoBox: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  infoText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
})
