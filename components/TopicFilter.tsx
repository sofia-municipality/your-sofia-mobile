import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native'
import type {NewsFilterChip} from '../types/news'
import {getCategoryColor} from '@/lib/categories'
import {colors, fonts, fontSizes, radius, spacing} from '@/styles/tokens'

interface TopicFilterProps {
  selectedTopics: Set<string>
  onTopicsChange: (topics: Set<string>) => void
  topics: NewsFilterChip[]
}

export function TopicFilter({selectedTopics, onTopicsChange, topics}: TopicFilterProps) {
  const allSelected = selectedTopics.has('all')

  const handlePress = (id: string) => {
    if (id === 'all') {
      // Toggle all: if already showing all, go back to nothing (which also means all)
      onTopicsChange(new Set(['all']))
      return
    }
    const next = new Set(selectedTopics)
    next.delete('all')
    if (next.has(id)) {
      next.delete(id)
      // Nothing left → fall back to 'all'
      if (next.size === 0) next.add('all')
    } else {
      next.add(id)
    }
    onTopicsChange(next)
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {topics.map((topic) => {
        const isSelected = topic.id === 'all' ? allSelected : selectedTopics.has(topic.id)
        const Icon = topic.icon
        const categoryColor = topic.id === 'all' ? colors.primary : getCategoryColor(topic.id)

        return (
          <TouchableOpacity
            key={topic.id}
            style={[
              styles.chip,
              isSelected && {backgroundColor: categoryColor, borderColor: categoryColor},
            ]}
            onPress={() => handlePress(topic.id)}
            accessibilityRole="button"
            accessibilityLabel={topic.label}
            accessibilityState={{selected: isSelected}}
          >
            {Icon && (
              <View style={styles.icon}>
                <Icon size={14} color={isSelected ? colors.surface : categoryColor} />
              </View>
            )}
            <Text style={[styles.label, isSelected ? styles.selectedLabel : styles.defaultLabel]}>
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
    gap: spacing.xs,
    marginTop: spacing['2xs'],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    marginRight: spacing['2xs'],
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.label,
  },
  defaultLabel: {
    color: colors.textSecondary,
  },
  selectedLabel: {
    color: colors.surface,
  },
})
