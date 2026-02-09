import {View, Text, StyleSheet} from 'react-native'
import {getCategoryColor, getCategoryIcon} from '@/lib/categories'
import {formatCategoryLabel} from '@/lib/stringUtils'

interface CategoryBadgeProps {
  category: string
  size?: 'small' | 'medium'
}

export function CategoryBadge({category, size = 'small'}: CategoryBadgeProps) {
  const color = getCategoryColor(category)
  const Icon = getCategoryIcon(category)
  const label = formatCategoryLabel(category)
  const iconSize = size === 'small' ? 12 : 16
  const fontSize = size === 'small' ? 11 : 13

  return (
    <View style={[styles.badge, {backgroundColor: color + '18'}]}>
      <Icon size={iconSize} color={color} />
      <Text style={[styles.label, {color, fontSize}]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  label: {
    fontWeight: '600',
  },
})
