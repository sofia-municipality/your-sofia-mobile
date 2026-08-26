import {View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView} from 'react-native'
import {useState} from 'react'
import {useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import MapView, {Marker, type Region} from 'react-native-maps'
import type {LocationFilterPoint} from '../../../types/subscription'
import {emitNotificationFilter} from '../../../lib/notificationFilterBridge'
import {colors, fonts, fontSizes} from '@/styles/tokens'

// Sofia center
const SOFIA_REGION: Region = {
  latitude: 42.6977,
  longitude: 23.3219,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
}

const RADIUS_OPTIONS_METRES = [500, 1000, 2000, 3000, 5000, 10000]

export default function PointPickerScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const [markerCoord, setMarkerCoord] = useState<{latitude: number; longitude: number} | null>(null)
  const [radius, setRadius] = useState<number>(1000)

  const handleMapPress = (e: any) => {
    const coordinate = e?.nativeEvent?.coordinate
    if (!coordinate) return
    setMarkerCoord(coordinate)
  }

  const handleConfirm = () => {
    if (!markerCoord) return
    const filter: Omit<LocationFilterPoint, 'id'> = {
      filterType: 'point',
      latitude: markerCoord.latitude,
      longitude: markerCoord.longitude,
      radius,
    }
    emitNotificationFilter(filter)
    router.back()
  }

  const formatRadius = (r: number): string =>
    r >= 1000
      ? t('notifications.radiusKm').replace('{{n}}', String(r / 1000))
      : t('notifications.radiusM').replace('{{n}}', String(r))

  return (
    <SafeAreaView style={styles.container}>
      <MapView style={styles.map} initialRegion={SOFIA_REGION} onPress={handleMapPress}>
        {markerCoord && (
          <Marker
            coordinate={markerCoord}
            draggable
            onDragEnd={(e) => setMarkerCoord(e.nativeEvent.coordinate)}
          />
        )}
      </MapView>

      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        <Text style={styles.hint}>
          {markerCoord
            ? `${markerCoord.latitude.toFixed(5)}, ${markerCoord.longitude.toFixed(5)}`
            : t('notifications.pickPoint')}
        </Text>

        <Text style={styles.radiusLabel}>{t('notifications.locationTypePoint')}</Text>
        <View style={styles.radiusOptions}>
          {RADIUS_OPTIONS_METRES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusChip, radius === r && styles.radiusChipSelected]}
              onPress={() => setRadius(r)}
              accessibilityRole="button"
              accessibilityLabel={formatRadius(r)}
              accessibilityState={{selected: radius === r}}
            >
              <Text style={[styles.radiusChipText, radius === r && styles.radiusChipTextSelected]}>
                {formatRadius(r)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, !markerCoord && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!markerCoord}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.confirmLocation')}
          accessibilityState={{disabled: !markerCoord}}
        >
          <Text style={styles.confirmBtnText}>{t('notifications.confirmLocation')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1},
  map: {flex: 1},
  panel: {maxHeight: 200, backgroundColor: colors.surface},
  panelContent: {padding: 16},
  hint: {
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  radiusLabel: {
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  radiusOptions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  radiusChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  radiusChipSelected: {backgroundColor: colors.primary},
  radiusChipText: {fontSize: fontSizes.label, color: colors.primary, fontFamily: fonts.semiBold},
  radiusChipTextSelected: {color: colors.surface},
  footer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: {opacity: 0.4},
  confirmBtnText: {color: colors.surface, fontSize: fontSizes.body, fontFamily: fonts.bold},
})
