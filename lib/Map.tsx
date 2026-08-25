import {forwardRef, useImperativeHandle} from 'react'
import {View} from 'react-native'
import RealMapView, {
  Marker as RealMarker,
  Polygon as RealPolygon,
  PROVIDER_DEFAULT as REAL_PROVIDER_DEFAULT,
  type MapViewProps,
  type MapMarkerProps,
  type MapPolygonProps,
  type Region,
} from 'react-native-maps'

export type {Region}
export type MapViewRef = Pick<InstanceType<typeof RealMapView>, 'animateToRegion'>

// Google Play Services' Maps "dynamite" module crashes on init
// (ExtensionSchemaFull "Unable to lookup extension field offset") the
// moment a MapView actually mounts on this CI's Android e2e build — the
// release build type is signed with the debug keystore, whose certificate
// isn't allowlisted for the Maps API key. Swapping in an inert View lets
// e2e exercise the surrounding screen without touching the native SDK.
const isE2E = process.env.EXPO_PUBLIC_DETOX_E2E_BUILD === 'true'

const StubMapView = forwardRef<MapViewRef, MapViewProps>(({style, children}, ref) => {
  useImperativeHandle(ref, () => ({animateToRegion: () => {}}))
  return <View style={style}>{children}</View>
})
StubMapView.displayName = 'MapView'

function StubMarker(_props: MapMarkerProps) {
  return null
}

function StubPolygon(_props: MapPolygonProps) {
  return null
}

export const MapView = isE2E ? StubMapView : RealMapView
export const Marker = isE2E ? StubMarker : RealMarker
export const Polygon = isE2E ? StubPolygon : RealPolygon
export const PROVIDER_DEFAULT = REAL_PROVIDER_DEFAULT

export default MapView
