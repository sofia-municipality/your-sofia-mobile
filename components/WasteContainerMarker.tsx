import React from 'react'
import {View, StyleSheet} from 'react-native'
import {Trash2, Recycle, Shapes} from 'lucide-react-native'
import type {WasteType, ContainerState} from '../types/wasteContainer'

interface WasteContainerMarkerProps {
  color: string
  size?: number
  wasteType?: WasteType
  state?: ContainerState[]
}

export function WasteContainerMarker({
  color,
  size = 32,
  wasteType,
  state,
}: WasteContainerMarkerProps) {
  // Priority: bulkyWaste > recyclables > default trash
  const Icon = state?.includes('bulkyWaste')
    ? Shapes
    : wasteType === 'recyclables'
      ? Recycle
      : Trash2

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <View style={[styles.iconContainer, {backgroundColor: color, zIndex: 2}]}>
        <Icon size={size * 0.64} color="#ffffff" strokeWidth={2} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
})
