import {View, Text, StyleSheet} from 'react-native'
import {getCategoryColor, getCategoryIcon} from '@/lib/categories'
import {formatCategoryLabel} from '@/lib/stringUtils'
import {uiTokens} from '../styles/common'

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
    paddingHorizontal: uiTokens.spacing.sm,
    paddingVertical: uiTokens.spacing.xs,
    borderRadius: uiTokens.radius.pill,
    gap: uiTokens.spacing.xs,
  },
  label: {
    fontWeight: '600',
  },
})
