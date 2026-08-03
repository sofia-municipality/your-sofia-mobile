import {useCallback, useState} from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useFocusEffect} from '@react-navigation/native'
import {ThumbsUp, ThumbsDown} from 'lucide-react-native'
import {useAuth} from '@/contexts/AuthContext'
import {fetchVerifiableMissions, submitMissionVerification} from '@/lib/payload'
import {missionColors, missionRadius, missionSpacing} from '@/styles/missionsTheme'
import {fonts, fontSizes} from '@/styles/tokens'
import {MissionLevelBadge} from '@/components/missions/MissionLevelBadge'
import {DarPointsBadge} from '@/components/missions/DarPointsBadge'
import type {Mission} from '@/types/mission'

export default function VerifyMissionsScreen() {
  const {t} = useTranslation()
  const {token, user} = useAuth()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const docs = await fetchVerifiableMissions(token)
      setMissions(
        docs.filter((m) => {
          const citizenId = m.citizen && (typeof m.citizen === 'object' ? m.citizen.id : m.citizen)
          return citizenId !== user?.id
        })
      )
    } catch (err) {
      console.error('[VerifyMissions] Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }, [token, user?.id])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const handleVerify = async (missionId: string, decision: 'approve' | 'reject') => {
    if (!token) return
    setSubmittingId(missionId)
    try {
      await submitMissionVerification(missionId, decision, undefined, token)
      setMissions((prev) => prev.filter((m) => m.id !== missionId))
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('missions.verifyError'))
    } finally {
      setSubmittingId(null)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={missionColors.neonPrimary} />
      </View>
    )
  }

  return (
    <FlatList
      style={styles.screen}
      data={missions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('missions.noMissionsToVerify')}</Text>
        </View>
      }
      renderItem={({item}) => (
        <View style={styles.card}>
          <MissionLevelBadge level={item.level} />
          <Text style={styles.title}>{item.title}</Text>
          <DarPointsBadge amount={item.pointsReward} />

          <View style={styles.photosRow}>
            {item.missionBeforePhotos?.[0]?.url ? (
              <Image source={{uri: item.missionBeforePhotos[0].url}} style={styles.photo} />
            ) : null}
            {item.missionAfterPhotos?.[0]?.url ? (
              <Image source={{uri: item.missionAfterPhotos[0].url}} style={styles.photo} />
            ) : null}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleVerify(item.id, 'approve')}
              disabled={submittingId === item.id}
            >
              <ThumbsUp size={16} color={missionColors.textOnNeon} />
              <Text style={styles.actionButtonText}>{t('missions.approve')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleVerify(item.id, 'reject')}
              disabled={submittingId === item.id}
            >
              <ThumbsDown size={16} color={missionColors.textPrimary} />
              <Text style={styles.actionButtonTextReject}>{t('missions.reject')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: missionColors.bg,
  },
  listContent: {
    padding: missionSpacing.md,
    gap: missionSpacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: missionSpacing.lg,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: missionColors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: missionColors.surface,
    borderRadius: missionRadius.lg,
    borderWidth: 1,
    borderColor: missionColors.border,
    padding: missionSpacing.md,
    gap: missionSpacing.xs,
    marginBottom: missionSpacing.sm,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.h3,
    color: missionColors.textPrimary,
  },
  photosRow: {
    flexDirection: 'row',
    gap: missionSpacing.xs,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: missionRadius.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: missionSpacing.xs,
    marginTop: missionSpacing.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: missionRadius.md,
    paddingVertical: 12,
  },
  approveButton: {
    backgroundColor: missionColors.neonSuccess,
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: missionColors.neonDanger,
  },
  actionButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: missionColors.textOnNeon,
  },
  actionButtonTextReject: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: missionColors.neonDanger,
  },
})
