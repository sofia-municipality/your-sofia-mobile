import {View, Text, StyleSheet} from 'react-native'
import {missionColors, missionLevelColors, missionRadius} from '@/styles/missionsTheme'
import {fonts, fontSizes} from '@/styles/tokens'
import type {MissionLevel} from '@/types/mission'
import {useTranslation} from 'react-i18next'

const LEVEL_KEY: Record<MissionLevel, string> = {
  'good-first-mission': 'missions.levels.goodFirstMission',
  'verified-contributor': 'missions.levels.verifiedContributor',
  'verified-guardian': 'missions.levels.verifiedGuardian',
}

export function MissionLevelBadge({level}: {level: MissionLevel}) {
  const {t} = useTranslation()
  const color = missionLevelColors[level] ?? missionColors.neonPrimary

  return (
    <View style={[styles.badge, {borderColor: color}]}>
      <View style={[styles.dot, {backgroundColor: color}]} />
      <Text style={[styles.label, {color}]} numberOfLines={1}>
        {t(LEVEL_KEY[level])}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: missionRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.caption,
  },
})
