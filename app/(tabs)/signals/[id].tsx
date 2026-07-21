import React, {useState, useEffect, useCallback, useRef} from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useLocalSearchParams, useNavigation} from 'expo-router'
import {SafeAreaView} from 'react-native-safe-area-context'
import {Edit3, Save, X, CheckCircle} from 'lucide-react-native'
import {fetchSignalById, updateSignal} from '../../../lib/payload'
import type {Signal} from '../../../types/signal'
import {type ContainerState} from '../../../types/wasteContainer'
import {SignalForm, type SignalFormData, styles} from '../../../forms/signal'
import {colors, fonts, fontSizes, radius, spacing} from '@/styles/tokens'
import {useNotifications} from '../../../hooks/useNotifications'
import {useAuth} from '@/contexts/AuthContext'

export default function SignalDetailsScreen() {
  const {t, i18n} = useTranslation()
  const navigation = useNavigation()
  const {id} = useLocalSearchParams<{id: string}>()
  const formRef = useRef<any>(null)
  const {removeUpdatedSignalId} = useNotifications()
  const {user, token, isInfrastructureAdmin, isFountainAdmin} = useAuth()

  const [signal, setSignal] = useState<Signal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [canEdit, setCanEdit] = useState(false)

  // A fountain admin may resolve fountain signals; general infrastructure admins
  // may resolve them too. Container signals are unaffected by this screen.
  const isFountainSignal =
    signal?.category === 'drinking-fountain' || signal?.cityObject?.type === 'drinking-fountain'
  const canResolve =
    !!signal &&
    isFountainSignal &&
    signal.status !== 'resolved' &&
    (isInfrastructureAdmin || isFountainAdmin)

  const loadSignal = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const data = await fetchSignalById(id)
      setSignal(data)
    } catch (err) {
      console.error('Error loading signal:', err)
      setError(err instanceof Error ? err.message : t('signals.error'))
    } finally {
      setLoading(false)
    }
  }, [id, i18n.language, t])

  useEffect(() => {
    loadSignal()
  }, [loadSignal])

  // Clear the red-dot indicator once when this screen mounts for this signal ID
  useEffect(() => {
    if (id) removeUpdatedSignalId(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Check if the current user is the reporter who created this signal
  useEffect(() => {
    if (signal && user) {
      const reporterId = typeof signal.reporter === 'object' ? signal.reporter?.id : signal.reporter
      setCanEdit(reporterId !== undefined && String(reporterId) === String(user.id))
    } else {
      setCanEdit(false)
    }
  }, [signal, user])

  const handleEdit = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
  }, [])

  const handleFormSubmit = useCallback(
    async (data: SignalFormData) => {
      if (!signal || !token) return

      try {
        setSaving(true)

        // Separate new photos from existing ones
        const newPhotos = (data.photos || []).filter((p) => p.isNew)
        const existingPhotoIds = (data.photos || [])
          .filter((p) => !p.isNew && p.id !== undefined)
          .map((p) => p.id as number)

        const updateData = {
          title: data.title.trim(),
          description: data.description?.trim() || '',
          containerState: (data.containerState || []) as ContainerState[],
          newPhotos: newPhotos.map((p) => ({
            uri: p.uri,
            type: 'image/jpeg',
            name: `signal-${signal.id}-${Date.now()}.jpg`,
          })),
          existingPhotoIds,
        }

        const response = await updateSignal(signal.id, updateData, token || undefined)

        const updatedSignal = (response as any).doc

        setSignal(updatedSignal)
        setIsEditing(false)
        Alert.alert(t('signals.success'), t('signals.updateSuccess'))
      } catch (err) {
        console.error('Error updating signal:', err)
        Alert.alert(
          t('signals.error'),
          err instanceof Error ? err.message : t('signals.updateError')
        )
      } finally {
        setSaving(false)
      }
    },
    [signal, token, i18n.language, t]
  )

  const handleSave = useCallback(() => {
    if (formRef.current?.handleSubmit) {
      formRef.current.handleSubmit(handleFormSubmit)()
    }
  }, [handleFormSubmit])

  const handleResolve = useCallback(() => {
    if (!signal || !token) return
    Alert.alert(t('signals.resolveConfirmTitle'), t('signals.resolveConfirmMessage'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('signals.markResolved'),
        onPress: async () => {
          try {
            setResolving(true)
            const response = await updateSignal(signal.id, {status: 'resolved'}, token)
            const updatedSignal = (response as any).doc ?? {...signal, status: 'resolved'}
            setSignal(updatedSignal)
            Alert.alert(t('signals.success'), t('signals.resolveSuccess'))
          } catch (err) {
            console.error('Error resolving signal:', err)
            Alert.alert(
              t('signals.error'),
              err instanceof Error ? err.message : t('signals.updateError')
            )
          } finally {
            setResolving(false)
          }
        },
      },
    ])
  }, [signal, token, t])

  // Update header buttons based on editing state
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8}}>
          {isEditing ? (
            <>
              <TouchableOpacity onPress={handleCancelEdit} style={{padding: 8}} disabled={saving}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={{padding: 8, backgroundColor: colors.primary, borderRadius: 8}}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Save size={24} color={colors.surface} />
                )}
              </TouchableOpacity>
            </>
          ) : canEdit ? (
            <TouchableOpacity onPress={handleEdit} style={{padding: 8}}>
              <Edit3 size={24} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      ),
    })
  }, [isEditing, saving, canEdit, navigation, handleCancelEdit, handleEdit, handleSave])

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !signal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || t('signals.notFound')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSignal}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <SignalForm
          ref={formRef}
          signal={signal}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelEdit}
          isSubmitting={saving}
          isEditing={isEditing}
          canEdit={canEdit}
        />

        {canResolve && !isEditing && (
          <TouchableOpacity
            style={[resolveStyles.resolveButton, resolving && resolveStyles.resolveButtonDisabled]}
            onPress={handleResolve}
            disabled={resolving}
            accessibilityRole="button"
            accessibilityLabel={t('signals.markResolved')}
          >
            {resolving ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <>
                <CheckCircle size={20} color={colors.surface} />
                <Text style={resolveStyles.resolveButtonText}>{t('signals.markResolved')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const resolveStyles = StyleSheet.create({
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    padding: 14,
    borderRadius: radius.md,
  },
  resolveButtonDisabled: {
    opacity: 0.6,
  },
  resolveButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.bodySm,
    color: colors.surface,
  },
})
