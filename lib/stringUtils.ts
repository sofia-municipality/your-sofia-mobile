import i18n from '@/i18n'

export function formatCategoryLabel(category: string): string {
  const key = `categories.${category}`
  const translated = i18n.t(key)
  if (translated === key) {
    return category
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  return translated
}
