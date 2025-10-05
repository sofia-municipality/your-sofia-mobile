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
import { commonStyles } from '../../styles/common';

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
    title: t('permits.title'),
    services: [
      {
        id: 11,
        title: t('permits.buildingPermits.title'),
        icon: Building2,
        description: t('permits.buildingPermits.description'),
        status: t('status.available')
      },
      {
        id: 12,
        title: t('permits.businessLicense.title'),
        icon: Briefcase,
        description: t('permits.businessLicense.description'),
        status: t('status.available')
      }
    ]
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
        status: t('status.available')
      },
      {
        id: 22,
        title: t('certificates.marriage.title'),
        icon: Users,
        description: t('certificates.marriage.description'),
        status: t('status.available')
      }
    ]
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
        status: t('status.available')
      },
      {
        id: 32,
        title: t('transportation.publicTransport.title'),
        icon: MapPin,
        description: t('transportation.publicTransport.description'),
        status: t('status.available')
      }
    ]
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
        status: t('status.available')
      },
      {
        id: 42,
        title: t('health.socialBenefits.title'),
        icon: Users,
        description: t('health.socialBenefits.description'),
        status: t('status.available')
      }
    ]
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
        status: t('status.available')
      }
    ]
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
        status: t('status.available')
      },
      {
        id: 62,
        title: t('municipal.waste.title'),
        icon: Trash2,
        description: t('municipal.waste.description'),
        status: t('status.available')
      }
    ]
  }
];

export default function ServicesScreen() {
  const { t: t_services } = useTranslation('services');
  const { t } = useTranslation();
  const serviceCategories = getServiceCategories(t_services);

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
          <Text style={styles.supportTitle}>{t_services('support.title')}</Text>
          <Text style={styles.supportDescription}>
            {t_services('support.description')}
          </Text>
          <TouchableOpacity style={styles.supportButton}>
            <Text style={styles.supportButtonText}>{t_services('support.button')}</Text>
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