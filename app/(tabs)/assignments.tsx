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

interface ContainerWithSignals extends WasteContainer {
  signalCount: number
  activeSignalCount: number
}

export default function AssignmentsScreen() {
  const {t} = useTranslation()
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
          <ActivityIndicator size="large" color="#3B82F6" />
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
                    <CheckSquare size={16} color="#6B7280" />
                    <Text style={styles.infoText}>
                      {t('assignments.containerCount', {count: containerCount})}
                    </Text>
                  </View>
                  {assignedToName && (
                    <View style={styles.infoItem}>
                      <Users size={16} color="#6B7280" />
                      <Text style={styles.infoText} numberOfLines={1}>
                        {assignedToName}
                      </Text>
                    </View>
                  )}
                  {item.dueDate && (
                    <View style={styles.infoItem}>
                      <Calendar size={16} color="#6B7280" />
                      <Text style={styles.infoText}>
                        {new Date(item.dueDate).toLocaleDateString('bg-BG', {
                          day: 'numeric',
                          month: 'short',
                        })}
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
                      <CheckSquare size={24} color="#3B82F6" />
                    ) : (
                      <Square size={24} color="#9CA3AF" />
                    )}
                    <Text style={styles.containerNumber}>{item.publicNumber}</Text>
                    <View style={styles.signalsBadge}>
                      <AlertTriangle
                        size={16}
                        color={item.activeSignalCount > 0 ? '#EF4444' : '#6B7280'}
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
            <Plus size={20} color="#ffffff" />
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
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>{t('assignments.title')}</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData((prev) => ({...prev, title: text}))}
              placeholder={t('assignments.titlePlaceholder')}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>{t('assignments.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData((prev) => ({...prev, description: text}))}
              placeholder={t('assignments.descriptionPlaceholder')}
              placeholderTextColor="#9CA3AF"
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
                      <CheckSquare size={20} color="#3B82F6" />
                    ) : (
                      <Square size={20} color="#9CA3AF" />
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
                <ActivityIndicator color="#ffffff" />
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
                <X size={24} color="#1F2937" />
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
                      : 'N/A'}
                  </Text>
                </View>
              )}

              {/* Due Date */}
              {selectedAssignment.dueDate && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('assignments.dueDate')}</Text>
                  <Text style={styles.detailText}>
                    {new Date(selectedAssignment.dueDate).toLocaleDateString('bg-BG')}
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
  viewSwitcher: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  viewButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  viewButtonActive: {
    backgroundColor: '#3B82F6',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  viewButtonTextActive: {
    color: '#ffffff',
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
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  assignmentCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#1F2937',
  },
  assignmentDescription: {
    fontSize: 14,
    color: '#6B7280',
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
    color: '#6B7280',
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
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  progressBarFillComplete: {
    backgroundColor: '#10B981',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  assignmentMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  containerCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  containerCardSelected: {
    borderColor: '#3B82F6',
    borderWidth: 1,
    backgroundColor: '#EFF6FF',
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
    color: '#1F2937',
  },
  selectionBar: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  signalsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signalsCount: {
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#3B82F6',
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#ffffff',
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
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  activityLabel: {
    fontSize: 14,
    color: '#1F2937',
  },
  selectedInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  selectedInfoText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
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
    color: '#6B7280',
  },
  statusTextPending: {
    color: '#92400E',
  },
  statusTextInProgress: {
    color: '#1E40AF',
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
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  activityTagText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
  },
  containersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  containerTag: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  containerTagText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
})
