import {useMemo, useState} from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native'
import MapView, {Marker} from 'react-native-maps'
import {useTranslation} from 'react-i18next'
import {useLocalSearchParams, useRouter} from 'expo-router'
import {ExternalLink} from 'lucide-react-native'
import {useAuth} from '@/contexts/AuthContext'
import {useMission, useMissions} from '@/hooks/useMissions'
import {
  missionColors,
  missionRadius,
  missionSpacing,
  missionStatusColors,
} from '@/styles/missionsTheme'
import {fonts, fontSizes} from '@/styles/tokens'
import {MissionLevelBadge} from '@/components/missions/MissionLevelBadge'
import {DarPointsBadge} from '@/components/missions/DarPointsBadge'
import {TaskChecklist} from '@/components/missions/TaskChecklist'
import {PhotoCaptureSlot, type CapturedPhoto} from '@/components/missions/PhotoCaptureSlot'

const STATUS_KEY: Record<string, string> = {
  draft: 'missions.status.draft',
  open: 'missions.status.open',
  in_progress: 'missions.status.inProgress',
  ready_for_review: 'missions.status.readyForReview',
  returned_for_improvement: 'missions.status.returnedForImprovement',
  completed: 'missions.status.completed',
  cancelled: 'missions.status.cancelled',
}

export default function MissionDetailScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const {id} = useLocalSearchParams<{id: string}>()
  const {user} = useAuth()
  const {mission, loading, error, refresh} = useMission(id)
  const {claim, submitTask, submitOverallPhotos, submitForReview, refreshDarPoints} = useMissions()

  const [claiming, setClaiming] = useState(false)
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null)
  const [submittingOverall, setSubmittingOverall] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)

  const missionLocation = useMemo(() => {
    if (!mission?.signal.location) {
      return null
    }

    return {
      latitude: mission.signal.location[1],
      longitude: mission.signal.location[0],
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }
  }, [mission?.signal.location])

  if (loading && !mission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={missionColors.neonPrimary} />
      </View>
    )
  }

  if (error || !mission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? t('missions.notFound')}</Text>
      </View>
    )
  }

  const citizenId =
    mission.citizen && (typeof mission.citizen === 'object' ? mission.citizen.id : mission.citizen)
  const isOwner = citizenId === user?.id
  const canClaim = mission.status === 'open' && !mission.locked
  const isEditable = isOwner && ['in_progress', 'returned_for_improvement'].includes(mission.status)
  const statusColor = missionStatusColors[mission.status] ?? missionColors.neonPrimary

  const allTasksDone = mission.tasks.every((task) => {
    const needsBefore = task.requiresBeforePhoto !== false
    const needsAfter = task.requiresAfterPhoto !== false
    const hasBefore = Boolean(task.beforePhoto)
    const hasAfter = Boolean(task.afterPhoto)
    return (!needsBefore || hasBefore) && (!needsAfter || hasAfter)
  })
  const hasOverallPhotos =
    (mission.missionBeforePhotos?.length ?? 0) > 0 && (mission.missionAfterPhotos?.length ?? 0) > 0
  const canSubmitForReview = isEditable && allTasksDone && hasOverallPhotos

  const handleOpenSignal = () => {
    if (!mission.signal.id) return
    router.push(`/(tabs)/signals/${mission.signal.id}` as any)
  }

  const handleClaim = async () => {
    setClaiming(true)
    try {
      await claim(mission.id)
      await refresh()
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('missions.claimError'))
    } finally {
      setClaiming(false)
    }
  }

  const handleCaptureTaskPhoto = async (
    taskId: string,
    kind: 'before' | 'after',
    photo: CapturedPhoto
  ) => {
    setSubmittingTaskId(taskId)
    try {
      await submitTask(mission.id, taskId, kind === 'before' ? {before: photo} : {after: photo})
      await refresh()
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('missions.taskPhotoError')
      )
    } finally {
      setSubmittingTaskId(null)
    }
  }

  const handleCaptureOverallPhoto = async (kind: 'before' | 'after', photo: CapturedPhoto) => {
    setSubmittingOverall(true)
    try {
      await submitOverallPhotos(
        mission.id,
        kind === 'before' ? {before: [photo]} : {after: [photo]}
      )
      await refresh()
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('missions.overallPhotoError')
      )
    } finally {
      setSubmittingOverall(false)
    }
  }

  const handleSubmitForReview = async () => {
    setSubmittingReview(true)
    try {
      await submitForReview(mission.id)
      await refresh()
      await refreshDarPoints()
      Alert.alert(t('common.success'), t('missions.submittedForReview'))
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('missions.submitReviewError')
      )
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.metaRow}>
        <MissionLevelBadge level={mission.level} />
        <DarPointsBadge amount={mission.pointsAwarded ?? mission.pointsReward} />
        <Text style={[styles.statusLabel, {color: statusColor}]}>
          {t(STATUS_KEY[mission.status] ?? mission.status)}
        </Text>
      </View>
      <Text style={styles.title}>{mission.title}</Text>
      {mission.description ? <Text style={styles.description}>{mission.description}</Text> : null}

      {mission.status === 'returned_for_improvement' && mission.inspectorReviewNotes ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>{t('missions.reviewNotes')}</Text>
          <Text style={styles.noticeText}>{mission.inspectorReviewNotes}</Text>
        </View>
      ) : null}

      {missionLocation && (
        <View style={styles.sectionBox}>
          {missionLocation ? (
            <View style={styles.mapContainer}>
              <MapView style={styles.map} initialRegion={missionLocation} region={missionLocation}>
                <Marker
                  coordinate={{
                    latitude: missionLocation.latitude,
                    longitude: missionLocation.longitude,
                  }}
                />
              </MapView>
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>{t('missions.instructions')}</Text>
        <Text style={styles.instructions}>{mission.generalInstructions}</Text>
      </View>

      {canClaim ? (
        <TouchableOpacity style={styles.primaryButton} onPress={handleClaim} disabled={claiming}>
          {claiming ? (
            <ActivityIndicator color={missionColors.textOnNeon} />
          ) : (
            <Text style={styles.primaryButtonText}>{t('missions.claim')}</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {isOwner ? (
        <>
          <Text style={styles.sectionTitle}>{t('missions.overallPhotos')}</Text>
          <View style={styles.photosRow}>
            <PhotoCaptureSlot
              label={t('missions.photoBefore')}
              existingPhotoUrl={mission.missionBeforePhotos?.[0]?.url}
              uploading={submittingOverall}
              disabled={!isEditable}
              onCapture={(photo) => handleCaptureOverallPhoto('before', photo)}
            />
            <PhotoCaptureSlot
              label={t('missions.photoAfter')}
              existingPhotoUrl={mission.missionAfterPhotos?.[0]?.url}
              uploading={submittingOverall}
              disabled={!isEditable}
              onCapture={(photo) => handleCaptureOverallPhoto('after', photo)}
            />
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>{t('missions.tasks')}</Text>
      <TaskChecklist
        tasks={mission.tasks}
        editable={isEditable}
        pendingPhotos={{}}
        submittingTaskId={submittingTaskId}
        onCapturePhoto={handleCaptureTaskPhoto}
      />

      {isEditable ? (
        <TouchableOpacity
          style={[styles.primaryButton, !canSubmitForReview && styles.primaryButtonDisabled]}
          onPress={handleSubmitForReview}
          disabled={!canSubmitForReview || submittingReview}
        >
          {submittingReview ? (
            <ActivityIndicator color={missionColors.textOnNeon} />
          ) : (
            <Text style={styles.primaryButtonText}>{t('missions.submitForReview')}</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {mission.signal.id ? (
        <TouchableOpacity style={styles.infoCard} onPress={handleOpenSignal}>
          <View style={styles.linkRow}>
            <View style={styles.linkValueRow}>
              <Text style={styles.linkValue}>
                {t('missions.form.linkedSignal') + ' ' + mission.signal.id}
              </Text>
              <ExternalLink size={14} color={missionColors.neonPrimary} />
              <Text style={styles.linkMeta}>
                {[mission.signal.cityObject?.type, mission.signal.cityObject?.referenceId]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : null}

      {(mission.inspector?.name || mission.inspector?.email) && (
        <View style={styles.infoCard}>
          <Text style={styles.infoPrimary}>
            {t('missions.form.inspector') + ': ' + mission.inspector.name}
          </Text>
          <Text style={styles.infoSecondary}>{mission.inspector.email}</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: missionColors.bg,
  },
  content: {
    padding: missionSpacing.md,
    gap: missionSpacing.sm,
    paddingBottom: missionSpacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: missionColors.bg,
  },
  errorText: {
    fontFamily: fonts.medium,
    color: missionColors.textMuted,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.h1,
    color: missionColors.textPrimary,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.body,
    color: missionColors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.label,
  },
  noticeBox: {
    borderWidth: 1,
    borderColor: missionColors.neonDanger,
    borderRadius: missionRadius.md,
    padding: missionSpacing.sm,
    backgroundColor: 'rgba(255,51,102,0.08)',
  },
  noticeTitle: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.label,
    color: missionColors.neonDanger,
  },
  noticeText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: missionColors.textPrimary,
    marginTop: 4,
  },
  sectionBox: {
    backgroundColor: missionColors.surface,
    borderRadius: missionRadius.md,
    borderWidth: 1,
    borderColor: missionColors.border,
    padding: missionSpacing.sm,
  },
  linkCard: {
    borderRadius: missionRadius.md,
    borderWidth: 1,
    borderColor: missionColors.neonPrimary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    padding: missionSpacing.sm,
    marginTop: 6,
  },
  linkRow: {
    gap: 4,
  },
  linkTitle: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: missionColors.textPrimary,
    marginBottom: 4,
  },
  linkLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.caption,
    color: missionColors.textMuted,
  },
  linkValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkValue: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: missionColors.neonPrimary,
    flexShrink: 1,
  },
  linkMeta: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.caption,
    color: missionColors.textMuted,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: missionSpacing.sm,
    borderRadius: missionRadius.md,
    borderWidth: 1,
    borderColor: missionColors.border,
    padding: missionSpacing.sm,
    marginTop: 6,
    backgroundColor: missionColors.bg,
  },
  infoPrimary: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: missionColors.textPrimary,
  },
  infoSecondary: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: missionColors.textMuted,
    textAlign: 'right',
  },
  locationText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: missionColors.textPrimary,
    marginTop: 4,
  },
  mapContainer: {
    marginTop: missionSpacing.sm,
    borderRadius: missionRadius.md,
    overflow: 'hidden',
    height: 180,
    borderWidth: 1,
    borderColor: missionColors.border,
  },
  map: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.label,
    color: missionColors.neonPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: missionSpacing.xs,
  },
  instructions: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: missionColors.textPrimary,
    marginTop: 4,
  },
  photosRow: {
    flexDirection: 'row',
    gap: missionSpacing.xs,
  },
  primaryButton: {
    backgroundColor: missionColors.neonPrimary,
    borderRadius: missionRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: missionSpacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.body,
    color: missionColors.textOnNeon,
  },
})
