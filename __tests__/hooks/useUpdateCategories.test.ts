import {renderHook} from '@testing-library/react-native'
import {useUpdateCategories} from '../../hooks/useUpdateCategories'
import {CATEGORY_DISPLAY_ORDER, getCategoryIcon} from '../../lib/categories'

// A stable `t`, like react-i18next provides for a given language.
const mockT = (key: string) => `t:${key}`

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockT}),
}))

// formatCategoryLabel translates via the i18n singleton; with no translation it
// falls back to a title-cased slug.
jest.mock('../../i18n', () => ({
  __esModule: true,
  default: {
    t: (key: string) => (key === 'categories.water' ? 'Вода' : key),
  },
}))

describe('useUpdateCategories', () => {
  it('lists the categories in display order with "uncategorized" last', async () => {
    const {result} = await renderHook(() => useUpdateCategories())

    expect(result.current.categories).toEqual([...CATEGORY_DISPLAY_ORDER, 'uncategorized'])
  })

  it('starts the filter chips with a translated "all" chip without an icon', async () => {
    const {result} = await renderHook(() => useUpdateCategories())

    expect(result.current.filterChips[0]).toEqual({id: 'all', label: 't:common.topics.all'})
  })

  it('builds a chip with label and icon for every category', async () => {
    const {result} = await renderHook(() => useUpdateCategories())

    const chips = result.current.filterChips.slice(1)
    expect(chips.map((chip) => chip.id)).toEqual(result.current.categories)
    for (const chip of chips) {
      expect(chip.icon).toBe(getCategoryIcon(chip.id))
    }
  })

  it('uses translated category names and falls back to a title-cased slug', async () => {
    const {result} = await renderHook(() => useUpdateCategories())

    const labelOf = (id: string) => result.current.filterChips.find((c) => c.id === id)?.label
    expect(labelOf('water')).toBe('Вода')
    expect(labelOf('construction-and-repairs')).toBe('Construction And Repairs')
    expect(labelOf('uncategorized')).toBe('Uncategorized')
  })

  it('keeps categories and chips referentially stable across renders', async () => {
    const {result, rerender} = await renderHook(() => useUpdateCategories())
    const {categories, filterChips} = result.current

    await rerender({})

    expect(result.current.categories).toBe(categories)
    expect(result.current.filterChips).toBe(filterChips)
  })

  it('reports a static, already-loaded state', async () => {
    const {result} = await renderHook(() => useUpdateCategories())

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(() => result.current.refresh()).not.toThrow()
  })
})
