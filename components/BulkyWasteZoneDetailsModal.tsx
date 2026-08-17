import {Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {X} from 'lucide-react-native'
import {useTranslation} from 'react-i18next'
import type {BulkyWasteZone} from '../types/bulkyWasteZone'
import {colors, fonts, fontSizes, radius, spacing} from '@/styles/tokens'
import {BottomSheetBackdrop} from './BottomSheetBackdrop'

interface BulkyWasteZoneDetailsModalProps {
  visible: boolean
  zone: BulkyWasteZone | null
  onClose: () => void
}

function formatCollectionDays(days: string[], t: (key: string) => string): string {
  return [...days]
    .sort((first, second) => Number(first) - Number(second))
    .map((day) => {
      const label = t(`wasteContainers.collectionDay.${day}`)
      return label === `wasteContainers.collectionDay.${day}` ? day : label
    })
    .join(', ')
}

export function BulkyWasteZoneDetailsModal({
  visible,
  zone,
  onClose,
}: BulkyWasteZoneDetailsModalProps) {
  const {t} = useTranslation()
  const insets = useSafeAreaInsets()

  if (!zone) return null

  const collectionDays =
    zone.collectionDaysOfWeek.length > 0
      ? formatCollectionDays(zone.collectionDaysOfWeek, t)
      : t('wasteContainers.bulkyWasteZone.notAvailable')
  const info = zone.info?.trim() || t('wasteContainers.bulkyWasteZone.notAvailable')

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BottomSheetBackdrop onPress={onClose}>
        <View style={[styles.sheet, {paddingBottom: insets.bottom + spacing.md}]}>
          <View style={styles.header}>
            <Text selectable style={styles.title}>
              {zone.name}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('wasteContainers.bulkyWasteZone.collectionDays')}</Text>
              <Text selectable style={styles.value}>
                {collectionDays}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('wasteContainers.bulkyWasteZone.info')}</Text>
              <Text selectable style={styles.value}>
                {info}
              </Text>
            </View>
          </ScrollView>
        </View>
      </BottomSheetBackdrop>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '70%',
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  value: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.body,
    lineHeight: 24,
    color: colors.textPrimary,
  },
})
