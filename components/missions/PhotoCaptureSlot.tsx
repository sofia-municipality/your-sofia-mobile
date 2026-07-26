import {useState} from 'react'
import {Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Device from 'expo-device'
import {Camera, Check} from 'lucide-react-native'
import {useTranslation} from 'react-i18next'
import {missionColors, missionRadius, missionSpacing} from '@/styles/missionsTheme'
import {fonts, fontSizes} from '@/styles/tokens'

export interface CapturedPhoto {
  uri: string
  type: string
  name: string
}

interface PhotoCaptureSlotProps {
  label: string
  existingPhotoUrl?: string
  capturedPhoto?: CapturedPhoto | null
  onCapture: (photo: CapturedPhoto) => void
  disabled?: boolean
  uploading?: boolean
}

/**
 * A single before/after photo capture slot for a mission or mission task.
 * Mirrors the camera/permission pattern from `WasteContainerCard`.
 */
export function PhotoCaptureSlot({
  label,
  existingPhotoUrl,
  capturedPhoto,
  onCapture,
  disabled,
  uploading,
}: PhotoCaptureSlotProps) {
  const {t} = useTranslation()
  const [busy, setBusy] = useState(false)

  const openGallery = async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('missions.galleryPermissionRequired'))
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      onCapture({
        uri: asset.uri,
        type: 'image/jpeg',
        name: `mission-${Date.now()}.jpg`,
      })
    }
  }

  const openCamera = async () => {
    const {status} = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('missions.cameraPermissionRequired'))
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      onCapture({
        uri: asset.uri,
        type: 'image/jpeg',
        name: `mission-${Date.now()}.jpg`,
      })
    }
  }

  const handleTakePhoto = async () => {
    setBusy(true)
    try {
      const isSimulator = !Device.isDevice

      // Simulators don't expose a real camera; always use gallery there.
      if (isSimulator) {
        await openGallery()
        return
      }

      Alert.alert(t('missions.selectPhotoSource'), '', [
        {
          text: t('missions.photoSourceCamera'),
          onPress: () => {
            void openCamera()
          },
        },
        {
          text: t('missions.photoSourceGallery'),
          onPress: () => {
            void openGallery()
          },
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  const previewUri = capturedPhoto?.uri ?? existingPhotoUrl
  const isDone = Boolean(previewUri)

  return (
    <TouchableOpacity
      style={[styles.slot, isDone && styles.slotDone, disabled && styles.slotDisabled]}
      onPress={handleTakePhoto}
      disabled={disabled || busy || uploading}
      activeOpacity={0.8}
    >
      {previewUri ? (
        <Image source={{uri: previewUri}} style={styles.thumbnail} />
      ) : (
        <Camera size={22} color={missionColors.textMuted} />
      )}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {busy || uploading ? (
        <ActivityIndicator size="small" color={missionColors.neonPrimary} />
      ) : isDone ? (
        <Check size={16} color={missionColors.neonSuccess} />
      ) : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: missionSpacing.xs,
    borderWidth: 1,
    borderColor: missionColors.border,
    borderRadius: missionRadius.md,
    backgroundColor: missionColors.surfaceElevated,
    paddingVertical: missionSpacing.xs,
    paddingHorizontal: missionSpacing.sm,
  },
  slotDone: {
    borderColor: missionColors.neonSuccess,
  },
  slotDisabled: {
    opacity: 0.5,
  },
  thumbnail: {
    width: 32,
    height: 32,
    borderRadius: missionRadius.sm,
  },
  label: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSizes.caption,
    color: missionColors.textPrimary,
  },
})
