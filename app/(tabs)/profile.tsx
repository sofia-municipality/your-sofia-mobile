import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView 
} from 'react-native';
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
  Edit3,
  Phone,
  Mail,
  MapPin
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { commonStyles } from '../../styles/common';


const getProfileSections = (t: (key: string) => string) => [
  {
    id: 1,
    title: t('profile.accountSettings'),
    items: [
      {
        id: 11,
        title: t('profile.personalInfo'),
        icon: User,
        description: t('profile.updateProfile')
      },
      {
        id: 12,
        title: t('profile.notificationSettings'),
        icon: Bell,
        description: t('profile.manageNotifications')
      },
      {
        id: 13,
        title: t('profile.security'),
        icon: Shield,
        description: t('profile.securitySettings')
      }
    ]
  },
  {
    id: 2,
    title: 'Services',
    items: [
      {
        id: 21,
        title: t('profile.paymentMethods'),
        icon: CreditCard,
        description: t('profile.managePayments')
      },
      {
        id: 22,
        title: t('profile.serviceHistory'),
        icon: FileText,
        description: t('profile.viewRequests')
      }
    ]
  },
  {
    id: 3,
    title: 'Support',
    items: [
      {
        id: 31,
        title: t('profile.helpCenter'),
        icon: HelpCircle,
        description: t('profile.getHelp')
      },
      {
        id: 32,
        title: t('profile.contactUs'),
        icon: Phone,
        description: t('profile.reachSupport')
      }
    ]
  }
];

interface ProfileSection {
  id: number;
  title: string;
  items: {
    id: number;
    title: string;
    icon: any;
    description: string;
  }[];
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const profileSections = getProfileSections(t);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={32} color="#1E40AF" />
            </View>
            <View style={styles.verifiedBadge}>
              <Shield size={16} color="#ffffff" />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Димитър Петров</Text>
            <Text style={styles.profileStatus}>{t('common.verifiedCitizen')}</Text>
            <View style={styles.profileDetails}>
              <View style={styles.profileDetailItem}>
                <Mail size={14} color="#6B7280" />
                <Text style={styles.profileDetailText}>dimitar.petrov@email.com</Text>
              </View>
              <View style={styles.profileDetailItem}>
                <Phone size={14} color="#6B7280" />
                <Text style={styles.profileDetailText}>+359 88 123 4567</Text>
              </View>
              <View style={styles.profileDetailItem}>
                <MapPin size={14} color="#6B7280" />
                <Text style={styles.profileDetailText}>{t('cities.sofia')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Profile Sections */}
        {profileSections.map((section: ProfileSection) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionItems}>
              {section.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.menuItem}
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
                    <ChevronRight size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>{t('profile.stats.servicesUsed')}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>{t('profile.stats.servicesUsed')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>{t('profile.stats.billsPaid')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>{t('profile.stats.activeRequests')}</Text>
            </View>
          </View>
        </View>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    color: '#059669',
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
});