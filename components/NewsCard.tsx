import {View, Text, StyleSheet, Image, TouchableOpacity} from 'react-native'
import {useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import type {NewsItem} from '../types/news'
import {CategoryBadge} from './CategoryBadge'
import {TimespanBadge} from './TimespanBadge'
import {getCategoryColor} from '@/lib/categories'
import {commonStyles, uiTokens} from '../styles/common'

interface NewsCardProps {
  item: NewsItem
}

export function NewsCard({item}: NewsCardProps) {
  const router = useRouter()
  const {t} = useTranslation()
  const primaryCategory = item.categories?.[0] ?? item.topic
  const borderColor = getCategoryColor(primaryCategory)

  return (
    <TouchableOpacity
      style={[commonStyles.card, styles.container, {borderLeftColor: borderColor}]}
      onPress={() => router.push(`/(tabs)/home/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Category badges */}
        {item.categories && item.categories.length > 0 ? (
          <View style={styles.categoriesRow}>
            {item.categories.slice(0, 3).map((cat) => (
              <CategoryBadge key={cat} category={cat} size="small" />
            ))}
          </View>
        ) : null}

        {/* Title or snippet */}
        {item.title ? (
          <Text style={styles.title} numberOfLines={3}>
            {item.title}
          </Text>
        ) : item.snippet ? (
          <Text style={styles.snippet} numberOfLines={2}>
            {item.snippet}
          </Text>
        ) : null}

        {/* Timespan */}
        {item.timespanStatus ? (
          <View style={styles.timespanRow}>
            <TimespanBadge
              status={item.timespanStatus}
              startDate={item.timespanStart}
              endDate={item.timespanEnd}
            />
          </View>
        ) : null}

        {/* City-wide badge */}
        {item.cityWide ? (
          <View style={styles.cityWideBadge}>
            <Text style={styles.cityWideText}>{t('common.cityWide')}</Text>
          </View>
        ) : null}

        {/* Source row */}
        <View style={styles.bottomRow}>
          <View style={styles.sourceRow}>
            {item.sourceLogoUrl ? (
              <Image source={{uri: item.sourceLogoUrl}} style={styles.sourceLogo} />
            ) : null}
            <Text style={styles.sourceText} numberOfLines={1}>
              {item.sourceName || item.description}
            </Text>
            {item.responsibleEntity ? (
              <Text style={styles.entityText} numberOfLines={1}>
                {' \u2022 '}
                {item.responsibleEntity}
              </Text>
            ) : null}
          </View>
          <Text style={styles.date}>{item.date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9CA3AF',
  },
  content: {
    padding: uiTokens.spacing.md,
    gap: uiTokens.spacing.sm,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
    lineHeight: 21,
  },
  snippet: {
    fontSize: 14,
    fontWeight: '400',
    color: uiTokens.colors.textSecondary,
    lineHeight: 20,
  },
  timespanRow: {
    marginTop: 2,
  },
  cityWideBadge: {
    alignSelf: 'flex-start',
    backgroundColor: uiTokens.colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: uiTokens.radius.pill,
  },
  cityWideText: {
    fontSize: 11,
    fontWeight: '600',
    color: uiTokens.colors.warning,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  sourceLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  sourceText: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
  },
  entityText: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
  },
  date: {
    fontSize: 11,
    color: uiTokens.colors.textMuted,
    marginLeft: 8,
  },
})
