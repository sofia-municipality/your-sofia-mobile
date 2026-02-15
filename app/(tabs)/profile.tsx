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
  Settings,
  Shield,
  CreditCard,
  FileText,
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
import {commonStyles, uiTokens} from '../../styles/common'

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
        id: 13,
        title: t('profile.security'),
        icon: Shield,
        description: t('profile.securitySettings'),
      },
    ],
  },
  {
    id: 2,
    title: t('profile.sections.services'),
    items: [
      {
        id: 21,
        title: t('profile.paymentMethods'),
        icon: CreditCard,
        description: t('profile.managePayments'),
      },
      {
        id: 22,
        title: t('profile.serviceHistory'),
        icon: FileText,
        description: t('profile.viewRequests'),
      },
    ],
  },
  {
    id: 3,
    title: t('profile.sections.support'),
    items: [
      {
        id: 31,
        title: t('profile.helpCenter'),
        icon: HelpCircle,
        description: t('profile.getHelp'),
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
    onPress?: () => void
  }[]
}

export default function ProfileScreen() {
  const {t, i18n} = useTranslation()
  const router = useRouter()
  const {user, isAuthenticated, isContainerAdmin, logout, deleteAccount} = useAuth()
  const [deviceId, setDeviceId] = useState<string>('')
  const [signalStats, setSignalStats] = useState<{
    total: number
    active: number
  }>({total: 0, active: 0})
  const [loadingStats, setLoadingStats] = useState(true)
  const [isFirstFocus, setIsFirstFocus] = useState(true)
  const [showForgetMeModal, setShowForgetMeModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadSignalStats = useCallback(
    async (reporterId: string) => {
      try {
        setLoadingStats(true)
        const stats = await fetchSignalStats(reporterId, i18n.language as 'bg' | 'en')
        setSignalStats(stats)
      } catch (error) {
        console.error('Error loading signal stats:', error)
      } finally {
        setLoadingStats(false)
      }
    },
    [i18n.language]
  )

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

  const handleForgetMe = async () => {
    // Final confirmation before deletion
    Alert.alert(t('auth.forgetMeAreYouSure'), t('auth.forgetMeAreYouSureMessage'), [
      {
        text: t('common.no'),
        style: 'cancel',
      },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: async () => {
          try {
            setIsDeleting(true)
            await deleteAccount()
            setShowForgetMeModal(false)
            Alert.alert(t('common.success'), t('auth.forgetMeSuccess'), [
              {
                text: t('common.ok'),
                onPress: () => router.push('/(tabs)' as any),
              },
            ])
          } catch (error) {
            console.error('Error deleting account:', error)
            Alert.alert(
              t('common.error'),
              `${t('auth.forgetMeFailed')}: ${(error as Error).message}`
            )
          } finally {
            setIsDeleting(false)
          }
        },
      },
    ])
  }

  const profileSections = getProfileSections(t)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Notification Bar */}

        <TouchableOpacity style={styles.notificationBar}>
          <Text style={styles.notificationText}>{t('profile.anonymity')}</Text>
          <AlertCircle size={24} color="#1E40AF" />
        </TouchableOpacity>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={32} color="#1E40AF" />
            </View>
            {isAuthenticated && (
              <View style={styles.verifiedBadge}>
                <Shield size={16} color="#ffffff" />
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {isAuthenticated ? user?.name || user?.email : t('profile.anonymousUser')}
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
                  <Mail size={14} color="#6B7280" />
                  <Text style={styles.profileDetailText}>{user.email}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.languageSwitchContainer}>
            <LanguageSwitch />
          </View>
        </View>

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

        {/* Authentication Section */}
        {!isAuthenticated ? (
          <View style={styles.authSection}>
            <Text style={styles.authTitle}>{t('auth.loginToAccess')}</Text>
            <View style={styles.authButtons}>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.push('/auth/login' as any)}
              >
                <LogInIcon size={20} color="#ffffff" />
                <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.registerButton}
                onPress={() => router.push('/auth/register' as any)}
              >
                <UserPlus size={20} color="#1E40AF" />
                <Text style={styles.registerButtonText}>{t('auth.register')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <LogOut size={20} color="#EF4444" />
              <Text style={styles.logoutButtonText}>{t('auth.logout')}</Text>
            </TouchableOpacity>

            {/* Forget Me Button */}
            <TouchableOpacity
              style={styles.forgetMeButton}
              onPress={() => setShowForgetMeModal(true)}
            >
              <UserX size={20} color="#DC2626" />
              <Text style={styles.forgetMeButtonText}>{t('auth.forgetMe')}</Text>
            </TouchableOpacity>
          </>
        )}

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
                <UserX size={48} color="#DC2626" />
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
              >
                <Text style={styles.modalInfoLinkText}>{t('auth.forgetMeInfo')}</Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, isDeleting && styles.modalButtonDisabled]}
                  onPress={() => setShowForgetMeModal(false)}
                  disabled={isDeleting}
                >
                  <Text style={styles.modalCancelButtonText}>{t('auth.forgetMeCancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, isDeleting && styles.modalButtonDisabled]}
                  onPress={handleForgetMe}
                  disabled={isDeleting}
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

        <TouchableOpacity
          style={styles.notificationBar}
          onPress={() =>
            Linking.openURL('https://github.com/sofia-municipality/your-sofia-mobile/')
          }
        >
          <Text style={styles.notificationText}>{t('profile.staticScreenNotice')}</Text>
          <GitHubIcon size={24} color="#1E40AF" />
        </TouchableOpacity>

        {/* Profile Sections */}
        {profileSections.map((section: ProfileSection) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionItems}>
              {section.items.map((item) => {
                const IconComponent = item.icon
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.menuItem}
                    onPress={item.onPress}
                    disabled={!item.onPress}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={styles.menuItemIcon}>
                        <IconComponent size={20} color="#1E40AF" />
                      </View>
                      <View style={styles.menuItemInfo}>
                        <Text style={styles.menuItemTitle}>{item.title}</Text>
                        <Text style={styles.menuItemDescription}>{item.description}</Text>
                      </View>
                    </View>
                    {item.onPress ? <ChevronRight size={20} color="#9CA3AF" /> : null}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.appSettings')}</Text>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemIcon}>
                <Settings size={20} color="#6B7280" />
              </View>
              <View style={styles.menuItemInfo}>
                <Text style={styles.menuItemTitle}>{t('profile.appPreferences')}</Text>
                <Text style={styles.menuItemDescription}>{t('profile.languageAndTheme')}</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton}>
            <LogOut size={20} color="#DC2626" />
            <Text style={styles.signOutText}>{t('common.signOut')}</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>{t('common.version')}</Text>
          <Text style={styles.copyrightText}>{t('common.copyright')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: uiTokens.colors.background,
  },
  notificationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: uiTokens.colors.primarySoft,
    padding: uiTokens.spacing.lg,
    margin: uiTokens.spacing.lg,
    borderRadius: uiTokens.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: uiTokens.colors.primary,
    gap: 12,
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
    color: uiTokens.colors.textPrimary,
    lineHeight: 20,
  },
  githubIcon: {
    flexShrink: 0,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    ...commonStyles.card,
    marginHorizontal: uiTokens.spacing.xl,
    marginTop: uiTokens.spacing.xl,
    borderRadius: uiTokens.radius.lg,
    padding: uiTokens.spacing.xl,
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
    backgroundColor: uiTokens.colors.primarySoft,
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
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: uiTokens.colors.surface,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: uiTokens.colors.textPrimary,
    marginBottom: 4,
  },
  profileStatus: {
    fontSize: 14,
    color: uiTokens.colors.primary,
    fontWeight: '500',
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
    fontSize: 14,
    color: uiTokens.colors.textMuted,
  },
  section: {
    paddingHorizontal: uiTokens.spacing.xl,
    marginTop: uiTokens.spacing.xxl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
    marginBottom: 12,
  },
  sectionItems: {
    ...commonStyles.card,
    borderRadius: uiTokens.radius.md,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: uiTokens.colors.surfaceMuted,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: uiTokens.radius.sm,
    backgroundColor: uiTokens.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: uiTokens.colors.textPrimary,
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
  },
  statsSection: {
    paddingHorizontal: uiTokens.spacing.xl,
    marginTop: uiTokens.spacing.xxl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    ...commonStyles.card,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
    textAlign: 'center',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTokens.colors.surface,
    borderRadius: uiTokens.radius.md,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  signOutText: {
    color: '#DC2626',
    fontWeight: '500',
    fontSize: 16,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
  },
  authSection: {
    marginHorizontal: uiTokens.spacing.xl,
    marginTop: 16,
    padding: 20,
    backgroundColor: uiTokens.colors.surfaceMuted,
    borderRadius: uiTokens.radius.md,
    alignItems: 'center',
  },
  authTitle: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
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
    backgroundColor: uiTokens.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  registerButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: uiTokens.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: uiTokens.colors.primary,
  },
  registerButtonText: {
    color: uiTokens.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    marginHorizontal: uiTokens.spacing.xl,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: uiTokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  forgetMeButton: {
    flexDirection: 'row',
    marginHorizontal: uiTokens.spacing.xl,
    marginTop: 8,
    padding: 16,
    backgroundColor: uiTokens.colors.surface,
    borderRadius: uiTokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  forgetMeButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: uiTokens.colors.surface,
    borderRadius: uiTokens.radius.lg,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: uiTokens.colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInfoLink: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  modalInfoLinkText: {
    fontSize: 14,
    color: uiTokens.colors.primary,
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
    borderRadius: uiTokens.radius.sm,
    backgroundColor: uiTokens.colors.surfaceMuted,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: uiTokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: uiTokens.radius.sm,
    backgroundColor: uiTokens.colors.danger,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})
