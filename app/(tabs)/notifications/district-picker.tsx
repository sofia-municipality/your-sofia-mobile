import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import {useState, useEffect} from 'react'
import {useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {Check} from 'lucide-react-native'
import {fetchCityDistricts} from '../../../lib/payload'
import type {CityDistrict, LocationFilterDistrict} from '../../../types/subscription'
import {emitNotificationFilter} from '../../../lib/notificationFilterBridge'
import {colors, fonts, fontSizes} from '@/styles/tokens'

export default function DistrictPickerScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const [districts, setDistricts] = useState<CityDistrict[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<CityDistrict | null>(null)

  useEffect(() => {
    fetchCityDistricts()
      .then(setDistricts)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const handleConfirm = () => {
    if (!selected) return
    const filter: Omit<LocationFilterDistrict, 'id'> = {
      filterType: 'district',
      district: {id: selected.id, name: selected.name, districtId: selected.districtId},
    }
    // Pass result back to notifications/index via the notification filter bridge
    emitNotificationFilter(filter)
    router.back()
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={districts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({item}) => {
          const isSelected = selected?.id === item.id
          return (
            <TouchableOpacity
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => setSelected(isSelected ? null : item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.districtId} ${item.name}`}
              accessibilityState={{selected: isSelected}}
              testID={`districtPickerRow-${item.id}`}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.districtId}>{item.districtId}</Text>
                <Text style={styles.districtName}>{item.name}</Text>
              </View>
              {isSelected && <Check size={18} color={colors.primary} />}
            </TouchableOpacity>
          )
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!selected}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.confirmLocation')}
          accessibilityState={{disabled: !selected}}
          testID="districtPickerConfirmButton"
        >
          <Text style={styles.confirmBtnText}>{t('notifications.confirmLocation')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface2},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  list: {paddingVertical: 8},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  rowSelected: {backgroundColor: colors.primaryTint},
  rowLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  districtId: {
    width: 28,
    fontSize: fontSizes.label,
    fontFamily: fonts.bold,
    color: colors.primary,
    textAlign: 'right',
  },
  districtName: {fontSize: 15, color: colors.textPrimary},
  separator: {height: 1, backgroundColor: colors.surface2, marginLeft: 60},
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
