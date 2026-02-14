import React, {useState} from 'react'
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native'
import {useTranslation} from 'react-i18next'
import {Stack} from 'expo-router'
import WasteContainers from './waste-containers'
import TransportMap from './transport-bpilot'
import NewsMap from './news'
import BgsmetView from './bgsmet-view'
import {uiTokens} from '../../../styles/common'

type MapFilter = 'wasteContainers' | 'bgsmetView' | 'transport' | 'news'

export default function MapsLayout() {
  const {t} = useTranslation()
  const [selectedFilter, setSelectedFilter] = useState<MapFilter>('wasteContainers')

  const filters: {key: MapFilter; label: string}[] = [
    {key: 'wasteContainers', label: t('map.filters.wasteContainers')},
    // {key: 'bgsmetView', label: t('map.filters.bgsmetView')},
    // {key: 'transport', label: t('map.filters.transportBpilot')},
    {key: 'news', label: t('map.filters.news')},
  ]

  // Determine which map component(s) to render
  const renderMapContent = () => {
    switch (selectedFilter) {
      case 'wasteContainers':
        return <WasteContainers />
      case 'bgsmetView':
        return <BgsmetView />
      case 'transport':
        return <TransportMap />
      case 'news':
        return <NewsMap />
      default:
        return <WasteContainers />
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
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, selectedFilter === filter.key && styles.filterChipActive]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === filter.key && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
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
    backgroundColor: uiTokens.colors.surface,
  },
  filtersContainer: {
    backgroundColor: uiTokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: uiTokens.colors.border,
    paddingVertical: 12,
    zIndex: 10,
  },
  filtersScrollContent: {
    paddingHorizontal: uiTokens.spacing.lg,
    gap: uiTokens.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: uiTokens.spacing.lg,
    paddingVertical: 8,
    borderRadius: uiTokens.radius.pill,
    backgroundColor: uiTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: uiTokens.colors.border,
  },
  filterChipActive: {
    backgroundColor: uiTokens.colors.primary,
    borderColor: uiTokens.colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTokens.colors.textMuted,
  },
  filterChipTextActive: {
    color: uiTokens.colors.surface,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
})
