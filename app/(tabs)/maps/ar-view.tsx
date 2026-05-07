import React, {useState, useEffect, useRef, useCallback} from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native'
import {CameraView, useCameraPermissions} from 'expo-camera'
import * as Location from 'expo-location'
import {useTranslation} from 'react-i18next'
import {ChevronLeft, ChevronRight, X} from 'lucide-react-native'
import {WasteContainerCard} from '../../../components/WasteContainerCard'
import {loadNearbyContainers} from '../../../lib/containerUtils'
import {getDistanceFromLatLonInMeters} from '../../../lib/mapUtils'
import {useDeviceHeading} from '../../../hooks/useDeviceHeading'
import {type WasteContainer} from '../../../types/wasteContainer'
import {colors, fonts, fontSizes} from '@/styles/tokens'

const HORIZONTAL_FOV = 60 // degrees — approximate phone camera horizontal FOV
const AR_RADIUS_METERS = 50
const RELOAD_DISTANCE_METERS = 50
const OVERLAY_CARD_WIDTH = 220
const OVERLAY_EDGE_GUTTER = 12

// Normalise a PostgreSQL timestamp to valid ISO 8601 so new Date() parses it reliably.
function normaliseTimestamp(ts: string): string {
  return ts.replace(' ', 'T').concat(':00')
}

function getRelativeTimeLabel(lastCleaned: string | undefined, t: (k: string) => string): string {
  if (!lastCleaned) return t('arView.unknown')
  const normalized = normaliseTimestamp(lastCleaned)
  const hours = (Date.now() - new Date(normalized).getTime()) / 3_600_000
  if (isNaN(hours)) return t('arView.unknown')
  if (hours < 1) return t('arView.lessThanHour')
  if (hours < 24) {
    const h = Math.floor(hours)
    return `${h} ${h === 1 ? t('arView.hour') : t('arView.hours')}`
  }
  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? t('arView.day') : t('arView.days')}`
}

function getPinColor(container: WasteContainer): string {
  if (container.state?.includes('full') || container.status === 'full') return colors.error
  if (container.state?.includes('damaged') || container.state?.includes('bagged'))
    return colors.textPrimary
  if (container.state && container.state.length > 0) return '#F97316'
  return colors.success
}

/** Haversine bearing from point A to point B, in degrees (0=N, clockwise). */
function bearingTo(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLon = toRad(toLon - fromLon)
  const lat1 = toRad(fromLat)
  const lat2 = toRad(toLat)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

interface ProjectedContainer {
  container: WasteContainer
  distance: number
  screenX: number
  screenY: number
  zIndex: number
  turnDirection: 'left' | 'right' | null
}

interface ContainerAROverlayProps {
  container: WasteContainer
  distance: number
  turnDirection: 'left' | 'right' | null
  onPress: () => void
}

function ContainerAROverlay({
  container,
  distance,
  turnDirection,
  onPress,
}: ContainerAROverlayProps) {
  const {t} = useTranslation()
  const color = getPinColor(container)
  const distanceLabel = ` ${Math.round(distance)}`
  const cleanedLabel = getRelativeTimeLabel(container.lastCleaned, t)

  return (
    <TouchableOpacity style={styles.overlay} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.overlayDot, {backgroundColor: color}]} />
      <View style={styles.overlayBody}>
        <Text style={styles.overlayTitle} numberOfLines={1}>
          {container.publicNumber}
        </Text>
        <Text style={styles.overlayRow} numberOfLines={1}>
          {t('arView.cleaning')}:
        </Text>
        <Text style={styles.overlayRow} numberOfLines={1}>
          {t('arView.lastCleaned')}: {cleanedLabel}
        </Text>
        {container.servicedBy ? (
          <Text style={styles.overlayRow} numberOfLines={1}>
            {t('arView.servicedBy')}: {container.servicedBy}
          </Text>
        ) : null}
        <Text style={[styles.overlayDistance, {color}]}>
          {t('arView.distance')}: {distanceLabel}
        </Text>
        {turnDirection && (
          <View style={styles.turnHintRow}>
            {turnDirection === 'left' ? (
              <ChevronLeft size={14} color="#fff" />
            ) : (
              <ChevronRight size={14} color="#fff" />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

interface ArViewProps {
  onClose: () => void
}

export default function ArView({onClose}: ArViewProps) {
  const {t} = useTranslation()
  const {width: screenWidth, height: screenHeight} = useWindowDimensions()
  const [permission, requestPermission] = useCameraPermissions()
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(
    null
  )
  const [containers, setContainers] = useState<(WasteContainer & {distance: number})[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedContainer, setSelectedContainer] = useState<WasteContainer | null>(null)
  const [showCamera, setShowCamera] = useState(true)
  const {heading, available: compassAvailable} = useDeviceHeading()
  const lastLoadLocationRef = useRef<{latitude: number; longitude: number} | null>(null)
  const watchRef = useRef<Location.LocationSubscription | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      setShowCamera(false)
      if (watchRef.current) {
        watchRef.current.remove()
        watchRef.current = null
      }
    }
  }, [])

  const loadContainers = useCallback(async (loc: {latitude: number; longitude: number}) => {
    if (!isMountedRef.current) return
    setLoading(true)
    try {
      const nearby = await loadNearbyContainers(loc, AR_RADIUS_METERS, {limit: 20})
      if (isMountedRef.current) {
        setContainers(nearby)
        lastLoadLocationRef.current = loc
      }
    } catch {
      // silently ignore; containers stay as-is
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

  // Start GPS watch
  useEffect(() => {
    ;(async () => {
      const {status} = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted' || !isMountedRef.current) return

      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        if (!isMountedRef.current) return
        const loc = {latitude: initial.coords.latitude, longitude: initial.coords.longitude}
        setUserLocation(loc)
        loadContainers(loc)
      } catch {
        // ignore
      }

      watchRef.current = await Location.watchPositionAsync(
        {accuracy: Location.Accuracy.BestForNavigation, timeInterval: 3000, distanceInterval: 10},
        (pos) => {
          if (!isMountedRef.current) return
          const loc = {latitude: pos.coords.latitude, longitude: pos.coords.longitude}
          setUserLocation(loc)

          if (!lastLoadLocationRef.current) {
            loadContainers(loc)
            return
          }
          const moved = getDistanceFromLatLonInMeters(
            lastLoadLocationRef.current.latitude,
            lastLoadLocationRef.current.longitude,
            loc.latitude,
            loc.longitude
          )
          if (moved >= RELOAD_DISTANCE_METERS) {
            loadContainers(loc)
          }
        }
      )
    })()
  }, [loadContainers])

  // Project containers onto screen using bearing vs. compass heading
  const projected: ProjectedContainer[] = React.useMemo(() => {
    if (!userLocation) return []

    const halfFov = HORIZONTAL_FOV / 2
    const normalizedHeading = heading ?? 0
    const leftEdgeCenter = OVERLAY_CARD_WIDTH / 2 + OVERLAY_EDGE_GUTTER
    const rightEdgeCenter = screenWidth - OVERLAY_CARD_WIDTH / 2 - OVERLAY_EDGE_GUTTER
    const results: ProjectedContainer[] = []

    containers
      .filter((c) => c.distance <= AR_RADIUS_METERS)
      .forEach((c) => {
        const bearing = bearingTo(
          userLocation.latitude,
          userLocation.longitude,
          c.latitude,
          c.longitude
        )
        const angularDiff = ((bearing - normalizedHeading + 540) % 360) - 180 // -180..+180

        const inVisibleDirection = Math.abs(angularDiff) <= halfFov
        const mappedX = screenWidth / 2 + (angularDiff / halfFov) * (screenWidth / 2)

        const screenX = inVisibleDirection
          ? Math.max(leftEdgeCenter, Math.min(rightEdgeCenter, mappedX))
          : angularDiff < 0
            ? leftEdgeCenter
            : rightEdgeCenter

        // Closer containers sit a bit higher in the frame and must stay on top.
        const baseY = screenHeight * 0.3
        const depthOffset = Math.min(c.distance * 0.7, 40)
        const screenY = baseY + depthOffset
        const zIndex = Math.max(1, Math.round((AR_RADIUS_METERS - c.distance) * 10) + 1)

        results.push({
          container: c,
          distance: c.distance,
          screenX,
          screenY,
          zIndex,
          turnDirection: inVisibleDirection ? null : angularDiff < 0 ? 'left' : 'right',
        })
      })

    // Render farthest first so nearest overlays are painted last (on top).
    results.sort((a, b) => b.distance - a.distance)

    // Stagger overlapping cards vertically (±60 px threshold)
    for (let i = 0; i < results.length; i++) {
      for (let j = 0; j < i; j++) {
        if (Math.abs(results[i].screenX - results[j].screenX) < 120) {
          results[i] = {...results[i], screenY: results[j].screenY + 110}
        }
      }
    }

    return results
  }, [userLocation, heading, containers, screenWidth, screenHeight])

  const handleClose = useCallback(() => {
    setShowCamera(false)
    setTimeout(() => onClose(), 80)
  }, [onClose])

  // — Permission gate —
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permTitle}>{t('map.permissions.title')}</Text>
        <Text style={styles.permMessage}>{t('map.permissions.message')}</Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>{t('map.permissions.button')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Full-screen camera */}
      {showCamera ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <View style={[StyleSheet.absoluteFill, {backgroundColor: '#000'}]} />
      )}

      {/* AR overlay cards */}
      {projected.map(({container, distance, screenX, screenY, zIndex, turnDirection}) => (
        <View
          key={container.id}
          style={[
            styles.overlayWrapper,
            {
              left: screenX - OVERLAY_CARD_WIDTH / 2,
              top: screenY,
              zIndex,
              elevation: Math.min(24, zIndex),
            },
          ]}
          pointerEvents="box-none"
        >
          <ContainerAROverlay
            container={container}
            distance={distance}
            turnDirection={turnDirection}
            onPress={() => setSelectedContainer(container)}
          />
        </View>
      ))}

      {/* DEBUG: heading readout — remove before release */}
      {__DEV__ && (
        <View style={styles.debugBadge}>
          <Text style={styles.debugText}>
            {heading !== null ? `↑ ${heading.toFixed(1)}°` : 'Heading: …'}
          </Text>
        </View>
      )}

      {/* No compass warning */}
      {!compassAvailable && (
        <View style={styles.compassWarning}>
          <Text style={styles.compassWarningText}>{t('arView.noCompass')}</Text>
        </View>
      )}

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingBadge}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}

      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <X size={22} color="#fff" />
      </TouchableOpacity>

      {/* Container detail modal */}
      <Modal
        visible={selectedContainer !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedContainer(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedContainer(null)}
        >
          <View style={styles.modalContent}>
            {selectedContainer && (
              <WasteContainerCard
                container={selectedContainer}
                onClose={() => setSelectedContainer(null)}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  permTitle: {
    fontSize: fontSizes.h3,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  permMessage: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  permButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permButtonText: {
    color: '#fff',
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
  },
  overlayWrapper: {
    position: 'absolute',
    width: OVERLAY_CARD_WIDTH,
  },
  overlay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  overlayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },
  overlayBody: {
    flex: 1,
  },
  overlayTitle: {
    fontSize: fontSizes.label,
    fontFamily: fonts.bold,
    color: '#fff',
    marginBottom: 2,
  },
  overlayRow: {
    fontSize: 11,
    color: colors.border,
    marginBottom: 1,
  },
  overlayDistance: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    marginTop: 4,
  },
  turnHintRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compassWarning: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(185,28,28,0.85)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  compassWarningText: {
    color: '#fff',
    fontSize: fontSizes.label,
    fontFamily: fonts.semiBold,
  },
  loadingBadge: {
    position: 'absolute',
    top: 16,
    right: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    padding: 8,
  },
  debugBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  debugText: {
    color: '#FBBF24',
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'transparent',
    padding: 16,
  },
})
