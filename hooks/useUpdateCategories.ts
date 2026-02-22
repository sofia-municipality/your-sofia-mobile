import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import {CATEGORY_DISPLAY_ORDER, UNCATEGORIZED, getCategoryIcon} from '@/lib/categories'
import {formatCategoryLabel} from '@/lib/stringUtils'
import type {NewsFilterChip} from '@/types/news'

export function useUpdateCategories() {
  const {t} = useTranslation()

  const categories = useMemo(() => [...CATEGORY_DISPLAY_ORDER, UNCATEGORIZED], [])

  const filterChips = useMemo<NewsFilterChip[]>(
    () => [
      {id: 'all', label: t('common.topics.all')},
      ...categories.map((slug) => ({
        id: slug,
        label: formatCategoryLabel(slug),
        icon: getCategoryIcon(slug),
      })),
    ],
    [categories, t]
  )

  return {
    categories,
    filterChips,
    loading: false,
    error: null,
    refresh: () => {},
  }
}
