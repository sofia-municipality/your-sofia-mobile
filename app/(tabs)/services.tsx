import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView 
} from 'react-native';
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
  ChevronRight,
  Search
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import servicesEn from '../translations/services.en';
import servicesBg from '../translations/services.bg';

interface Service {
  id: number;
  title: string;
  icon: any;
  description: string;
  status: string;
}

interface ServiceCategory {
  id: number;
  title: string;
  services: Service[];
}

const getServiceCategories = (t: (key: string) => string): ServiceCategory[] => [
  {
    id: 1,
    title: t('services.permits.title'),
    services: [
      {
        id: 11,
        title: t('services.permits.buildingPermits.title'),
        icon: Building2,
        description: t('services.permits.buildingPermits.description'),
        status: t('services.status.available')
      },
      {
        id: 12,
        title: t('services.permits.businessLicense.title'),
        icon: Briefcase,
        description: t('services.permits.businessLicense.description'),
        status: t('services.status.available')
      }
    ]
  },
  {
    id: 2,
    title: t('services.certificates.title'),
    services: [
      {
        id: 21,
        title: t('services.certificates.birth.title'),
        icon: FileCheck,
        description: t('services.certificates.birth.description'),
        status: t('services.status.available')
      },
      {
        id: 22,
        title: t('services.certificates.marriage.title'),
        icon: Users,
        description: t('services.certificates.marriage.description'),
        status: t('services.status.available')
      }
    ]
  },
  {
    id: 3,
    title: t('services.transportation.title'),
    services: [
      {
        id: 31,
        title: t('services.transportation.parking.title'),
        icon: Car,
        description: t('services.transportation.parking.description'),
        status: t('services.status.available')
      },
      {
        id: 32,
        title: t('services.transportation.publicTransport.title'),
        icon: MapPin,
        description: t('services.transportation.publicTransport.description'),
        status: t('services.status.available')
      }
    ]
  },
  {
    id: 4,
    title: t('services.health.title'),
    services: [
      {
        id: 41,
        title: t('services.health.registration.title'),
        icon: Heart,
        description: t('services.health.registration.description'),
        status: t('services.status.available')
      },
      {
        id: 42,
        title: t('services.health.socialBenefits.title'),
        icon: Users,
        description: t('services.health.socialBenefits.description'),
        status: t('services.status.available')
      }
    ]
  },
  {
    id: 5,
    title: t('services.education.title'),
    services: [
      {
        id: 51,
        title: t('services.education.enrollment.title'),
        icon: GraduationCap,
        description: t('services.education.enrollment.description'),
        status: t('services.status.available')
      }
    ]
  },
  {
    id: 6,
    title: t('services.municipal.title'),
    services: [
      {
        id: 61,
        title: t('services.municipal.propertyReg.title'),
        icon: Home,
        description: t('services.municipal.propertyReg.description'),
        status: t('services.status.available')
      },
      {
        id: 62,
        title: t('services.municipal.waste.title'),
        icon: Trash2,
        description: t('services.municipal.waste.description'),
        status: t('services.status.available')
      }
    ]
  }
];

export default function ServicesScreen() {
  const { t } = useTranslation();
  const serviceCategories = getServiceCategories(t);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Услуги</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#6B7280" />
            <Text style={styles.searchPlaceholder}>{t('services.search.placeholder')}</Text>
          </View>
        </View>

        {/* Service Categories */}
        {serviceCategories.map((category: ServiceCategory) => (
          <View key={category.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{category.title}</Text>
            <View style={styles.servicesList}>
              {category.services.map((service: Service) => {
                const IconComponent = service.icon;
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
                );
              })}
            </View>
          </View>
        ))}

        {/* Support Section */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>{t('services.support.title')}</Text>
          <Text style={styles.supportDescription}>
            {t('services.support.description')}
          </Text>
          <TouchableOpacity style={styles.supportButton}>
            <Text style={styles.supportButtonText}>{t('services.support.button')}</Text>
          </TouchableOpacity>
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
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchPlaceholder: {
    marginLeft: 12,
    color: '#9CA3AF',
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  servicesList: {
    gap: 12,
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
    color: '#1F2937',
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
    color: '#6B7280',
    lineHeight: 20,
  },
  supportSection: {
    margin: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  supportDescription: {
    fontSize: 14,
    color: '#6B7280',
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
});