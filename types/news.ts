export type NewsTopicType = 'festivals' | 'street-closure' | 'city-events' | 'all';

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  date: string;
  topic: NewsTopicType;
  image?: string;
}

export interface NewsFilterChip {
  id: NewsTopicType;
  label: string;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
}