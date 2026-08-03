import {View, Text, StyleSheet} from 'react-native'
import {useTranslation} from 'react-i18next'
import {missionColors, missionRadius, missionSpacing} from '@/styles/missionsTheme'
import {fonts, fontSizes} from '@/styles/tokens'
import type {MissionTask} from '@/types/mission'
import {PhotoCaptureSlot, type CapturedPhoto} from './PhotoCaptureSlot'

interface TaskChecklistProps {
  tasks: MissionTask[]
  editable: boolean
  pendingPhotos: Record<string, {before?: CapturedPhoto; after?: CapturedPhoto}>
  submittingTaskId?: string | null
  onCapturePhoto: (taskId: string, kind: 'before' | 'after', photo: CapturedPhoto) => void
}

export function TaskChecklist({
  tasks,
  editable,
  pendingPhotos,
  submittingTaskId,
  onCapturePhoto,
}: TaskChecklistProps) {
  const {t} = useTranslation()

  return (
    <View style={styles.container}>
      {tasks.map((task, index) => {
        const done = Boolean(task.completedByCitizenAt)
        const pending = pendingPhotos[task.id] ?? {}
        const beforeUrl =
          task.beforePhoto && typeof task.beforePhoto === 'object'
            ? task.beforePhoto.url
            : undefined
        const afterUrl =
          task.afterPhoto && typeof task.afterPhoto === 'object' ? task.afterPhoto.url : undefined

        return (
          <View key={task.id} style={[styles.taskCard, done && styles.taskCardDone]}>
            <Text style={styles.taskTitle}>
              {index + 1}. {task.title}
            </Text>
            <Text style={styles.taskInstructions}>{task.instructions}</Text>
            <View style={styles.criteriaBox}>
              <Text style={styles.criteriaLabel}>{t('missions.acceptanceCriteria')}</Text>
              <Text style={styles.criteriaText}>{task.acceptanceCriteria}</Text>
            </View>

            {editable &&
            (task.requiresBeforePhoto !== false || task.requiresAfterPhoto !== false) ? (
              <View style={styles.photosRow}>
                {task.requiresBeforePhoto !== false ? (
                  <PhotoCaptureSlot
                    label={t('missions.photoBefore')}
                    existingPhotoUrl={beforeUrl}
                    capturedPhoto={pending.before}
                    uploading={submittingTaskId === task.id}
                    onCapture={(photo) => onCapturePhoto(task.id, 'before', photo)}
                  />
                ) : null}
                {task.requiresAfterPhoto !== false ? (
                  <PhotoCaptureSlot
                    label={t('missions.photoAfter')}
                    existingPhotoUrl={afterUrl}
                    capturedPhoto={pending.after}
                    uploading={submittingTaskId === task.id}
                    onCapture={(photo) => onCapturePhoto(task.id, 'after', photo)}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: missionSpacing.sm,
  },
  taskCard: {
    backgroundColor: missionColors.surfaceElevated,
    borderRadius: missionRadius.md,
    borderWidth: 1,
    borderColor: missionColors.border,
    padding: missionSpacing.sm,
    gap: missionSpacing['2xs'],
  },
  taskCardDone: {
    borderColor: missionColors.neonSuccess,
  },
  taskTitle: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.body,
    color: missionColors.textPrimary,
  },
  taskInstructions: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: missionColors.textMuted,
  },
  criteriaBox: {
    borderLeftWidth: 2,
    borderLeftColor: missionColors.neonPrimary,
    paddingLeft: missionSpacing.xs,
  },
  criteriaLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.caption,
    color: missionColors.neonPrimary,
  },
  criteriaText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.caption,
    color: missionColors.textPrimary,
  },
  photosRow: {
    flexDirection: 'row',
    gap: missionSpacing.xs,
    marginTop: missionSpacing['2xs'],
  },
})
