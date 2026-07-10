import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import {useState, useEffect, useCallback} from 'react'
import {useRouter} from 'expo-router'
import {useFocusEffect} from '@react-navigation/native'
import {useTranslation} from 'react-i18next'
import {AlertCircle, MapPin, Plus, Trash2, ChevronRight} from 'lucide-react-native'

import {CATEGORY_DISPLAY_ORDER, getCategoryColor, getCategoryIcon} from '../../../lib/categories'
import {useSubscription} from '../../../hooks/useSubscription'
import {useAuth} from '../../../contexts/AuthContext'
import {registerNotificationFilterListener} from '../../../lib/notificationFilterBridge'
import type {LocationFilter, SubscriptionCategory} from '../../../types/subscription'
import {formatLocationFilter} from '../../../lib/formatLocationFilter'
import {colors, fonts, fontSizes} from '@/styles/tokens'

export default function NotificationsScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const {token: authToken} = useAuth()
  const {subscription, pushTokenString, isLoading, saveSubscription, reload} = useSubscription()

  // Only reload when we don't yet have a push token — to pick up the token registered by
  // useNotifications in the home tab. Skipping the reload when we already have a token
  // prevents the server response from wiping locally-added (unsaved) location filters
  // when the user returns from a picker sub-screen.
  useFocusEffect(
    useCallback(() => {
      if (!pushTokenString) {
        reload()
      }
    }, [pushTokenString, reload])
  )

  // Local drafts
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set())
  const [locationFilters, setLocationFilters] = useState<Omit<LocationFilter, 'id'>[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Populate drafts from loaded subscription
  useEffect(() => {
    if (subscription) {
      setNotificationsEnabled(subscription.enabled ?? true)
      const slugs = subscription.categories.map((c: SubscriptionCategory) => c.slug).filter(Boolean)
      setSelectedSlugs(new Set<string>(slugs))
      setLocationFilters(
        subscription.locationFilters.map(({id: _id, ...rest}) => rest) as Omit<
          LocationFilter,
          'id'
        >[]
      )
    }
  }, [subscription])

  const toggleCategory = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedSlugs.size === CATEGORY_DISPLAY_ORDER.length) {
      setSelectedSlugs(new Set())
    } else {
      setSelectedSlugs(new Set(CATEGORY_DISPLAY_ORDER))
    }
  }

  const removeLocationFilter = (index: number) => {
    setLocationFilters((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddLocation = () => {
    Alert.alert(t('notifications.addLocation'), undefined, [
      {
        text: t('notifications.locationTypeDistrict'),
        onPress: () =>
          router.push({
            pathname: '/(tabs)/notifications/district-picker',
            params: {returnTo: '/(tabs)/notifications'},
          } as any),
      },
      {
        text: t('notifications.locationTypePoint'),
        onPress: () =>
          router.push({
            pathname: '/(tabs)/notifications/point-picker',
            params: {returnTo: '/(tabs)/notifications'},
          } as any),
      },
      {
        text: t('notifications.locationTypeArea'),
        onPress: () =>
          router.push({
            pathname: '/(tabs)/notifications/area-picker',
            params: {returnTo: '/(tabs)/notifications'},
          } as any),
      },
      {text: t('common.cancel'), style: 'cancel'},
    ])
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const categoriesToSave = notificationsEnabled ? Array.from(selectedSlugs) : []
      const filtersToSave = notificationsEnabled ? locationFilters : []
      await saveSubscription(categoriesToSave, filtersToSave, authToken, notificationsEnabled)
      Alert.alert(t('common.success'), t('notifications.saveSuccess'))
    } catch (err) {
      console.error('[NotificationsScreen] save error', err)
      const isNoPushToken =
        err instanceof Error && err.message.includes('No push token registered on this device')
      const errorDetail =
        err instanceof Error && err.message && !isNoPushToken ? err.message : undefined
      Alert.alert(
        t('common.error'),
        isNoPushToken
          ? t('notifications.noPushToken')
          : (errorDetail ?? t('notifications.saveError'))
      )
    } finally {
      setIsSaving(false)
    }
  }

  // Listen for filter passed back from pickers via the notification filter bridge
  const addFilterFromParams = useCallback((filter: Omit<LocationFilter, 'id'>) => {
    setLocationFilters((prev) => [...prev, filter])
  }, [])

  useEffect(() => {
    return registerNotificationFilterListener(addFilterFromParams)
  }, [addFilterFromParams])

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  const allSelected = selectedSlugs.size === CATEGORY_DISPLAY_ORDER.length

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Enable notifications toggle */}
        <View style={styles.enableToggleSection}>
          <Text style={styles.enableToggleLabel}>{t('notifications.enableNotifications')}</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{false: colors.border, true: '#93C5FD'}}
            thumbColor={notificationsEnabled ? colors.primary : colors.textMuted}
          />
        </View>

        {/* No push token banner */}
        {!pushTokenString && (
          <View style={styles.noPushTokenBanner}>
            <AlertCircle size={18} color="#92400E" />
            <Text style={styles.noPushTokenText}>{t('notifications.noPushToken')}</Text>
          </View>
        )}
        {/* Categories */}
        <View style={[styles.section, !notificationsEnabled && styles.sectionDisabled]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('notifications.categories')}</Text>
            <TouchableOpacity
              onPress={toggleAll}
              disabled={!notificationsEnabled}
              accessibilityRole="button"
              accessibilityLabel={
                allSelected ? t('notifications.deselectAll') : t('notifications.selectAll')
              }
              accessibilityState={{disabled: !notificationsEnabled}}
            >
              <Text style={styles.toggleAll}>
                {allSelected ? t('notifications.deselectAll') : t('notifications.selectAll')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>{t('notifications.categoriesSubtitle')}</Text>
          <View style={styles.categoryGrid}>
            {CATEGORY_DISPLAY_ORDER.map((slug) => {
              const Icon = getCategoryIcon(slug)
              const color = getCategoryColor(slug)
              const selected = selectedSlugs.has(slug)
              return (
                <Pressable
                  key={slug}
                  onPress={() => toggleCategory(slug)}
                  disabled={!notificationsEnabled}
                  style={[
                    styles.categoryChip,
                    selected && {backgroundColor: color, borderColor: color},
                    !selected && {borderColor: color},
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t(`categories.${slug}`)}
                  accessibilityState={{selected, disabled: !notificationsEnabled}}
                >
                  <Icon size={16} color={selected ? colors.surface : color} />
                  <Text
                    style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}
                    numberOfLines={2}
                  >
                    {t(`categories.${slug}`)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Location filters */}
        <View style={[styles.section, !notificationsEnabled && styles.sectionDisabled]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('notifications.locationFilters')}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{t('notifications.locationFiltersSubtitle')}</Text>

          {locationFilters.length === 0 ? (
            <Text style={styles.emptyFilters}>{t('notifications.noLocationFilters')}</Text>
          ) : (
            locationFilters.map((filter, index) => (
              <View key={index} style={styles.filterRow}>
                <MapPin size={16} color={colors.primary} style={styles.filterIcon} />
                <Text style={styles.filterLabel} numberOfLines={1}>
                  {formatLocationFilter(filter as LocationFilter, t)}
                </Text>
                <TouchableOpacity
                  onPress={() => removeLocationFilter(index)}
                  disabled={!notificationsEnabled}
                  style={styles.removeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('notifications.removeFilter')}
                  accessibilityState={{disabled: !notificationsEnabled}}
                >
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.addFilterBtn}
            onPress={handleAddLocation}
            disabled={!notificationsEnabled}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.addLocation')}
            accessibilityState={{disabled: !notificationsEnabled}}
          >
            <Plus size={18} color={colors.primary} />
            <Text style={styles.addFilterText}>{t('notifications.addLocation')}</Text>
            <ChevronRight size={16} color={colors.textMuted} style={{marginLeft: 'auto'}} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, (isSaving || !pushTokenString) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving || !pushTokenString}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.save')}
          accessibilityState={{disabled: isSaving || !pushTokenString}}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.surface} size="small" />
          ) : (
            <Text style={styles.saveButtonText}>{t('notifications.save')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface2},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  scrollContent: {padding: 16, paddingBottom: 24},
  noPushTokenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noPushTokenText: {flex: 1, fontSize: fontSizes.label, color: '#92400E', lineHeight: 18},
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {fontSize: fontSizes.body, fontFamily: fonts.bold, color: colors.textPrimary},
  sectionSubtitle: {fontSize: fontSizes.label, color: colors.textSecondary, marginBottom: 12},
  toggleAll: {fontSize: fontSizes.label, color: colors.primary, fontFamily: fonts.semiBold},
  categoryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    maxWidth: '48%',
  },
  categoryChipText: {
    fontSize: fontSizes.caption,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
    flexShrink: 1,
  },
  categoryChipTextSelected: {color: colors.surface},
  emptyFilters: {
    fontSize: fontSizes.label,
    color: colors.textMuted,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface2,
  },
  filterIcon: {marginRight: 8},
  filterLabel: {flex: 1, fontSize: fontSizes.bodySm, color: colors.textPrimary},
  removeBtn: {padding: 4},
  addFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
    marginTop: 4,
  },
  addFilterText: {fontSize: fontSizes.bodySm, color: colors.primary, fontFamily: fonts.semiBold},
  footer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {opacity: 0.6},
  saveButtonText: {color: colors.surface, fontSize: fontSizes.body, fontFamily: fonts.bold},
  enableToggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  enableToggleLabel: {fontSize: fontSizes.body, fontFamily: fonts.bold, color: colors.textPrimary},
  sectionDisabled: {opacity: 0.4},
})
