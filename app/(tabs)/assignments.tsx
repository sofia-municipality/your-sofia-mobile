import React, {useState, useCallback} from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useFocusEffect} from '@react-navigation/native'
import {Plus, CheckSquare, Square, AlertTriangle, X, Calendar, Users} from 'lucide-react-native'
import {useAuth} from '../../contexts/AuthContext'
import {
  fetchAssignments,
  fetchContainersWithSignals,
  createAssignment,
  calculateAssignmentProgress,
} from '../../lib/payload'
import type {Assignment} from '../../types/assignment'
import {
  CONTAINER_STATES,
  type ContainerState,
  type WasteContainer,
} from '../../types/wasteContainer'
import {commonStyles, uiTokens} from '../../styles/common'

interface ContainerWithSignals extends WasteContainer {
  signalCount: number
  activeSignalCount: number
}

export default function AssignmentsScreen() {
  const {t, i18n} = useTranslation()
  const {user, isContainerAdmin, token} = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [containers, setContainers] = useState<ContainerWithSignals[]>([])
  const [selectedContainers, setSelectedContainers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [view, setView] = useState<'assignments' | 'containers'>('assignments')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    activities: new Set<ContainerState>(),
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [assignmentsData, containersData] = await Promise.all([
        fetchAssignments({limit: 50}),
        fetchContainersWithSignals({limit: 1000}),
      ])

      setAssignments(assignmentsData.docs)
      setContainers(containersData.docs)
    } catch (error) {
      console.error('Failed to load assignments data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (isContainerAdmin) {
        loadData()
      }
    }, [loadData, isContainerAdmin])
  )

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [loadData])

  const toggleContainerSelection = useCallback((containerId: string) => {
    setSelectedContainers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(containerId)) {
        newSet.delete(containerId)
      } else {
        newSet.add(containerId)
      }
      return newSet
    })
  }, [])

  const toggleActivity = useCallback((activity: ContainerState) => {
    setFormData((prev) => {
      const newActivities = new Set(prev.activities)
      if (newActivities.has(activity)) {
        newActivities.delete(activity)
      } else {
        newActivities.add(activity)
      }
      return {...prev, activities: newActivities}
    })
  }, [])

  const handleCreateAssignment = useCallback(async () => {
    if (!formData.title.trim()) {
      Alert.alert(t('common.error'), t('assignments.titleRequired'))
      return
    }

    if (formData.activities.size === 0) {
      Alert.alert(t('common.error'), t('assignments.selectActivities'))
      return
    }

    try {
      setIsSubmitting(true)
      await createAssignment(
        {
          title: formData.title,
          description: formData.description || undefined,
          containers: Array.from(selectedContainers),
          activities: Array.from(formData.activities),
          assignedTo: user!.id,
          status: 'pending',
        },
        token!
      )

      Alert.alert(t('common.success'), t('assignments.created'))
      setShowCreateModal(false)
      setFormData({title: '', description: '', activities: new Set()})
      setSelectedContainers(new Set())
      loadData()
    } catch (error) {
      console.error('Failed to create assignment:', error)
      Alert.alert(t('common.error'), t('assignments.createFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, selectedContainers, user, token, t, loadData])

  const selectedCount = selectedContainers.size

  if (!isContainerAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('newCityObject.adminOnly')}</Text>
        </View>
      </View>
    )
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={uiTokens.colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* View Switcher */}
      <View style={styles.viewSwitcher}>
        <TouchableOpacity
          style={[styles.viewButton, view === 'assignments' && styles.viewButtonActive]}
          onPress={() => setView('assignments')}
        >
          <Text
            style={[styles.viewButtonText, view === 'assignments' && styles.viewButtonTextActive]}
          >
            {t('assignments.title')} ({assignments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewButton, view === 'containers' && styles.viewButtonActive]}
          onPress={() => setView('containers')}
        >
          <Text
            style={[styles.viewButtonText, view === 'containers' && styles.viewButtonTextActive]}
          >
            {t('assignments.selectContainers')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {view === 'assignments' ? (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('assignments.noAssignments')}</Text>
              <Text style={styles.emptySubtext}>{t('assignments.createNew')}</Text>
            </View>
          }
          renderItem={({item}) => {
            const progress = calculateAssignmentProgress(item)
            const containerCount = Array.isArray(item.containers) ? item.containers.length : 0
            const assignedToName =
              item.assignedTo && typeof item.assignedTo === 'object'
                ? item.assignedTo.name || item.assignedTo.email
                : null

            return (
              <TouchableOpacity
                style={styles.assignmentCard}
                onPress={() => setSelectedAssignment(item)}
                activeOpacity={0.7}
              >
                <View style={styles.assignmentCardHeader}>
                  <Text style={styles.assignmentTitle}>{item.title}</Text>
                  <View
                    style={[
                      styles.statusBadgeSmall,
                      item.status === 'completed' && styles.statusBadgeCompleted,
                      item.status === 'in-progress' && styles.statusBadgeInProgress,
                      item.status === 'pending' && styles.statusBadgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTextSmall,
                        item.status === 'completed' && styles.statusTextCompleted,
                        item.status === 'in-progress' && styles.statusTextInProgress,
                        item.status === 'pending' && styles.statusTextPending,
                      ]}
                    >
                      {t('assignments.status.' + item.status)}
                    </Text>
                  </View>
                </View>

                {item.description && (
                  <Text style={styles.assignmentDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}

                <View style={styles.assignmentInfo}>
                  <View style={styles.infoItem}>
                    <CheckSquare size={16} color={uiTokens.colors.textMuted} />
                    <Text style={styles.infoText}>
                      {t('assignments.containerCount', {count: containerCount})}
                    </Text>
                  </View>
                  {assignedToName && (
                    <View style={styles.infoItem}>
                      <Users size={16} color={uiTokens.colors.textMuted} />
                      <Text style={styles.infoText} numberOfLines={1}>
                        {assignedToName}
                      </Text>
                    </View>
                  )}
                  {item.dueDate && (
                    <View style={styles.infoItem}>
                      <Calendar size={16} color={uiTokens.colors.textMuted} />
                      <Text style={styles.infoText}>
                        {new Date(item.dueDate).toLocaleDateString(
                          i18n.language === 'bg' ? 'bg-BG' : 'en-US',
                          {
                            day: 'numeric',
                            month: 'short',
                          }
                        )}
                      </Text>
                    </View>
                  )}
                </View>

                {containerCount > 0 && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>{t('assignments.progress')}</Text>
                      <Text style={styles.progressPercentage}>{progress.percentageComplete}%</Text>
                    </View>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {width: `${progress.percentageComplete}%`},
                          progress.percentageComplete === 100 && styles.progressBarFillComplete,
                        ]}
                      />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )
          }}
        />
      ) : (
        <>
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>
              {t('assignments.containerSelected', {count: selectedCount})}
            </Text>
          </View>

          <FlatList
            data={containers}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{t('common.loading')}</Text>
              </View>
            }
            renderItem={({item}) => {
              const isSelected = selectedContainers.has(item.id)
              return (
                <TouchableOpacity
                  style={[styles.containerCard, isSelected && styles.containerCardSelected]}
                  onPress={() => toggleContainerSelection(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.containerCardContent}>
                    {isSelected ? (
                      <CheckSquare size={24} color={uiTokens.colors.primary} />
                    ) : (
                      <Square size={24} color={uiTokens.colors.textMuted} />
                    )}
                    <Text style={styles.containerNumber}>{item.publicNumber}</Text>
                    <View style={styles.signalsBadge}>
                      <AlertTriangle
                        size={16}
                        color={item.activeSignalCount > 0 ? '#EF4444' : uiTokens.colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.signalsCount,
                          item.activeSignalCount > 0 && styles.signalsCountActive,
                        ]}
                      >
                        {item.signalCount}
                        {item.activeSignalCount > 0 && ` (${item.activeSignalCount})`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )
            }}
          />
        </>
      )}

      {/* Create Button */}
      {view === 'containers' && selectedCount > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.fabContent}>
            <Plus size={20} color={uiTokens.colors.surface} />
            <Text style={styles.fabText}>{selectedCount}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Create Assignment Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('assignments.createNew')}</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <X size={24} color={uiTokens.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>{t('assignments.title')}</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData((prev) => ({...prev, title: text}))}
              placeholder={t('assignments.titlePlaceholder')}
              placeholderTextColor={uiTokens.colors.textMuted}
            />

            <Text style={styles.label}>{t('assignments.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData((prev) => ({...prev, description: text}))}
              placeholder={t('assignments.descriptionPlaceholder')}
              placeholderTextColor={uiTokens.colors.textMuted}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>{t('assignments.selectActivities')}</Text>
            <View style={styles.activitiesContainer}>
              {CONTAINER_STATES.map((activity) => {
                const isSelected = formData.activities.has(activity)
                return (
                  <TouchableOpacity
                    key={activity}
                    style={styles.activityItem}
                    onPress={() => toggleActivity(activity)}
                    activeOpacity={0.7}
                  >
                    {isSelected ? (
                      <CheckSquare size={20} color={uiTokens.colors.primary} />
                    ) : (
                      <Square size={20} color={uiTokens.colors.textMuted} />
                    )}
                    <Text style={styles.activityLabel}>
                      {t(`signals.containerStates.${activity}`)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={styles.selectedInfo}>
              <Text style={styles.selectedInfoText}>
                {t('assignments.containerSelected', {count: selectedCount})}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreateModal(false)}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleCreateAssignment}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={uiTokens.colors.surface} />
              ) : (
                <Text style={styles.submitButtonText}>{t('common.new')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assignment Detail Modal */}
      <Modal
        visible={selectedAssignment !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedAssignment(null)}
      >
        {selectedAssignment && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedAssignment.title}</Text>
              <TouchableOpacity onPress={() => setSelectedAssignment(null)}>
                <X size={24} color={uiTokens.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Status */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('assignments.status.title')}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    selectedAssignment.status === 'completed' && styles.statusBadgeCompleted,
                    selectedAssignment.status === 'in-progress' && styles.statusBadgeInProgress,
                    selectedAssignment.status === 'pending' && styles.statusBadgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      selectedAssignment.status === 'completed' && styles.statusTextCompleted,
                      selectedAssignment.status === 'in-progress' && styles.statusTextInProgress,
                      selectedAssignment.status === 'pending' && styles.statusTextPending,
                    ]}
                  >
                    {t('assignments.status.' + selectedAssignment.status)}
                  </Text>
                </View>
              </View>

              {/* Description */}
              {selectedAssignment.description && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('assignments.description')}</Text>
                  <Text style={styles.detailText}>{selectedAssignment.description}</Text>
                </View>
              )}

              {/* Activities */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t('assignments.activities')}</Text>
                <View style={styles.activitiesList}>
                  {selectedAssignment.activities?.map((activity) => (
                    <View key={activity} style={styles.activityTag}>
                      <Text style={styles.activityTagText}>
                        {t(`signals.containerStates.${activity}`)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Assigned To */}
              {selectedAssignment.assignedTo && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('assignments.assignTo')}</Text>
                  <Text style={styles.detailText}>
                    {typeof selectedAssignment.assignedTo === 'object'
                      ? selectedAssignment.assignedTo.name || selectedAssignment.assignedTo.email
                      : '—'}
                  </Text>
                </View>
              )}

              {/* Due Date */}
              {selectedAssignment.dueDate && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('assignments.dueDate')}</Text>
                  <Text style={styles.detailText}>
                    {new Date(selectedAssignment.dueDate).toLocaleDateString(
                      i18n.language === 'bg' ? 'bg-BG' : 'en-US'
                    )}
                  </Text>
                </View>
              )}

              {/* Containers */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>
                  {t('assignments.containerCount', {
                    count: Array.isArray(selectedAssignment.containers)
                      ? selectedAssignment.containers.length
                      : 0,
                  })}
                </Text>
                <View style={styles.containersList}>
                  {Array.isArray(selectedAssignment.containers) &&
                    selectedAssignment.containers.map((container) => {
                      const containerObj =
                        typeof container === 'object' ? container : {publicNumber: container}
                      return (
                        <View key={containerObj.publicNumber} style={styles.containerTag}>
                          <Text style={styles.containerTagText}>{containerObj.publicNumber}</Text>
                        </View>
                      )
                    })}
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: uiTokens.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: uiTokens.colors.textMuted,
  },
  viewSwitcher: {
    flexDirection: 'row',
    padding: uiTokens.spacing.lg,
    gap: 12,
    backgroundColor: uiTokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: uiTokens.colors.border,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: uiTokens.radius.sm,
    backgroundColor: uiTokens.colors.surfaceMuted,
    alignItems: 'center',
  },
  viewButtonActive: {
    backgroundColor: uiTokens.colors.primary,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTokens.colors.textMuted,
  },
  viewButtonTextActive: {
    color: uiTokens.colors.surface,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: uiTokens.colors.textMuted,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
  },
  assignmentCard: {
    ...commonStyles.card,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
  },
  assignmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  assignmentTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
  },
  assignmentDescription: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
    marginBottom: 12,
    lineHeight: 20,
  },
  assignmentInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: uiTokens.colors.textMuted,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: uiTokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: uiTokens.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: uiTokens.colors.primary,
    borderRadius: 3,
  },
  progressBarFillComplete: {
    backgroundColor: '#10B981',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: uiTokens.radius.sm,
    backgroundColor: uiTokens.colors.surfaceMuted,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: uiTokens.colors.textMuted,
  },
  assignmentMeta: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
  },
  containerCard: {
    ...commonStyles.card,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 8,
  },
  containerCardSelected: {
    borderColor: uiTokens.colors.primary,
    borderWidth: 1,
    backgroundColor: uiTokens.colors.primarySoft,
  },
  containerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  containerNumber: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
  },
  selectionBar: {
    backgroundColor: uiTokens.colors.primarySoft,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTokens.colors.primary,
  },
  signalsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signalsCount: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
  },
  signalsCountActive: {
    color: '#EF4444',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: uiTokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fabText: {
    color: uiTokens.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: uiTokens.colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: uiTokens.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: uiTokens.spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: uiTokens.radius.sm,
    padding: 12,
    fontSize: 16,
    color: uiTokens.colors.textPrimary,
    backgroundColor: uiTokens.colors.surface,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  activitiesContainer: {
    gap: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 4,
    borderRadius: uiTokens.radius.sm,
    backgroundColor: uiTokens.colors.background,
  },
  activityLabel: {
    fontSize: 14,
    color: uiTokens.colors.textPrimary,
  },
  selectedInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: uiTokens.colors.primarySoft,
    borderRadius: uiTokens.radius.sm,
  },
  selectedInfoText: {
    fontSize: 14,
    color: uiTokens.colors.primary,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: uiTokens.colors.border,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: uiTokens.radius.sm,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: uiTokens.colors.textMuted,
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: uiTokens.radius.sm,
    backgroundColor: uiTokens.colors.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: uiTokens.colors.surface,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTokens.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 16,
    color: uiTokens.colors.textPrimary,
    lineHeight: 24,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: uiTokens.radius.md,
    backgroundColor: uiTokens.colors.surfaceMuted,
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeInProgress: {
    backgroundColor: '#DBEAFE',
  },
  statusBadgeCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTokens.colors.textMuted,
  },
  statusTextPending: {
    color: '#92400E',
  },
  statusTextInProgress: {
    color: uiTokens.colors.primary,
  },
  statusTextCompleted: {
    color: '#065F46',
  },
  activitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityTag: {
    backgroundColor: uiTokens.colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  activityTagText: {
    fontSize: 14,
    color: uiTokens.colors.primary,
    fontWeight: '500',
  },
  containersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  containerTag: {
    backgroundColor: uiTokens.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: uiTokens.colors.border,
  },
  containerTagText: {
    fontSize: 14,
    color: uiTokens.colors.textPrimary,
    fontWeight: '500',
  },
})
