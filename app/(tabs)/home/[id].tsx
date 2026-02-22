import React from 'react'
import {View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Linking} from 'react-native'
import {useLocalSearchParams} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {useUpdateById} from '@/hooks/useUpdateById'

export default function NewsDetail() {
  const {id} = useLocalSearchParams<{id: string}>()
  const {t} = useTranslation()
  const {newsItem, loading, error} = useUpdateById(id)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    )
  }

  if (error || !newsItem) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || t('common.error')}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {newsItem.image && (
          <Image source={{uri: newsItem.image}} style={styles.image} resizeMode="contain" />
        )}

        <View style={styles.content}>
          {newsItem.title ? <Text style={styles.title}>{newsItem.title}</Text> : null}
          <Text style={styles.date}>{newsItem.date}</Text>

          {newsItem.snippet ? <Text style={styles.description}>{newsItem.snippet}</Text> : null}

          <Text style={styles.contentText}>{newsItem.markdownText || newsItem.rawText || ''}</Text>

          {newsItem.sourceUrl ? (
            <Text style={styles.sourceLink} onPress={() => Linking.openURL(newsItem.sourceUrl!)}>
              {newsItem.sourceUrl}
            </Text>
          ) : null}
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
  contentText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  sourceLink: {
    fontSize: 13,
    color: '#1E40AF',
    marginTop: 16,
    textDecorationLine: 'underline',
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
})
