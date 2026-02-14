import {View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView} from 'react-native'
import {useRef, useCallback, useState, useMemo} from 'react'
import {useFocusEffect} from '@react-navigation/native'
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
import {useOboCategories} from '../../../hooks/useOboCategories'
import {useOboMessages} from '../../../hooks/useOboMessages'
import {useOboSources} from '../../../hooks/useOboSources'
import {useBellAction} from '../../../contexts/BellActionContext'
import type {AirQualityData} from '../../../types/airQuality'
import type {NewsTopicType} from '../../../types/news'
import type {MapBounds} from '../../../lib/mapBounds'
import {uiTokens} from '../../../styles/common'

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
  const [selectedTopic, setSelectedTopic] = useState<NewsTopicType>('all')
  const [isMapView, setIsMapView] = useState(false)
  const [isFirstFocus, setIsFirstFocus] = useState(true)
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined)
  const scrollViewRef = useRef<ScrollView>(null)
  const newsSectionRef = useRef<View>(null)
  const {registerBellAction} = useBellAction()
  const selectedCategories = useMemo(
    () => (selectedTopic !== 'all' ? [selectedTopic] : undefined),
    [selectedTopic]
  )

  // Load recent news from OboApp
  const {news, loading: newsLoading, error: newsError, refresh} = useNews(selectedTopic)
  const {sourcesMap} = useOboSources()
  const {
    news: mapNews,
    loading: mapLoading,
    error: mapError,
    refresh: refreshMap,
  } = useOboMessages({
    categories: selectedCategories,
    bounds: isMapView ? mapBounds : null,
    zoom: mapZoom,
    enabled: isMapView,
    sourcesMap,
  })
  const {categories, filterChips} = useOboCategories()

  // Handle bell click - filter to alerts and scroll to news section
  const handleBellPress = useCallback(() => {
    const bellTopic = categories.includes('uncategorized') ? 'uncategorized' : 'all'
    setSelectedTopic(bellTopic)
    setTimeout(() => {
      newsSectionRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({y, animated: true})
        },
        () => {}
      )
    }, 100)
  }, [categories])

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

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  })

  if (!fontsLoaded) {
    return null
  }

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
            <View>
              <Text style={styles.sectionTitle}>{t('common.newsForYou')}</Text>
              <Text style={styles.sectionSubtitle}>{t('common.poweredByOboApp')}</Text>
            </View>
            <TouchableOpacity
              style={styles.viewToggleButton}
              onPress={() => setIsMapView(!isMapView)}
            >
              <Text style={styles.viewToggleText}>
                {isMapView ? t('common.seeList') : t('common.seeMap')}
              </Text>
            </TouchableOpacity>
          </View>

          <TopicFilter
            selectedTopic={selectedTopic}
            onTopicChange={setSelectedTopic}
            topics={filterChips}
          />

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
                  <Text style={styles.loadingText}>{t('common.loading')}</Text>
                </View>
              ) : null}
              {mapError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{mapError}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={refreshMap}>
                    <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : newsLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : newsError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{newsError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refresh()}>
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.newsContainer}>
              {news.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{t('common.noNews')}</Text>
                </View>
              ) : (
                news.map((item) => <NewsCard key={item.id} item={item} />)
              )}
            </View>
          )}
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
  section: {
    paddingHorizontal: uiTokens.spacing.xl,
    marginTop: uiTokens.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: uiTokens.colors.textPrimary,
    marginBottom: 4,
    fontFamily: 'Inter-Bold',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: uiTokens.colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: uiTokens.spacing.lg,
  },
  viewToggleButton: {
    backgroundColor: uiTokens.colors.primarySoft,
    paddingHorizontal: uiTokens.spacing.md,
    paddingVertical: 6,
    borderRadius: uiTokens.radius.pill,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTokens.colors.primary,
  },
  newsContainer: {
    marginTop: uiTokens.spacing.lg,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: uiTokens.colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    padding: uiTokens.spacing.xl,
    backgroundColor: uiTokens.colors.dangerSoft,
    borderRadius: uiTokens.radius.sm,
    marginTop: uiTokens.spacing.lg,
  },
  errorText: {
    fontSize: 14,
    color: uiTokens.colors.danger,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: uiTokens.colors.danger,
    paddingHorizontal: uiTokens.spacing.xl,
    paddingVertical: 10,
    borderRadius: uiTokens.radius.sm,
    marginTop: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTokens.colors.surface,
    fontFamily: 'Inter-SemiBold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: uiTokens.colors.textMuted,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
})
