import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Dimensions 
} from 'react-native';
import { 
  MapPin,
  Phone,
  Bell,
  Car,
  Building2,
  FileCheck,
  Zap,
  Heart,
  ChevronRight
} from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { commonStyles } from '../../styles/common';

const { width } = Dimensions.get('window');

const getQuickServices = (t: (key: string) => string) => [
  {
    id: 1,
    title: t('services.payBills'),
    icon: Zap,
    color: '#059669',
    description: t('services.utilitiesAndTaxes')
  },
  {
    id: 2,
    title: t('services.parking'),
    icon: Car,
    color: '#268adcff',
    description: t('services.findAndPay')
  },
  {
    id: 3,
    title: t('services.documents'),
    icon: FileCheck,
    color: '#ac5538ff',
    description: t('services.certificates')
  },
  {
    id: 4,
    title: t('services.emergency'),
    icon: Phone,
    color: '#e25454ff',
    description: t('services.contactHelp')
  }
];

const getCityServices = (t: (key: string) => string) => [
  {
    id: 1,
    title: t('services.buildingPermits'),
    icon: Building2,
    description: t('services.applyConstruction')
  },
  {
    id: 2,
    title: t('services.healthcareServices'),
    icon: Heart,
    description: t('services.findHospitals')
  },
  {
    id: 3,
    title: t('services.cityUpdates'),
    icon: Bell,
    description: t('services.latestNews')
  },
  {
    id: 4,
    title: t('services.findLocations'),
    icon: MapPin,
    description: t('services.municipalOffices')
  }
];

interface Service {
  id: number;
  title: string;
  icon: any;
  color?: string;
  description: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const quickServices = getQuickServices(t);
  const cityServices = getCityServices(t);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={commonStyles.header}>
          <View>
            <Text style={commonStyles.headerTitle}>{t('common.goodMorning')}</Text>
          </View>
          <TouchableOpacity style={commonStyles.headerButton}>
            <Bell size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Quick Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.quickServices')}</Text>
          <View style={styles.quickServicesGrid}>
            {quickServices.map((service: Service) => {
              const IconComponent = service.icon;
              return (
                <TouchableOpacity
                  key={service.id}
                  style={styles.quickServiceCard}
                  onPress={() => {
                    if (service.title === t('services.payBills')) {
                      router.push('/(tabs)/payments');
                    } else {
                      router.push('/(tabs)/services');
                    }
                  }}
                >
                  <View style={[styles.quickServiceIcon, { backgroundColor: service.color }]}>
                    <IconComponent size={24} color="#ffffff" />
                  </View>
                  <Text style={styles.quickServiceTitle}>{service.title}</Text>
                  <Text style={styles.quickServiceDescription}>{service.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* City Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.cityService')}</Text>
          <View style={styles.servicesList}>
            {cityServices.map((service: Service) => {
              const IconComponent = service.icon;
              return (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceCard}
                  onPress={() => router.push('/(tabs)/services')}
                >
                  <View style={styles.serviceCardContent}>
                    <View style={styles.serviceIconContainer}>
                      <IconComponent size={24} color="#1E40AF" />
                    </View>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceTitle}>{service.title}</Text>
                      <Text style={styles.serviceDescription}>{service.description}</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#9CA3AF" />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.emergencySection}>
          <View style={styles.emergencyContent}>
            <View style={styles.emergencyIcon}>
              <Phone size={24} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.emergencyTitle}>{t('common.emergencyServices')}</Text>
              <Text style={styles.emergencyNumber}>Call 112</Text>
            </View>
          </View>
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
  scrollView: {
    flex: 1,
  },
  header: commonStyles.header,
  headerTitle: commonStyles.headerTitle,
  cityName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    fontFamily: 'Inter-Bold',
  },
  quickServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickServiceCard: {
    width: (width - 60) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quickServiceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickServiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  quickServiceDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  servicesList: {
    gap: 12,
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  serviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  emergencySection: {
    margin: 20,
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  emergencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  emergencyNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
    marginTop: 2,
  },
});