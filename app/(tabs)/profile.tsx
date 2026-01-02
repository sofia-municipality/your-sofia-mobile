import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from 'react-native'
import {
  User,
  Settings,
  Bell,
  Shield,
  CreditCard,
  FileText,
  HelpCircle,
  LogOut,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Fingerprint,
  AlertCircle,
  LogIn as LogInIcon,
  UserPlus,
} from 'lucide-react-native'
import {useTranslation} from 'react-i18next'
import {useState, useEffect, useCallback} from 'react'
import {useFocusEffect, useRouter} from 'expo-router'
import {GitHubIcon} from '../../components/GitHubIcon'
import {getUniqueReporterId} from '../../lib/deviceId'
import {fetchSignalStats} from '../../lib/payload'
import {EnvironmentSwitcher} from '@/components/EnvironmentSwitcher'
import {useAuth} from '@/contexts/AuthContext'

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
    title: 'Services',
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
    title: 'Support',
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
  }[]
}

export default function ProfileScreen() {
  const {t, i18n} = useTranslation()
  const router = useRouter()
  const {user, isAuthenticated, isContainerAdmin, logout} = useAuth()
  const [deviceId, setDeviceId] = useState<string>('')
  const [signalStats, setSignalStats] = useState<{
    total: number
    active: number
  }>({total: 0, active: 0})
  const [loadingStats, setLoadingStats] = useState(true)
  const [isFirstFocus, setIsFirstFocus] = useState(true)

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
                  <Mail size={14} color="#6B7280" />
                  <Text style={styles.profileDetailText}>{user.email}</Text>
                </View>
              )}
            </View>
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
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutButtonText}>{t('auth.logout')}</Text>
          </TouchableOpacity>
        )}

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
                  <TouchableOpacity key={item.id} style={styles.menuItem}>
                    <View style={styles.menuItemContent}>
                      <View style={styles.menuItemIcon}>
                        <IconComponent size={20} color="#1E40AF" />
                      </View>
                      <View style={styles.menuItemInfo}>
                        <Text style={styles.menuItemTitle}>{item.title}</Text>
                        <Text style={styles.menuItemDescription}>{item.description}</Text>
                      </View>
                    </View>
                    <ChevronRight size={20} color="#9CA3AF" />
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
    backgroundColor: '#f8fafc',
  },
  notificationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1E40AF',
    gap: 12,
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#ffffff',
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
    backgroundColor: '#EFF6FF',
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
    borderColor: '#ffffff',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileStatus: {
    fontSize: 14,
    color: '#055796ff',
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
    color: '#6B7280',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionItems: {
    backgroundColor: '#ffffff',
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
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#6B7280',
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
    backgroundColor: '#ffffff',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
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
    color: '#9CA3AF',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  authSection: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  authTitle: {
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#1E40AF',
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
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#1E40AF',
  },
  registerButtonText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '600',
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
    borderColor: '#FEE2E2',
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
})
