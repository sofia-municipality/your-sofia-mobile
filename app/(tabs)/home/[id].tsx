import React, {useState, useEffect} from 'react'
import {View, Text, StyleSheet, ScrollView, Image, ActivityIndicator} from 'react-native'
import {useLocalSearchParams} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {fetchNewsById, type PayloadNewsItem} from '@/lib/payload'
import {environmentManager} from '@/lib/environment'

export default function NewsDetail() {
  const {id} = useLocalSearchParams<{id: string}>()
  const {t, i18n} = useTranslation()
  const [news, setNews] = useState<PayloadNewsItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const loadNews = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchNewsById(id, i18n.language as 'bg' | 'en')
        setNews(data)
      } catch (err) {
        console.error('Error loading news:', err)
        setError(err instanceof Error ? err.message : 'Failed to load news')
      } finally {
        setLoading(false)
      }
    }

    loadNews()
  }, [id, i18n.language])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    )
  }

  if (error || !news) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || t('common.error')}</Text>
      </View>
    )
  }

  const imageUrl =
    news.image && typeof news.image !== 'string'
      ? `${environmentManager.getApiUrl()}${news.image.url}`
      : undefined

  const formattedDate = new Date(news.publishedAt).toLocaleDateString(
    i18n.language === 'bg' ? 'bg-BG' : 'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  )

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {imageUrl && <Image source={{uri: imageUrl}} style={styles.image} resizeMode="contain" />}

        <View style={styles.content}>
          <Text style={styles.title}>{news.title}</Text>
          <Text style={styles.date}>{formattedDate}</Text>
          <Text style={styles.description}>{news.description}</Text>

          {news.content && (
            <View style={styles.richContent}>
              <Text style={styles.contentText}>
                {/* TODO: Render Lexical rich text content properly */}
                {/* {JSON.stringify(news.content, null, 2)} */}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 332,
    backgroundColor: '#aedcedff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 32,
  },
  date: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  richContent: {
    marginTop: 8,
  },
  contentText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1E40AF',
    marginLeft: 8,
  },
})
