import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native'
import {useRef, useCallback, useEffect, useState} from 'react'
import {useFocusEffect} from '@react-navigation/native'
import {useRouter} from 'expo-router'
import {colors, fonts, fontSizes, radius, spacing} from '@/styles/tokens'
import {useTranslation} from 'react-i18next'
import {AirQualityCard} from '../../../components/AirQualityCard'
import {TopicFilter} from '../../../components/TopicFilter'
import {NewsCard} from '../../../components/NewsCard'
import {NewsMap} from '../../../components/NewsMap'
import {useUpdates} from '../../../hooks/useUpdates'
import {useUpdateCategories} from '../../../hooks/useUpdateCategories'
import {useSubscription} from '../../../hooks/useSubscription'
import {useNotifications} from '../../../hooks/useNotifications'
import {useBellAction} from '../../../contexts/BellActionContext'
import type {AirQualityData} from '../../../types/airQuality'
import type {MapBounds} from '../../../lib/mapBounds'
import {SOFIA_DEFAULT_BOUNDS} from '../../../lib/mapBounds'

const {width} = Dimensions.get('window')

// Mock data for air quality (replace with real API data later)
const mockAirQualityData: AirQualityData = {
  aqi: 45,
  location: 'София - Център',
  timestamp: new Date().toISOString(),
  mainPollutant: 'PM2.5',
  status: 'Good',
}

export default function HomeScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set(['all']))
  const [isMapView, setIsMapView] = useState(false)
  const [isFirstFocus, setIsFirstFocus] = useState(true)
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined)
  const scrollViewRef = useRef<ScrollView>(null)
  const newsSectionRef = useRef<View>(null)
  const bellScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const {registerBellAction} = useBellAction()
  const {filterChips, categories} = useUpdateCategories()
  const {subscription} = useSubscription()

  // Seed selected topics from subscription categories on first load
  const subscriptionSeededRef = useRef(false)
  useEffect(() => {
    if (subscriptionSeededRef.current) return
    if (!subscription) return
    const slugs = subscription.categories.map((c) => c.slug).filter(Boolean)
    if (slugs.length > 0) {
      subscriptionSeededRef.current = true
      setSelectedTopics(new Set(slugs))
    }
  }, [subscription])

  // Derive categories / push token to pass to useUpdates.
  // When specific topics are selected, pass them explicitly.
  // When 'all' is selected, pass no filter — show everything unfiltered.
  const isAllSelected = selectedTopics.has('all')
  const selectedCategories = isAllSelected ? undefined : Array.from(selectedTopics)
  const activePushToken = undefined

  const {
    news,
    loading: newsLoading,
    error: newsError,
    refresh,
  } = useUpdates({
    pushToken: activePushToken,
    categories: selectedCategories,
    limit: 20,
    bounds: SOFIA_DEFAULT_BOUNDS,
    zoom: 11,
    enabled: !isMapView,
  })
  const {
    news: mapNews,
    loading: mapLoading,
    error: mapError,
    refresh: refreshMap,
  } = useUpdates({
    pushToken: activePushToken,
    categories: selectedCategories,
    bounds: isMapView ? mapBounds : null,
    zoom: mapZoom,
    enabled: isMapView,
  })

  // Setup push notifications
  useNotifications()

  // Handle bell click - filter to alerts and scroll to news section
  const handleBellPress = useCallback(() => {
    const bellTopic = categories.includes('uncategorized') ? 'uncategorized' : 'all'
    setSelectedTopics(new Set([bellTopic]))
    // Scroll to news section after a brief delay to allow state update
    bellScrollTimeoutRef.current = setTimeout(() => {
      newsSectionRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({y, animated: true})
        },
        () => {} // onFail callback
      )
    }, 100)
  }, [categories])

  useEffect(() => {
    return () => {
      if (bellScrollTimeoutRef.current) {
        clearTimeout(bellScrollTimeoutRef.current)
      }
    }
  }, [])

  // Register bell action when screen is focused
  useFocusEffect(
    useCallback(() => {
      registerBellAction(handleBellPress)
    }, [registerBellAction, handleBellPress])
  )

  // Refresh news when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus) {
        setIsFirstFocus(false)
        return
      }
      if (isMapView) {
        refreshMap()
      } else {
        refresh()
      }
    }, [isFirstFocus, isMapView, refresh, refreshMap])
  )

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
          <TopicFilter
            selectedTopics={selectedTopics}
            onTopicsChange={setSelectedTopics}
            topics={filterChips}
          />
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionSubtitle}>{t('common.newsForYouSource')}</Text>
            </View>
            <TouchableOpacity
              style={styles.viewToggleButton}
              onPress={() => setIsMapView(!isMapView)}
              accessibilityRole="button"
              accessibilityLabel={isMapView ? t('common.seeList') : t('common.seeMap')}
            >
              <Text style={styles.viewToggleText}>
                {isMapView ? t('common.seeList') : t('common.seeMap')}
              </Text>
            </TouchableOpacity>
          </View>

          {isMapView ? (
            <>
              <NewsMap
                news={mapNews}
                onMarkerPress={(item) => {
                  router.push(`/(tabs)/home/${item.id}`)
                }}
                onBoundsChange={(bounds, zoom) => {
                  setMapBounds(bounds)
                  setMapZoom(zoom)
                }}
              />

              {mapLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>{t('common.loading') || 'Loading...'}</Text>
                </View>
              ) : null}

              {mapError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{mapError}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={refreshMap}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.retry')}
                  >
                    <Text style={styles.retryButtonText}>{t('common.retry') || 'Retry'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : newsLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t('common.loading') || 'Loading...'}</Text>
            </View>
          ) : newsError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{newsError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={refresh}
                accessibilityRole="button"
                accessibilityLabel={t('common.retry')}
              >
                <Text style={styles.retryButtonText}>{t('common.retry') || 'Retry'}</Text>
              </TouchableOpacity>
            </View>
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
                    <IconComponent size={24} color={colors.surface} />
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
                      <IconComponent size={24} color={colors.primary} />
                    </View>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceTitle}>{service.title}</Text>
                      <Text style={styles.serviceDescription}>{service.description}</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View> */}

        {/* Emergency Contact - HIDDEN */}
        {/* <View style={styles.emergencySection}>
          <View style={styles.emergencyContent}>
            <View style={styles.emergencyIcon}>
              <Phone size={24} color={colors.surface} />
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
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: radius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  notificationBadgeText: {
    color: colors.surface,
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.caption,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    gap: spacing['2xs'],
  },
  cityName: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.h2,
    color: colors.surface,
    marginTop: spacing['2xs'],
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    marginBottom: spacing['2xs'],
  },
  sectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.caption,
    color: colors.textMuted,
  },
  quickServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickServiceCard: {
    width: (width - 60) / 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quickServiceIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickServiceTitle: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing['2xs'],
  },
  quickServiceDescription: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  servicesList: {
    gap: spacing.sm,
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
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
    marginTop: spacing['2xs'],
  },
  viewToggleButton: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.full,
  },
  viewToggleText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: colors.primary,
  },
  newsContainer: {
    marginTop: spacing['xs'],
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  errorContainer: {
    padding: spacing.md,
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: colors.error,
    textAlign: 'center',
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    marginBottom: spacing['2xs'],
  },
  serviceDescription: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
  },
  emergencySection: {
    margin: spacing.md,
    backgroundColor: colors.error,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  emergencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  emergencyTitle: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.body,
    color: colors.surface,
  },
  emergencyNumber: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.h3,
    color: colors.surface,
    marginTop: spacing['2xs'],
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  retryButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: colors.surface,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
})
