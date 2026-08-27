import {useCallback} from 'react'
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useFocusEffect, useRouter} from 'expo-router'
import {ShieldCheck} from 'lucide-react-native'
import {useAuth} from '@/contexts/AuthContext'
import {useMissions} from '@/hooks/useMissions'
import {missionColors, missionSpacing} from '@/styles/missionsTheme'
import {fonts, fontSizes} from '@/styles/tokens'
import {MissionCard} from '@/components/missions/MissionCard'
import {DarPointsBadge} from '@/components/missions/DarPointsBadge'
import type {Mission, MissionLevel} from '@/types/mission'

const LEVEL_ORDER: MissionLevel[] = [
  'good-first-mission',
  'verified-contributor',
  'verified-guardian',
]
const LEVEL_TITLE_KEY: Record<MissionLevel, string> = {
  'good-first-mission': 'missions.levels.goodFirstMission',
  'verified-contributor': 'missions.levels.verifiedContributor',
  'verified-guardian': 'missions.levels.verifiedGuardian',
}

export default function MissionsScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const {isAuthenticated, user} = useAuth()
  const {missions, loading, refresh} = useMissions()

  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>{t('missions.loginRequiredTitle')}</Text>
        <Text style={styles.emptyBody}>{t('missions.loginRequiredBody')}</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/auth/login' as any)}
        >
          <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const ownMissions = missions.filter(
    (m) => m.citizen && (typeof m.citizen === 'object' ? m.citizen.id : m.citizen) === user?.id
  )
  const openMissions = missions.filter((m) => m.status === 'open')

  const sections = [
    ...(ownMissions.length > 0
      ? [{title: t('missions.myMissions'), key: 'own', data: ownMissions}]
      : []),
    ...LEVEL_ORDER.map((level) => ({
      title: t(LEVEL_TITLE_KEY[level]),
      key: level,
      data: openMissions.filter((m) => m.level === level),
    })).filter((section) => section.data.length > 0),
  ]

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>{t('missions.questBoard')}</Text>
          <Text style={styles.headerSubtitle}>{t('missions.questBoardSubtitle')}</Text>
        </View>
        {user?.darPoints !== undefined ? (
          <DarPointsBadge amount={user.darPoints} prefix="" />
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.verifyLink}
        onPress={() => router.push('/(tabs)/missions/verify' as any)}
      >
        <ShieldCheck size={16} color={missionColors.neonSecondary} />
        <Text style={styles.verifyLinkText}>{t('missions.verifyMissions')}</Text>
      </TouchableOpacity>

      {loading && missions.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={missionColors.neonPrimary} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: Mission) => item.id}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({section}) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          renderItem={({item}) => (
            <MissionCard
              mission={item}
              onPress={() => router.push(`/(tabs)/missions/${item.id}` as any)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={missionColors.neonPrimary}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyBody}>{t('missions.noMissionsAvailable')}</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: missionColors.bg,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: missionSpacing.md,
    paddingTop: missionSpacing.md,
  },
  headerTitle: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.h1,
    color: missionColors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: missionColors.textMuted,
    marginTop: 2,
  },
  verifyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: missionSpacing.md,
    marginTop: missionSpacing.sm,
    alignSelf: 'flex-start',
  },
  verifyLinkText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: missionColors.neonSecondary,
  },
  listContent: {
    padding: missionSpacing.md,
    paddingBottom: missionSpacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.label,
    color: missionColors.neonPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: missionSpacing.md,
    marginBottom: missionSpacing.xs,
  },
  loader: {
    marginTop: missionSpacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: missionSpacing.lg,
    gap: missionSpacing.xs,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.h2,
    color: missionColors.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: missionColors.textMuted,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: missionColors.neonPrimary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: missionSpacing.sm,
  },
  loginButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.body,
    color: missionColors.textOnNeon,
  },
})
