import {View, Text, TouchableOpacity, StyleSheet, SafeAreaView} from 'react-native'
import {useState} from 'react'
import {useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import MapView, {Marker, Polygon, type Region} from 'react-native-maps'
import type {LocationFilterArea} from '../../../types/subscription'
import {emitNotificationFilter} from '../../../lib/notificationFilterBridge'
import {colors, fonts, fontSizes} from '@/styles/tokens'

const SOFIA_REGION: Region = {
  latitude: 42.6977,
  longitude: 23.3219,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
}

interface LngLat {
  latitude: number
  longitude: number
}

export default function AreaPickerScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const [vertices, setVertices] = useState<LngLat[]>([])
  const [closed, setClosed] = useState(false)

  const handleMapPress = (e: any) => {
    if (closed) return
    const coordinate = e?.nativeEvent?.coordinate
    if (!coordinate) return
    setVertices((prev) => [...prev, coordinate])
  }

  const handleUndo = () => {
    if (closed) {
      setClosed(false)
    } else {
      setVertices((prev) => prev.slice(0, -1))
    }
  }

  const handleClose = () => {
    if (vertices.length >= 3) setClosed(true)
  }

  const handleConfirm = () => {
    if (vertices.length < 3) return

    const ring = [...vertices.map((v) => [v.longitude, v.latitude] as [number, number])]
    // Close the ring
    ring.push(ring[0])

    const filter: Omit<LocationFilterArea, 'id'> = {
      filterType: 'area',
      polygon: {type: 'Polygon', coordinates: [ring]},
    }

    emitNotificationFilter(filter)
    router.back()
  }

  const canConfirm = vertices.length >= 3

  return (
    <SafeAreaView style={styles.container}>
      <MapView style={styles.map} initialRegion={SOFIA_REGION} onPress={handleMapPress}>
        {vertices.map((v, i) => (
          <Marker key={i} coordinate={v} pinColor={colors.primary} />
        ))}
        {vertices.length >= 3 && (
          <Polygon
            coordinates={vertices}
            fillColor="rgba(30, 64, 175, 0.15)"
            strokeColor={colors.primary}
            strokeWidth={2}
          />
        )}
      </MapView>

      <View style={styles.panel}>
        <Text style={styles.hint}>
          {vertices.length === 0
            ? t('notifications.drawArea')
            : t('notifications.pointsCount', {count: vertices.length})}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.undoBtn,
              vertices.length === 0 && styles.actionBtnDisabled,
            ]}
            onPress={handleUndo}
            disabled={vertices.length === 0}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.undoPoint')}
            accessibilityState={{disabled: vertices.length === 0}}
          >
            <Text style={styles.actionBtnText}>{t('notifications.undoPoint')}</Text>
          </TouchableOpacity>
          {!closed && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.closeBtn,
                vertices.length < 3 && styles.actionBtnDisabled,
              ]}
              onPress={handleClose}
              disabled={vertices.length < 3}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.closePolygon')}
              accessibilityState={{disabled: vertices.length < 3}}
            >
              <Text style={[styles.actionBtnText, {color: colors.primary}]}>
                {t('notifications.closePolygon')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.confirmLocation')}
          accessibilityState={{disabled: !canConfirm}}
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
  panel: {
    backgroundColor: colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hint: {
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  actions: {flexDirection: 'row', gap: 8},
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  actionBtnDisabled: {opacity: 0.4},
  undoBtn: {borderColor: colors.error},
  closeBtn: {borderColor: colors.primary},
  actionBtnText: {fontSize: fontSizes.label, fontFamily: fonts.semiBold, color: colors.error},
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
