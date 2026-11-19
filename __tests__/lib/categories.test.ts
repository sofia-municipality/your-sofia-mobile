import {CircleHelp, Droplets, Trash2} from 'lucide-react-native'
import {
  CATEGORY_DISPLAY_ORDER,
  UNCATEGORIZED,
  getCategoryColor,
  getCategoryIcon,
} from '../../lib/categories'
import {colors} from '../../styles/tokens'
import en from '../../translations/en'
import bg from '../../translations/bg'

const allCategories = [...CATEGORY_DISPLAY_ORDER, UNCATEGORIZED]

describe('getCategoryIcon', () => {
  it('returns the icon for a known category', () => {
    expect(getCategoryIcon('water')).toBe(Droplets)
    expect(getCategoryIcon('waste')).toBe(Trash2)
  })

  it('uses the help icon for uncategorized and unknown categories', () => {
    expect(getCategoryIcon(UNCATEGORIZED)).toBe(CircleHelp)
    expect(getCategoryIcon('fireworks')).toBe(CircleHelp)
    expect(getCategoryIcon('')).toBe(CircleHelp)
  })

  it('has a dedicated icon for every displayed category', () => {
    for (const category of CATEGORY_DISPLAY_ORDER) {
      expect([category, getCategoryIcon(category)]).not.toEqual([category, CircleHelp])
    }
  })
})

describe('getCategoryColor', () => {
  it('returns the color for a known category', () => {
    expect(getCategoryColor('water')).toBe('#3B82F6')
    expect(getCategoryColor('road-block')).toBe('#DC2626')
  })

  it('uses the muted text color for uncategorized and unknown categories', () => {
    expect(getCategoryColor(UNCATEGORIZED)).toBe(colors.textMuted)
    expect(getCategoryColor('fireworks')).toBe(colors.textMuted)
  })

  it('gives every displayed category its own hex color', () => {
    const categoryColors = CATEGORY_DISPLAY_ORDER.map(getCategoryColor)

    for (const color of categoryColors) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/)
    }
    expect(new Set(categoryColors).size).toBe(categoryColors.length)
  })
})

describe('CATEGORY_DISPLAY_ORDER', () => {
  it('lists each category once', () => {
    expect(new Set(CATEGORY_DISPLAY_ORDER).size).toBe(CATEGORY_DISPLAY_ORDER.length)
  })

  it('does not include the uncategorized bucket', () => {
    expect(CATEGORY_DISPLAY_ORDER).not.toContain(UNCATEGORIZED)
  })

  it.each([
    ['en', en.categories],
    ['bg', bg.categories],
  ])('has a %s label for every category', (_lang, labels) => {
    expect(Object.keys(labels).sort()).toEqual([...allCategories].sort())
  })
})
