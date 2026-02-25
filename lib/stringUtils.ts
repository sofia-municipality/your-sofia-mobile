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

export function extractSnippet(text: string, maxLength: number = 100): string {
  let cleaned = text.replace(/^[-*]\s+/gm, '')
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '')
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1')
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1')
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength).trim() + '...'
  }

  return cleaned
}
