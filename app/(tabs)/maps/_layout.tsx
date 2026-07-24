import React, {useState} from 'react'
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native'
import {useTranslation} from 'react-i18next'
import {Stack} from 'expo-router'
import WasteContainers from './waste-containers'
import DrinkingFountains from './drinking-fountains'
import TransportMap from './transport-bpilot'
import NewsMap from './news'
import EventsMap from './events'
import BgsmetView from './bgsmet-view'
import ArView from './ar-view'
import {colors, fonts, fontSizes} from '@/styles/tokens'

type MapFilter =
  | 'wasteContainers'
  | 'fountains'
  | 'bgsmetView'
  | 'transport'
  | 'news'
  | 'events'
  | 'arView'

export default function MapsLayout() {
  const {t} = useTranslation()
  const [selectedFilter, setSelectedFilter] = useState<MapFilter>('wasteContainers')

  const filters: {key: MapFilter; label: string}[] = [
    {key: 'wasteContainers', label: t('map.filters.wasteContainers')},
    {key: 'fountains', label: t('map.filters.fountains')},
    // {key: 'bgsmetView', label: t('map.filters.bgsmetView')},
    // {key: 'transport', label: t('map.filters.transportBpilot')},
    {key: 'news', label: t('map.filters.news')},
    {key: 'events', label: t('map.filters.events')},
  ]

  const openAR = () => setSelectedFilter('arView')
  const closeAR = () => setSelectedFilter('wasteContainers')

  // Determine which map component(s) to render
  const renderMapContent = () => {
    switch (selectedFilter) {
      case 'wasteContainers':
        return <WasteContainers onOpenAR={openAR} />
      case 'fountains':
        return <DrinkingFountains />
      case 'arView':
        return <ArView onClose={closeAR} />
      case 'bgsmetView':
        return <BgsmetView />
      case 'transport':
        return <TransportMap />
      case 'news':
        return <NewsMap />
      case 'events':
        return <EventsMap />
      default:
        return <WasteContainers onOpenAR={openAR} />
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{headerShown: false}} />

      {/* Filter chips */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {filters.map((filter) => {
            const isActive =
              selectedFilter === filter.key ||
              (filter.key === 'wasteContainers' && selectedFilter === 'arView')
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedFilter(filter.key)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Map content based on selected filter */}
      <View style={styles.mapContainer}>{renderMapContent()}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  filtersContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
    zIndex: 10,
  },
  filtersScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
})
