import {View, Text, StyleSheet, Image, TouchableOpacity} from 'react-native'
import {useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import type {NewsItem} from '../types/news'
import {CategoryBadge} from './CategoryBadge'
import {TimespanBadge} from './TimespanBadge'
import {getCategoryColor} from '@/lib/categories'

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
      style={[styles.container, {borderLeftColor: borderColor}]}
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

        {/* Title */}
        <Text style={styles.title} numberOfLines={3}>
          {item.title}
        </Text>

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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9CA3AF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  content: {
    padding: 14,
    gap: 8,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 21,
  },
  timespanRow: {
    marginTop: 2,
  },
  cityWideBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cityWideText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
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
    color: '#9CA3AF',
  },
  entityText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  date: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 8,
  },
})
