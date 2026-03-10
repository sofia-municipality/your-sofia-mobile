import React, {useState} from 'react'
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native'
import {useTranslation} from 'react-i18next'
import WasteCollectionDashboard from './waste-collection'
import AbandonedCarsDashboard from './abandoned-cars'
import PotholesDashboard from './potholes'

type DashboardTab = 'waste' | 'cars' | 'potholes'

export default function MetricsLayout() {
  const {t} = useTranslation()
  const [dashboard, setDashboard] = useState<DashboardTab>('waste')

  const DASHBOARD_TABS: {id: DashboardTab; label: string}[] = [
    {id: 'waste', label: t('metrics.tabWaste')},
    {id: 'cars', label: t('metrics.tabCars')},
    {id: 'potholes', label: t('metrics.tabPotholes')},
  ]

  return (
    <View style={styles.container}>
      {/* Top-level dashboard tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dashTabBar}
        contentContainerStyle={styles.dashTabBarContent}
      >
        {DASHBOARD_TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.dashTab, dashboard === tab.id && styles.dashTabActive]}
            onPress={() => setDashboard(tab.id)}
          >
            <Text style={[styles.dashTabText, dashboard === tab.id && styles.dashTabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {dashboard === 'waste' && <WasteCollectionDashboard />}
      {dashboard === 'cars' && <AbandonedCarsDashboard />}
      {dashboard === 'potholes' && <PotholesDashboard />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F9FAFB'},
  dashTabBar: {
    flexGrow: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dashTabBarContent: {paddingHorizontal: 12, paddingVertical: 0, gap: 4},
  dashTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  dashTabActive: {borderBottomColor: '#1E40AF'},
  dashTabText: {fontSize: 14, fontWeight: '500', color: '#6B7280'},
  dashTabTextActive: {color: '#1E40AF', fontWeight: '700'},
})
