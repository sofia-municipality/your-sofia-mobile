import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
  SafeAreaView,
} from 'react-native'
import {useLocalSearchParams, useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import MapView, {Marker} from 'react-native-maps'
import {MapPin, Building2, ExternalLink, BusFront, ChevronLeft} from 'lucide-react-native'
import {useOboMessageById} from '@/hooks/useOboMessageById'
import {useOboSources} from '@/hooks/useOboSources'
import {mapOboMessageToNewsItem} from '@/lib/oboapp'
import {CategoryBadge} from '@/components/CategoryBadge'
import {TimespanBadge} from '@/components/TimespanBadge'
import {SimpleMarkdown} from '@/components/SimpleMarkdown'
import {getCategoryColor} from '@/lib/categories'

export default function NewsDetail() {
  const {id} = useLocalSearchParams<{id: string}>()
  const {t, i18n} = useTranslation()
  const router = useRouter()
  const {message, loading, error} = useOboMessageById(id)
  const {sourcesMap} = useOboSources()

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    )
  }

  if (error || !message) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || t('common.error')}</Text>
      </View>
    )
  }

  const item = mapOboMessageToNewsItem(message, i18n.language, sourcesMap)
  const dateSource = message.finalizedAt ?? message.createdAt
  const formattedDate = new Date(dateSource ?? new Date()).toLocaleDateString(
    i18n.language === 'bg' ? 'bg-BG' : 'en-US',
    {year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'}
  )
  const sourceInfo = message.source ? sourcesMap[message.source] : undefined
  const primaryColor = getCategoryColor(item.categories?.[0] ?? item.topic)

  // Compute map region from all locations
  const locations = item.allLocations ?? []
  let mapRegion = null
  if (locations.length > 0) {
    const lats = locations.map((l) => l.latitude)
    const lngs = locations.map((l) => l.longitude)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    mapRegion = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.005) * 1.5,
      longitudeDelta: Math.max(maxLng - minLng, 0.005) * 1.5,
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom compact header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <ChevronLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {item.title || t('common.news')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Category badges */}
          {item.categories && item.categories.length > 0 ? (
            <View style={styles.categoriesRow}>
              {item.categories.map((cat) => (
                <CategoryBadge key={cat} category={cat} size="medium" />
              ))}
            </View>
          ) : null}

          {/* Timespan */}
          {item.timespanStatus ? (
            <View style={styles.section}>
              <TimespanBadge
                status={item.timespanStatus}
                startDate={item.timespanStart}
                endDate={item.timespanEnd}
              />
            </View>
          ) : null}

          {/* City-wide indicator */}
          {item.cityWide ? (
            <View style={styles.cityWideBadge}>
              <Text style={styles.cityWideText}>{t('common.cityWide')}</Text>
            </View>
          ) : null}

          {/* Date */}
          <Text style={styles.date}>{formattedDate}</Text>

          {/* Main content */}
          <View style={styles.mainContent}>
            {message.markdownText ? (
              <SimpleMarkdown text={message.markdownText} />
            ) : (
              <Text style={styles.bodyText}>{message.text}</Text>
            )}
          </View>

          {/* Responsible entity */}
          {item.responsibleEntity ? (
            <View style={styles.infoRow}>
              <Building2 size={16} color="#6B7280" />
              <Text style={styles.infoLabel}>{t('common.responsibleEntity')}:</Text>
              <Text style={styles.infoValue}>{item.responsibleEntity}</Text>
            </View>
          ) : null}

          {/* Addresses */}
          {item.addresses && item.addresses.length > 0 ? (
            <View style={styles.addressSection}>
              <Text style={styles.sectionLabel}>{t('common.addresses')}</Text>
              {item.addresses.map((addr, i) => (
                <View key={i} style={styles.addressRow}>
                  <MapPin size={14} color={primaryColor} />
                  <Text style={styles.addressText}>
                    {addr.formattedAddress || addr.originalText}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Streets */}
          {item.streets && item.streets.length > 0 ? (
            <View style={styles.addressSection}>
              <Text style={styles.sectionLabel}>{t('common.streets')}</Text>
              {item.streets.map((street, i) => (
                <View key={i} style={styles.addressRow}>
                  <MapPin size={14} color={primaryColor} />
                  <Text style={styles.addressText}>
                    {street.street}
                    {street.from ? ` (${street.from}` : ''}
                    {street.to ? ` – ${street.to})` : street.from ? ')' : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Bus stops */}
          {item.busStops && item.busStops.length > 0 ? (
            <View style={styles.infoRow}>
              <BusFront size={16} color="#6B7280" />
              <Text style={styles.infoLabel}>{t('common.busStops')}:</Text>
              <Text style={styles.infoValue}>{item.busStops.join(', ')}</Text>
            </View>
          ) : null}

          {/* Source */}
          {sourceInfo ? (
            <View style={styles.sourceSection}>
              <View style={styles.sourceRow}>
                {sourceInfo.logoUrl ? (
                  <Image source={{uri: sourceInfo.logoUrl}} style={styles.sourceLogo} />
                ) : null}
                <Text style={styles.sourceName}>{sourceInfo.name}</Text>
              </View>
              {sourceInfo.url || message.sourceUrl ? (
                <TouchableOpacity
                  style={styles.viewSourceButton}
                  onPress={() => Linking.openURL(sourceInfo.url || message.sourceUrl!)}
                >
                  <ExternalLink size={14} color="#1E40AF" />
                  <Text style={styles.viewSourceText}>{t('common.viewSource')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Mini map */}
          {mapRegion && locations.length > 0 ? (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={mapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {locations.map((loc, i) => (
                  <Marker
                    key={i}
                    coordinate={{latitude: loc.latitude, longitude: loc.longitude}}
                    pinColor={primaryColor}
                  />
                ))}
              </MapView>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  cityWideBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  cityWideText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  date: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  mainContent: {
    marginBottom: 20,
  },
  bodyText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  addressSection: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  sourceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 4,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  sourceName: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  viewSourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  viewSourceText: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '500',
  },
  mapContainer: {
    marginTop: 16,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
  },
})
