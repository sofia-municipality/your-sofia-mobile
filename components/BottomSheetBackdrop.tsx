import type {ReactNode} from 'react'
import {StyleSheet, TouchableOpacity, View} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'

interface BottomSheetBackdropProps {
  children: ReactNode
  onPress?: () => void
}

export function BottomSheetBackdrop({children, onPress}: BottomSheetBackdropProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.dismissArea}
        activeOpacity={1}
        disabled={!onPress}
        onPress={onPress}
      >
        <LinearGradient
          colors={['rgba(15, 23, 42, 0)', 'rgba(15, 23, 42, 0.5)', 'rgba(15, 23, 42, 0.9)']}
          locations={[0, 0.5, 0.8]}
          style={StyleSheet.absoluteFill}
        />
      </TouchableOpacity>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
})
