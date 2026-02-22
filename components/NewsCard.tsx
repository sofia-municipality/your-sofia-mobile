import {View, Text, StyleSheet, Image, TouchableOpacity} from 'react-native'
import {useRouter} from 'expo-router'
import type {NewsItem} from '../types/news'
import {getCategoryColor} from '@/lib/categories'

interface NewsCardProps {
  item: NewsItem
}

export function NewsCard({item}: NewsCardProps) {
  const router = useRouter()
  const primaryCategory = item.categories?.[0] ?? item.topic
  const borderColor = getCategoryColor(primaryCategory)

  return (
    <TouchableOpacity
      style={[styles.container, {borderLeftColor: borderColor}]}
      onPress={() => router.push(`/(tabs)/home/${item.id}`)}
      activeOpacity={0.7}
    >
      {item.image && <Image source={{uri: item.image}} style={styles.image} resizeMode="contain" />}
      <View style={styles.content}>
        {item.title ? (
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
        ) : null}
        {item.snippet ? (
          <Text style={styles.snippet} numberOfLines={2}>
            {item.snippet}
          </Text>
        ) : null}
        <Text style={styles.description} numberOfLines={2}>
          {item.sourceName || item.description}
        </Text>
        <Text style={styles.date}>{item.date}</Text>
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
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 332,
    backgroundColor: '#aedcedff',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  snippet: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 20,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
})
