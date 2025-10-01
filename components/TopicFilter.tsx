import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { PartyPopper, Route, Calendar } from 'lucide-react-native';
import type { NewsTopicType, NewsFilterChip } from '../types/news';

interface TopicFilterProps {
  selectedTopic: NewsTopicType;
  onTopicChange: (topic: NewsTopicType) => void;
  t: (key: string) => string;
}

export function TopicFilter({ selectedTopic, onTopicChange, t }: TopicFilterProps) {
  const topics: NewsFilterChip[] = [
    { id: 'all', label: t('common.topics.all') },
    { id: 'festivals', label: t('common.topics.festivals'), icon: PartyPopper },
    { id: 'street-closure', label: t('common.topics.streetClosure'), icon: Route },
    { id: 'city-events', label: t('common.topics.cityEvents'), icon: Calendar },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {topics.map((topic) => {
        const isSelected = selectedTopic === topic.id;
        const Icon = topic.icon;

        return (
          <TouchableOpacity
            key={topic.id}
            style={[
              styles.chip,
              isSelected && styles.selectedChip,
            ]}
            onPress={() => onTopicChange(topic.id)}
          >
            {Icon && (
              <View style={styles.icon}>
                <Icon
                  size={16}
                  color={isSelected ? '#FFFFFF' : '#6B7280'}
                />
              </View>
            )}
            <Text style={[
              styles.label,
              isSelected && styles.selectedLabel
            ]}>
              {topic.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
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
  selectedChip: {
    backgroundColor: '#1E40AF',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedLabel: {
    color: '#FFFFFF',
  },
});