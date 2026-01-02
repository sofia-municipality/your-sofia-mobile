import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native'
import {useRef, useEffect, useCallback, useState} from 'react'
import {useFocusEffect} from '@react-navigation/native'
import {MapPin, Phone, Bell, Car, Building2, FileCheck, Zap, Heart} from 'lucide-react-native'
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import {useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {AirQualityCard} from '../../../components/AirQualityCard'
import {TopicFilter} from '../../../components/TopicFilter'
import {NewsCard} from '../../../components/NewsCard'
import {NewsMap} from '../../../components/NewsMap'
import {useNews} from '../../../hooks/useNews'
import {useNotifications} from '../../../hooks/useNotifications'
import {useBellAction} from '../../../contexts/BellActionContext'
import type {AirQualityData} from '../../../types/airQuality'
import type {NewsTopicType} from '../../../types/news'

const {width} = Dimensions.get('window')

// Mock data for air quality (replace with real API data later)
const mockAirQualityData: AirQualityData = {
  aqi: 45,
  location: 'София - Център',
  timestamp: new Date().toISOString(),
  mainPollutant: 'PM2.5',
  status: 'Good',
}

const getQuickServices = (t: (key: string) => string) => [
  {
    id: 1,
    title: t('services.payBills'),
    icon: Zap,
    color: '#059669',
    description: t('services.utilitiesAndTaxes'),
  },
  {
    id: 2,
    title: t('services.parking'),
    icon: Car,
    color: '#268adcff',
    description: t('services.findAndPay'),
  },
  {
    id: 3,
    title: t('services.documents'),
    icon: FileCheck,
    color: '#ac5538ff',
    description: t('services.certificates'),
  },
  {
    id: 4,
    title: t('services.emergency'),
    icon: Phone,
    color: '#e25454ff',
    description: t('services.contactHelp'),
  },
]

const getCityServices = (t: (key: string) => string) => [
  {
    id: 1,
    title: t('services.buildingPermits'),
    icon: Building2,
    description: t('services.applyConstruction'),
  },
  {
    id: 2,
    title: t('services.healthcareServices'),
    icon: Heart,
    description: t('services.findHospitals'),
  },
  {
    id: 3,
    title: t('services.cityUpdates'),
    icon: Bell,
    description: t('services.latestNews'),
  },
  {
    id: 4,
    title: t('services.findLocations'),
    icon: MapPin,
    description: t('services.municipalOffices'),
  },
]

interface Service {
  id: number
  title: string
  icon: any
  color?: string
  description: string
}

export default function HomeScreen() {
  const router = useRouter()
  const {t} = useTranslation()
  const [selectedTopic, setSelectedTopic] = useState<NewsTopicType>('all')
  const [isMapView, setIsMapView] = useState(false)
  const [isFirstFocus, setIsFirstFocus] = useState(true)
  const scrollViewRef = useRef<ScrollView>(null)
  const newsSectionRef = useRef<View>(null)
  const {registerBellAction} = useBellAction()

  // Load news from Payload API
  const {news, loading: newsLoading, error: newsError, refresh} = useNews(selectedTopic)

  // Setup push notifications
  const {unreadCount, clearUnreadCount} = useNotifications()

  // Handle bell click - filter to alerts and scroll to news section
  const handleBellPress = useCallback(() => {
    setSelectedTopic('alerts')
    // Scroll to news section after a brief delay to allow state update
    setTimeout(() => {
      newsSectionRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({y, animated: true})
        },
        () => {} // onFail callback
      )
    }, 100)
  }, [])

  // Register bell action when component mounts
  useEffect(() => {
    registerBellAction(handleBellPress)
  }, [registerBellAction, handleBellPress])

  // Refresh news when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus) {
        setIsFirstFocus(false)
        return
      }
      refresh()
    }, [isFirstFocus, refresh])
  )

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  })

  if (!fontsLoaded) {
    return null
  }

  const quickServices = getQuickServices(t)
  const cityServices = getCityServices(t)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Air Quality */}
        <View style={styles.section}>
          <AirQualityCard data={mockAirQualityData} />
        </View>

        {/* News For You */}
        <View ref={newsSectionRef} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('common.newsForYou')}</Text>
            <TouchableOpacity
              style={styles.viewToggleButton}
              onPress={() => setIsMapView(!isMapView)}
            >
              <Text style={styles.viewToggleText}>
                {isMapView ? t('common.seeList') : t('common.seeMap')}
              </Text>
            </TouchableOpacity>
          </View>

          <TopicFilter selectedTopic={selectedTopic} onTopicChange={setSelectedTopic} t={t} />

          {newsLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t('common.loading') || 'Loading...'}</Text>
            </View>
          ) : newsError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{newsError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refresh}>
                <Text style={styles.retryButtonText}>{t('common.retry') || 'Retry'}</Text>
              </TouchableOpacity>
            </View>
          ) : isMapView ? (
            <NewsMap
              news={news}
              onMarkerPress={(item) => {
                // You can implement marker press handling here
                console.log('Marker pressed:', item)
              }}
            />
          ) : (
            <View style={styles.newsContainer}>
              {news.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{t('common.noNews') || 'No news available'}</Text>
                </View>
              ) : (
                news.map((item) => <NewsCard key={item.id} item={item} />)
              )}
            </View>
          )}
        </View>

        {/* Quick Services - HIDDEN */}
        {/* <View style={styles.section}>
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
        </View> */}

        {/* City Services - HIDDEN */}
        {/* <View style={styles.section}>
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
        </View> */}

        {/* Emergency Contact - HIDDEN */}
        {/* <View style={styles.emergencySection}>
          <View style={styles.emergencyContent}>
            <View style={styles.emergencyIcon}>
              <Phone size={24} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.emergencyTitle}>{t('common.emergencyServices')}</Text>
              <Text style={styles.emergencyNumber}>Call 112</Text>
            </View>
          </View>
        </View> */}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'Inter-Bold',
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  cityName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  viewToggleButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  newsContainer: {
    marginTop: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    padding: 20,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
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
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
})
