import {View, Text, StyleSheet} from 'react-native'
import {useTranslation} from 'react-i18next'
import {uiTokens} from '../styles/common'

interface TimespanBadgeProps {
  status: 'active' | 'upcoming' | 'ended'
  startDate?: string
  endDate?: string
}

const STATUS_STYLES = {
  active: {bg: '#DCFCE7', text: '#16A34A'},
  upcoming: {bg: '#DBEAFE', text: '#2563EB'},
  ended: {bg: '#F3F4F6', text: '#6B7280'},
}

function formatShortDate(iso: string, locale: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', {
    day: 'numeric',
    month: 'short',
  })
}

export function TimespanBadge({status, startDate, endDate}: TimespanBadgeProps) {
  const {t, i18n} = useTranslation()
  const colors = STATUS_STYLES[status]

  const statusLabels: Record<string, string> = {
    active: t('common.timespanActive'),
    upcoming: t('common.timespanUpcoming'),
    ended: t('common.timespanEnded'),
  }

  const dateRange =
    startDate && endDate
      ? `${formatShortDate(startDate, i18n.language)} – ${formatShortDate(endDate, i18n.language)}`
      : startDate
        ? formatShortDate(startDate, i18n.language)
        : endDate
          ? formatShortDate(endDate, i18n.language)
          : null

  return (
    <View style={styles.row}>
      <View style={[styles.badge, {backgroundColor: colors.bg}]}>
        <View style={[styles.dot, {backgroundColor: colors.text}]} />
        <Text style={[styles.label, {color: colors.text}]}>{statusLabels[status]}</Text>
      </View>
      {dateRange ? <Text style={styles.dateRange}>{dateRange}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: uiTokens.spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: uiTokens.spacing.sm,
    paddingVertical: uiTokens.spacing.xs,
    borderRadius: uiTokens.radius.pill,
    gap: uiTokens.spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateRange: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
  },
})
