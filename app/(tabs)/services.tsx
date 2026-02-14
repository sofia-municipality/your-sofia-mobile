import {View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView} from 'react-native'
import {
  Building2,
  FileCheck,
  Heart,
  Car,
  GraduationCap,
  Briefcase,
  Home,
  Trash2,
  MapPin,
  Users,
  Search,
} from 'lucide-react-native'
import {useTranslation} from 'react-i18next'
import {commonStyles, uiTokens} from '../../styles/common'

interface Service {
  id: number
  title: string
  icon: any
  description: string
  status: string
}

interface ServiceCategory {
  id: number
  title: string
  services: Service[]
}

const getServiceCategories = (t: (key: string) => string): ServiceCategory[] => [
  {
    id: 1,
    title: t('permits.title'),
    services: [
      {
        id: 11,
        title: t('permits.buildingPermits.title'),
        icon: Building2,
        description: t('permits.buildingPermits.description'),
        status: t('status.available'),
      },
      {
        id: 12,
        title: t('permits.businessLicense.title'),
        icon: Briefcase,
        description: t('permits.businessLicense.description'),
        status: t('status.available'),
      },
    ],
  },
  {
    id: 2,
    title: t('certificates.title'),
    services: [
      {
        id: 21,
        title: t('certificates.birth.title'),
        icon: FileCheck,
        description: t('certificates.birth.description'),
        status: t('status.available'),
      },
      {
        id: 22,
        title: t('certificates.marriage.title'),
        icon: Users,
        description: t('certificates.marriage.description'),
        status: t('status.available'),
      },
    ],
  },
  {
    id: 3,
    title: t('transportation.title'),
    services: [
      {
        id: 31,
        title: t('transportation.parking.title'),
        icon: Car,
        description: t('transportation.parking.description'),
        status: t('status.available'),
      },
      {
        id: 32,
        title: t('transportation.publicTransport.title'),
        icon: MapPin,
        description: t('transportation.publicTransport.description'),
        status: t('status.available'),
      },
    ],
  },
  {
    id: 4,
    title: t('health.title'),
    services: [
      {
        id: 41,
        title: t('health.registration.title'),
        icon: Heart,
        description: t('health.registration.description'),
        status: t('status.available'),
      },
      {
        id: 42,
        title: t('health.socialBenefits.title'),
        icon: Users,
        description: t('health.socialBenefits.description'),
        status: t('status.available'),
      },
    ],
  },
  {
    id: 5,
    title: t('education.title'),
    services: [
      {
        id: 51,
        title: t('education.enrollment.title'),
        icon: GraduationCap,
        description: t('education.enrollment.description'),
        status: t('status.available'),
      },
    ],
  },
  {
    id: 6,
    title: t('municipal.title'),
    services: [
      {
        id: 61,
        title: t('municipal.propertyReg.title'),
        icon: Home,
        description: t('municipal.propertyReg.description'),
        status: t('status.available'),
      },
      {
        id: 62,
        title: t('municipal.waste.title'),
        icon: Trash2,
        description: t('municipal.waste.description'),
        status: t('status.available'),
      },
    ],
  },
]

export default function ServicesScreen() {
  const {t: t_services} = useTranslation('services')
  const serviceCategories = getServiceCategories(t_services)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#6B7280" />
            <Text style={styles.searchPlaceholder}>{t_services('search.placeholder')}</Text>
          </View>
        </View>

        {/* Service Categories */}
        {serviceCategories.map((category: ServiceCategory) => (
          <View key={category.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{category.title}</Text>
            <View style={styles.servicesList}>
              {category.services.map((service: Service) => {
                return (
                  <TouchableOpacity key={service.id} style={styles.serviceCard}>
                    <View style={styles.serviceCardHeader}>
                      <Text style={styles.serviceTitle}>{service.title}</Text>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{service.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.serviceDescription}>{service.description}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}

        {/* Support Section */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>{t_services('support.title')}</Text>
          <Text style={styles.supportDescription}>{t_services('support.description')}</Text>
          <TouchableOpacity style={styles.supportButton}>
            <Text style={styles.supportButtonText}>{t_services('support.button')}</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: uiTokens.spacing.xl,
    paddingVertical: uiTokens.spacing.lg,
  },
  searchBar: {
    ...commonStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchPlaceholder: {
    marginLeft: 12,
    color: uiTokens.colors.textMuted,
    fontSize: 14,
  },
  section: {
    paddingHorizontal: uiTokens.spacing.xl,
    marginBottom: uiTokens.spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
    marginBottom: 16,
  },
  servicesList: {
    gap: 12,
  },
  serviceCard: {
    ...commonStyles.card,
    padding: 16,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  serviceDescription: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
    lineHeight: 20,
  },
  supportSection: {
    ...commonStyles.card,
    margin: uiTokens.spacing.xl,
    padding: uiTokens.spacing.xl,
    alignItems: 'center',
    marginBottom: 30,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
    marginBottom: 8,
  },
  supportDescription: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  supportButton: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  supportButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
})
