import {View, Text, StyleSheet, TouchableOpacity} from 'react-native'
import {Lock} from 'lucide-react-native'
import {useTranslation} from 'react-i18next'
import {
  missionColors,
  missionRadius,
  missionSpacing,
  missionStatusColors,
} from '@/styles/missionsTheme'
import {fonts, fontSizes} from '@/styles/tokens'
import type {Mission} from '@/types/mission'
import {MissionLevelBadge} from './MissionLevelBadge'
import {DarPointsBadge} from './DarPointsBadge'

const STATUS_KEY: Record<string, string> = {
  draft: 'missions.status.draft',
  open: 'missions.status.open',
  in_progress: 'missions.status.inProgress',
  ready_for_review: 'missions.status.readyForReview',
  returned_for_improvement: 'missions.status.returnedForImprovement',
  completed: 'missions.status.completed',
  cancelled: 'missions.status.cancelled',
}

export function MissionCard({mission, onPress}: {mission: Mission; onPress: () => void}) {
  const {t} = useTranslation()
  const locked = Boolean(mission.locked)
  const statusColor = missionStatusColors[mission.status] ?? missionColors.neonPrimary

  return (
    <TouchableOpacity
      style={[styles.card, locked && styles.cardLocked]}
      onPress={onPress}
      disabled={locked}
      activeOpacity={0.85}
    >
      <View style={styles.headerRow}>
        <MissionLevelBadge level={mission.level} />
        {locked ? (
          <Lock size={16} color={missionColors.textMuted} />
        ) : (
          <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
        )}
      </View>

      <Text style={[styles.title, locked && styles.textMuted]} numberOfLines={2}>
        {mission.title}
      </Text>

      {mission.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {mission.description}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <DarPointsBadge amount={mission.pointsReward} />
        <Text style={[styles.statusLabel, {color: statusColor}]}>
          {t(STATUS_KEY[mission.status] ?? mission.status)}
        </Text>
      </View>

      {locked && mission.unlockRequirement ? (
        <Text style={styles.unlockText}>{mission.unlockRequirement}</Text>
      ) : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: missionColors.surface,
    borderRadius: missionRadius.lg,
    borderWidth: 1,
    borderColor: missionColors.border,
    padding: missionSpacing.md,
    marginBottom: missionSpacing.sm,
    gap: missionSpacing['2xs'],
  },
  cardLocked: {
    opacity: 0.55,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.h3,
    color: missionColors.textPrimary,
    marginTop: missionSpacing['2xs'],
  },
  textMuted: {
    color: missionColors.textMuted,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: missionColors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: missionSpacing.xs,
  },
  statusLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.caption,
  },
  unlockText: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.caption,
    color: missionColors.textMuted,
    marginTop: missionSpacing['2xs'],
  },
})
