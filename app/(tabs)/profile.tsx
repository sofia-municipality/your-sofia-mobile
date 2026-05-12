import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Modal,
  Alert,
} from 'react-native'
import {
  User,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Phone,
  Mail,
  AlertCircle,
  LogIn as LogInIcon,
  UserPlus,
  UserX,
} from 'lucide-react-native'
import {useTranslation} from 'react-i18next'
import {useState, useEffect, useCallback} from 'react'
import {useFocusEffect, useRouter} from 'expo-router'
import {GitHubIcon} from '../../components/GitHubIcon'
import {getUniqueReporterId} from '../../lib/deviceId'
import {fetchSignalStats} from '../../lib/payload'
import {EnvironmentSwitcher} from '@/components/EnvironmentSwitcher'
import {LanguageSwitch} from '@/components/LanguageSwitch'
import {useAuth} from '@/contexts/AuthContext'
import {useNotifications} from '@/hooks/useNotifications'
import {colors, fonts, fontSizes} from '@/styles/tokens'
import Constants from 'expo-constants'

const getProfileSections = (t: (key: string) => string) => [
  {
    id: 1,
    title: t('profile.accountSettings'),
    items: [
      {
        id: 11,
        title: t('profile.personalInfo'),
        icon: User,
        description: t('profile.updateProfile'),
      },
      {
        id: 12,
        title: t('profile.notificationSettings'),
        icon: Bell,
        description: t('profile.manageNotifications'),
      },
    ],
  },
  {
    id: 2,
    title: t('profile.contact'),
    items: [
      {
        id: 31,
        title: t('profile.technicalIssues'),
        icon: HelpCircle,
        description: t('profile.technicalIssuesDescription'),
      },
      {
        id: 32,
        title: t('profile.contactUs'),
        icon: Phone,
        description: t('profile.reachSupport'),
      },
    ],
  },
]

interface ProfileSection {
  id: number
  title: string
  items: {
    id: number
    title: string
    icon: any
    description: string
  }[]
}

export default function ProfileScreen() {
  const {t, i18n} = useTranslation()
  const router = useRouter()
  const {user, isAuthenticated, isContainerAdmin, isAdmin, logout, deleteAccount} = useAuth()
  const {expoPushToken, registerAndSendToken} = useNotifications()
  const [isRegisteringToken, setIsRegisteringToken] = useState(false)
  const [deviceId, setDeviceId] = useState<string>('')
  const [signalStats, setSignalStats] = useState<{
    total: number
    active: number
  }>({total: 0, active: 0})
  const [loadingStats, setLoadingStats] = useState(true)
  const [isFirstFocus, setIsFirstFocus] = useState(true)
  const [showForgetMeModal, setShowForgetMeModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadSignalStats = useCallback(async (reporterId: string) => {
    try {
      setLoadingStats(true)
      const stats = await fetchSignalStats(reporterId)
      setSignalStats(stats)
    } catch (error) {
      console.error('Error loading signal stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    getUniqueReporterId().then((id) => {
      setDeviceId(id)
      // Fetch signal stats once we have the device ID
      loadSignalStats(id)
    })
  }, [loadSignalStats])

  useEffect(() => {
    // Reload stats when language changes
    if (deviceId) {
      loadSignalStats(deviceId)
    }
  }, [i18n.language, deviceId, loadSignalStats])

  // Refresh stats when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus) {
        setIsFirstFocus(false)
        return
      }
      if (deviceId) {
        loadSignalStats(deviceId)
      }
    }, [isFirstFocus, deviceId, loadSignalStats])
  )

  const handleForgetMeConfirm = () => {
    // Double confirmation before deletion
    Alert.alert(t('auth.forgetMeAreYouSure'), t('auth.forgetMeAreYouSureMessage'), [
      {
        text: t('common.no'),
        style: 'cancel',
      },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: handleForgetMe,
      },
    ])
  }

  const handleForgetMe = async () => {
    try {
      setIsDeleting(true)
      await deleteAccount()
      setShowForgetMeModal(false)
      Alert.alert(t('common.success'), t('auth.forgetMeSuccess'), [
        {
          text: 'OK',
          onPress: () => router.push('/(tabs)' as any),
        },
      ])
    } catch (error) {
      console.error('Error deleting account:', error)
      Alert.alert(t('common.error'), `${t('auth.forgetMeFailed')}: ${(error as Error).message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const profileSections = getProfileSections(t)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Notification Bar */}

        <TouchableOpacity style={styles.notificationBar}>
          <Text style={styles.notificationText}>{t('profile.anonymity')}</Text>
          <AlertCircle size={24} color={colors.primary} />
        </TouchableOpacity>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={32} color={colors.primary} />
            </View>
            {isAuthenticated && (
              <View style={styles.verifiedBadge}>
                <Shield size={16} color={colors.surface} />
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {isAuthenticated ? user?.name || user?.email : 'Анонимен Потребител'}
            </Text>
            <Text style={styles.profileStatus}>
              {isContainerAdmin
                ? t('auth.containerAdmin')
                : isAuthenticated
                  ? t('common.verifiedCitizen')
                  : t('auth.notAuthenticated')}
            </Text>
            <View style={styles.profileDetails}>
              {isAuthenticated && user?.email && (
                <View style={styles.profileDetailItem}>
                  <Mail size={14} color={colors.textSecondary} />
                  <Text style={styles.profileDetailText}>{user.email}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.languageSwitchContainer}>
            <LanguageSwitch />
          </View>
          {isAdmin && (
            <View style={styles.pushTokenContainer}>
              <Text style={styles.pushTokenLabel}>Push Token</Text>
              <Text style={styles.pushTokenText} selectable>
                {expoPushToken ?? '—'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.registerTokenButton,
                  isRegisteringToken && styles.registerTokenButtonDisabled,
                ]}
                onPress={async () => {
                  setIsRegisteringToken(true)
                  try {
                    await registerAndSendToken()
                  } finally {
                    setIsRegisteringToken(false)
                  }
                }}
                disabled={isRegisteringToken}
                accessibilityRole="button"
              >
                <Text style={styles.registerTokenButtonText}>
                  {isRegisteringToken ? '…' : 'Register Token'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Authentication Section */}
        {!isAuthenticated ? (
          <View style={styles.authSection}>
            <Text style={styles.authTitle}>{t('auth.loginToAccess')}</Text>
            <View style={styles.authButtons}>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.push('/auth/login' as any)}
                accessibilityRole="button"
                accessibilityLabel={t('auth.login')}
              >
                <LogInIcon size={20} color={colors.surface} />
                <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.registerButton}
                onPress={() => router.push('/auth/register' as any)}
                accessibilityRole="button"
                accessibilityLabel={t('auth.register')}
              >
                <UserPlus size={20} color={colors.primary} />
                <Text style={styles.registerButtonText}>{t('auth.register')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={logout}
              accessibilityRole="button"
              accessibilityLabel={t('auth.logout')}
            >
              <LogOut size={20} color={colors.error} />
              <Text style={styles.logoutButtonText}>{t('auth.logout')}</Text>
            </TouchableOpacity>

            {/* Forget Me Button */}
            <TouchableOpacity
              style={styles.forgetMeButton}
              onPress={() => setShowForgetMeModal(true)}
              accessibilityRole="button"
              accessibilityLabel={t('auth.forgetMe')}
            >
              <UserX size={20} color={colors.error} />
              <Text style={styles.forgetMeButtonText}>{t('auth.forgetMe')}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>{t('profile.stats.title')}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{loadingStats ? '-' : signalStats.total}</Text>
              <Text style={styles.statLabel}>{t('profile.stats.signalsCreated')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{loadingStats ? '-' : signalStats.active}</Text>
              <Text style={styles.statLabel}>{t('profile.stats.signalsActive')}</Text>
            </View>
          </View>
        </View>

        {/* Forget Me Modal */}
        <Modal
          visible={showForgetMeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => !isDeleting && setShowForgetMeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <UserX size={48} color={colors.error} />
                <Text style={styles.modalTitle}>{t('auth.forgetMeTitle')}</Text>
              </View>
              <Text style={styles.modalMessage}>{t('auth.forgetMeMessage')}</Text>

              {/* Info Link */}
              <TouchableOpacity
                style={styles.modalInfoLink}
                onPress={() => {
                  setShowForgetMeModal(false)
                  Linking.openURL('https://your.sofia.bg/forget-me')
                }}
                disabled={isDeleting}
                accessibilityRole="link"
                accessibilityLabel={t('auth.forgetMeInfo')}
              >
                <Text style={styles.modalInfoLinkText}>{t('auth.forgetMeInfo')}</Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, isDeleting && styles.modalButtonDisabled]}
                  onPress={() => setShowForgetMeModal(false)}
                  disabled={isDeleting}
                  accessibilityRole="button"
                  accessibilityLabel={t('auth.forgetMeCancel')}
                  accessibilityState={{disabled: isDeleting}}
                >
                  <Text style={styles.modalCancelButtonText}>{t('auth.forgetMeCancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, isDeleting && styles.modalButtonDisabled]}
                  onPress={handleForgetMeConfirm}
                  disabled={isDeleting}
                  accessibilityRole="button"
                  accessibilityLabel={t('auth.forgetMeConfirm')}
                  accessibilityState={{disabled: isDeleting}}
                >
                  <Text style={styles.modalConfirmButtonText}>
                    {isDeleting ? t('common.loading') : t('auth.forgetMeConfirm')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Environment Switcher - Dev Only */}
        <EnvironmentSwitcher />

        {/* Profile Sections */}
        {profileSections.map((section: ProfileSection) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionItems}>
              {section.items.map((item) => {
                const IconComponent = item.icon
                const onPress =
                  item.id === 12
                    ? () => router.push('/(tabs)/notifications' as any)
                    : item.id === 31
                      ? () =>
                          Linking.openURL(
                            'https://github.com/sofia-municipality/your-sofia-mobile/issues'
                          )
                      : item.id === 32
                        ? () => Linking.openURL('https://call.sofia.bg')
                        : undefined
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.menuItem}
                    onPress={onPress}
                    accessibilityRole="button"
                    accessibilityLabel={item.title}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={styles.menuItemIcon}>
                        <IconComponent size={20} color={colors.primary} />
                      </View>
                      <View style={styles.menuItemInfo}>
                        <Text style={styles.menuItemTitle}>{item.title}</Text>
                        <Text style={styles.menuItemDescription}>{item.description}</Text>
                      </View>
                    </View>
                    <ChevronRight size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            Твоята София v{Constants.expoConfig?.version ?? ''}
          </Text>
          <Text style={styles.copyrightText}>{t('common.copyright')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  notificationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    gap: 12,
  },
  notificationText: {
    flex: 1,
    fontSize: fontSizes.bodySm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  githubIcon: {
    flexShrink: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: fontSizes.h2,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageSwitchContainer: {
    position: 'absolute',
    top: 20,
    right: 8,
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: fontSizes.h3,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileStatus: {
    fontSize: fontSizes.bodySm,
    color: '#055796ff',
    marginBottom: 16,
  },
  profileDetails: {
    alignItems: 'center',
    gap: 8,
  },
  profileDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileDetailText: {
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
  },
  pushTokenContainer: {
    marginTop: 16,
    alignItems: 'center',
    gap: 4,
  },
  pushTokenLabel: {
    fontSize: fontSizes.caption,
    color: colors.textMuted,
    fontFamily: fonts.medium,
  },
  pushTokenText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: fonts.monoRegular,
    textAlign: 'center',
  },
  registerTokenButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  registerTokenButtonDisabled: {
    opacity: 0.5,
  },
  registerTokenButtonText: {
    color: colors.surface,
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.medium,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  sectionItems: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: fontSizes.body,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: fontSizes.h2,
    fontFamily: fonts.bold,
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.errorLight,
  },
  signOutText: {
    color: colors.error,
    fontFamily: fonts.medium,
    fontSize: fontSizes.body,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: fontSizes.caption,
    color: colors.textMuted,
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: fontSizes.caption,
    color: colors.textMuted,
  },
  authSection: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    alignItems: 'center',
  },
  authTitle: {
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  authButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  loginButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: colors.surface,
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.semiBold,
  },
  registerButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  registerButtonText: {
    color: colors.primary,
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.semiBold,
  },
  logoutButton: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.errorLight,
  },
  logoutButtonText: {
    color: colors.error,
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.semiBold,
  },
  forgetMeButton: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.errorLight,
  },
  forgetMeButtonText: {
    color: colors.error,
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: fontSizes.h3,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInfoLink: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  modalInfoLinkText: {
    fontSize: fontSizes.bodySm,
    color: colors.primary,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalCancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
  },
  modalConfirmButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: colors.surface,
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
  },
})
