import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native'
import type {NewsTopicType, NewsFilterChip} from '../types/news'
import {getCategoryColor} from '@/lib/categories'
import {commonStyles, uiTokens} from '../styles/common'

interface TopicFilterProps {
  selectedTopic: NewsTopicType
  onTopicChange: (topic: NewsTopicType) => void
  topics: NewsFilterChip[]
}

export function TopicFilter({selectedTopic, onTopicChange, topics}: TopicFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {topics.map((topic) => {
        const isSelected = selectedTopic === topic.id
        const Icon = topic.icon
        const categoryColor = topic.id === 'all' ? '#1E40AF' : getCategoryColor(topic.id)

        return (
          <TouchableOpacity
            key={topic.id}
            style={[
              commonStyles.chip,
              styles.chip,
              isSelected && {backgroundColor: categoryColor, borderColor: categoryColor},
            ]}
            onPress={() => onTopicChange(topic.id)}
          >
            {Icon && (
              <View style={styles.icon}>
                <Icon size={14} color={isSelected ? '#FFFFFF' : categoryColor} />
              </View>
            )}
            <Text
              style={[styles.label, isSelected ? styles.selectedLabel : {color: '#4B5563'}]}
              numberOfLines={1}
            >
              {topic.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: uiTokens.spacing.xs,
    gap: uiTokens.spacing.sm,
  },
  chip: {
    gap: uiTokens.spacing.xs,
  },
  icon: {
    marginRight: uiTokens.spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: uiTokens.colors.textSecondary,
  },
  selectedLabel: {
    color: uiTokens.colors.surface,
  },
})
