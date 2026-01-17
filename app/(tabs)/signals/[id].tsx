import React, {useState, useEffect, useCallback, useRef} from 'react'
import {View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useLocalSearchParams, useNavigation} from 'expo-router'
import {SafeAreaView} from 'react-native-safe-area-context'
import {Edit3, Save, X} from 'lucide-react-native'
import {fetchSignalById, updateSignal} from '../../../lib/payload'
import {getUniqueReporterId} from '../../../lib/deviceId'
import type {Signal} from '../../../types/signal'
import {type ContainerState} from '../../../types/containerState'
import {SignalForm, type SignalFormData, styles} from '../../../forms/signal'

export default function SignalDetailsScreen() {
  const {t, i18n} = useTranslation()
  const navigation = useNavigation()
  const {id} = useLocalSearchParams<{id: string}>()
  const formRef = useRef<any>(null)

  const [signal, setSignal] = useState<Signal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [deviceId, setDeviceId] = useState<string>('')

  const loadDeviceId = async () => {
    const id = await getUniqueReporterId()
    setDeviceId(id)
  }

  const loadSignal = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const data = await fetchSignalById(id, i18n.language as 'bg' | 'en')
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
    loadDeviceId()
  }, [loadSignal])

  // Check if user can edit this signal
  useEffect(() => {
    if (signal && deviceId) {
      const canUserEdit = signal.reporterUniqueId === deviceId
      setCanEdit(canUserEdit)
    }
  }, [signal, deviceId])

  const handleEdit = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
  }, [])

  const handleFormSubmit = useCallback(
    async (data: SignalFormData) => {
      if (!signal || !deviceId) return

      try {
        setSaving(true)

        const updateData = {
          title: data.title.trim(),
          description: data.description?.trim() || '',
          containerState: (data.containerState || []) as ContainerState[],
          reporterUniqueId: deviceId,
        }

        const response = await updateSignal(signal.id, updateData, i18n.language as 'bg' | 'en')

        console.log('[Signal Update] Response:', {
          response,
        })

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
    [signal, deviceId, i18n.language, t]
  )

  const handleSave = useCallback(() => {
    if (formRef.current?.handleSubmit) {
      formRef.current.handleSubmit(handleFormSubmit)()
    }
  }, [handleFormSubmit])

  // Update header buttons based on editing state
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8}}>
          {isEditing ? (
            <>
              <TouchableOpacity onPress={handleCancelEdit} style={{padding: 8}} disabled={saving}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={{padding: 8, backgroundColor: '#1E40AF', borderRadius: 8}}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Save size={24} color="#ffffff" />
                )}
              </TouchableOpacity>
            </>
          ) : canEdit ? (
            <TouchableOpacity onPress={handleEdit} style={{padding: 8}}>
              <Edit3 size={24} color="#1E40AF" />
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
          <ActivityIndicator size="large" color="#1E40AF" />
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
      </ScrollView>
    </SafeAreaView>
  )
}
