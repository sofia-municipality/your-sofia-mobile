import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native'
import type {NewsTopicType, NewsFilterChip} from '../types/news'
import {getCategoryColor} from '@/lib/categories'

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
            style={[styles.chip, isSelected && {backgroundColor: categoryColor}]}
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
    paddingHorizontal: 4,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  selectedLabel: {
    color: '#FFFFFF',
  },
})
