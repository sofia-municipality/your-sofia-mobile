import React, {useState, useEffect, useCallback} from 'react'
import {useFocusEffect} from '@react-navigation/native'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useRouter, useLocalSearchParams} from 'expo-router'
import {useBellAction} from '../../../contexts/BellActionContext'
import {fetchSignals} from '../../../lib/payload'
import type {Signal} from '../../../types/signal'
import {AlertCircle, Clock, CheckCircle, XCircle} from 'lucide-react-native'
import {commonStyles, uiTokens} from '../../../styles/common'

export default function SignalsScreen() {
  const {t, i18n} = useTranslation()
  const router = useRouter()
  const {containerReferenceId} = useLocalSearchParams<{containerReferenceId?: string}>()
  const {registerBellAction} = useBellAction()
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFirstFocus, setIsFirstFocus] = useState(true)

  const handleCreateSignal = useCallback(() => {
    router.push('/(tabs)/signals/new' as any)
  }, [router])

  // Register the Plus button action when screen is focused
  useFocusEffect(
    useCallback(() => {
      registerBellAction(handleCreateSignal)
    }, [registerBellAction, handleCreateSignal])
  )

  const loadSignals = useCallback(
    async (isRefreshing = false) => {
      try {
        if (!isRefreshing) setLoading(true)
        setError(null)
        const response = await fetchSignals({
          locale: i18n.language as 'bg' | 'en',
          limit: 50,
          containerReferenceId: containerReferenceId,
        })
        setSignals(response.docs)
      } catch (err) {
        console.error('Error loading signals:', err)
        setError(err instanceof Error ? err.message : t('signals.error'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [i18n.language, t, containerReferenceId]
  )

  useEffect(() => {
    loadSignals()
  }, [loadSignals])

  // Refresh signals when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus) {
        setIsFirstFocus(false)
        return
      }
      loadSignals()
    }, [isFirstFocus, loadSignals])
  )

  const onRefresh = () => {
    setRefreshing(true)
    loadSignals(true)
  }

  const getStatusIcon = (status: Signal['status']) => {
    const iconProps = {size: 18}
    switch (status) {
      case 'pending':
        return <Clock {...iconProps} color="#F59E0B" />
      case 'in-progress':
        return <AlertCircle {...iconProps} color="#3B82F6" />
      case 'resolved':
        return <CheckCircle {...iconProps} color="#10B981" />
      case 'rejected':
        return <XCircle {...iconProps} color="#EF4444" />
      default:
        return null
    }
  }

  const getStatusColor = (status: Signal['status']) => {
    const colors = {
      pending: '#F59E0B',
      'in-progress': '#3B82F6',
      resolved: '#10B981',
      rejected: '#EF4444',
    }
    return colors[status] || '#6B7280'
  }

  const renderSignalItem = ({item}: {item: Signal}) => (
    <TouchableOpacity
      style={[commonStyles.card, styles.signalCard]}
      onPress={() => router.push(`/(tabs)/signals/${item.id}` as any)}
    >
      <View style={styles.signalHeader}>
        <View style={styles.statusBadge}>
          {getStatusIcon(item.status)}
          <Text style={[styles.statusText, {color: getStatusColor(item.status)}]}>
            {t(`signals.status.${item.status}`)}
          </Text>
        </View>
        <Text style={styles.categoryBadge}>{t(`signals.categories.${item.category}`)}</Text>
      </View>

      <Text style={styles.signalTitle}>{item.title}</Text>
      <Text style={styles.signalDescription} numberOfLines={2}>
        {item.description}
      </Text>

      {item.cityObject?.name && <Text style={styles.signalObject}>📍 {item.cityObject.name}</Text>}

      <Text style={styles.signalDate}>
        {new Date(item.createdAt).toLocaleDateString(i18n.language, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </TouchableOpacity>
  )

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={uiTokens.colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadSignals()}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const renderListHeader = () => {
    if (!containerReferenceId) return null
    return (
      <View style={styles.filterBanner}>
        <Text style={styles.filterText}>
          {t('signals.filteredForContainer', {id: containerReferenceId})}
        </Text>
        <TouchableOpacity
          style={styles.filterClearButton}
          onPress={() => router.push('/(tabs)/signals' as any)}
        >
          <Text style={styles.filterClearButtonText}>{t('signals.clearFilter')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={signals}
        renderItem={renderSignalItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('signals.noSignals')}</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={uiTokens.colors.primary}
          />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: uiTokens.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: uiTokens.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: uiTokens.colors.textMuted,
  },
  errorText: {
    fontSize: 16,
    color: uiTokens.colors.danger,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: uiTokens.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: uiTokens.radius.sm,
  },
  retryButtonText: {
    color: uiTokens.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: uiTokens.spacing.lg,
  },
  signalCard: {
    padding: uiTokens.spacing.lg,
    marginBottom: uiTokens.spacing.md,
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  categoryBadge: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
    backgroundColor: uiTokens.colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  signalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: uiTokens.colors.textPrimary,
    marginBottom: 8,
  },
  signalDescription: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
    lineHeight: 20,
    marginBottom: 8,
  },
  signalObject: {
    fontSize: 13,
    color: uiTokens.colors.primary,
    marginBottom: 8,
  },
  signalDate: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: uiTokens.colors.textMuted,
    textAlign: 'center',
  },
  filterBanner: {
    backgroundColor: uiTokens.colors.primarySoft,
    padding: 12,
    borderRadius: uiTokens.radius.sm,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterText: {
    fontSize: 13,
    color: uiTokens.colors.primary,
    flex: 1,
  },
  filterClearButton: {
    marginLeft: 12,
    backgroundColor: uiTokens.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterClearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
})
