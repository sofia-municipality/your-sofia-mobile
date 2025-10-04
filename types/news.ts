export type NewsTopicType = 'festivals' | 'street-closure' | 'city-events' | 'alerts' | 'all';

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  date: string;
  topic: NewsTopicType;
  image?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface NewsFilterChip {
  id: NewsTopicType;
  label: string;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
}