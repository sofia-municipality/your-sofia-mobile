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

/**
 * Extract a short snippet from text for preview purposes
 * Removes markdown formatting and truncates to specified length
 */
export function extractSnippet(text: string, maxLength: number = 100): string {
  // Remove bullet points first (before other replacements)
  let cleaned = text.replace(/^[-*]\s+/gm, '')
  // Remove markdown headers
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '')
  // Remove bold (must be before italic to avoid conflicts)
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1')
  // Remove italic
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1')
  // Collapse multiple spaces/newlines
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  // Truncate to maxLength
  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength).trim() + '...'
  }
  return cleaned
}
