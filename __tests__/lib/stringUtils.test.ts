import {extractSnippet, formatCategoryLabel} from '../../lib/stringUtils'
import i18n from '../../i18n'

jest.mock('../../i18n', () => ({
  t: jest.fn(),
}))

describe('stringUtils', () => {
  describe('extractSnippet', () => {
    it('removes markdown headers and returns cleaned text', () => {
      const input = '### Header Title\nSome content here'
      const result = extractSnippet(input)
      expect(result).toBe('Header Title Some content here')
    })

    it('removes bold markdown formatting', () => {
      const input = 'This is **bold text** in a sentence'
      const result = extractSnippet(input)
      expect(result).toBe('This is bold text in a sentence')
    })

    it('removes italic markdown formatting', () => {
      const input = 'This is *italic text* in a sentence'
      const result = extractSnippet(input)
      expect(result).toBe('This is italic text in a sentence')
    })

    it('removes bullet points', () => {
      const input = '- First item\n- Second item\n* Third item'
      const result = extractSnippet(input)
      expect(result).toBe('First item Second item Third item')
    })

    it('collapses multiple spaces and newlines', () => {
      const input = 'Text   with    multiple\n\n\nspaces   and\nnewlines'
      const result = extractSnippet(input)
      expect(result).toBe('Text with multiple spaces and newlines')
    })

    it('truncates text longer than maxLength with ellipsis', () => {
      const input =
        'This is a very long text that should be truncated when it exceeds the maximum length parameter'
      const result = extractSnippet(input, 50)
      expect(result).toBe('This is a very long text that should be truncated...')
      expect(result.length).toBeLessThanOrEqual(56) // actual length after truncation
    })

    it('does not truncate text shorter than maxLength', () => {
      const input = 'Short text'
      const result = extractSnippet(input, 50)
      expect(result).toBe('Short text')
    })

    it('uses default maxLength of 100', () => {
      const input = 'a'.repeat(150)
      const result = extractSnippet(input)
      expect(result).toBe('a'.repeat(100) + '...')
    })

    it('handles complex markdown with multiple formatting types', () => {
      const input = `### Important Notice

**Organization:** City of Sofia

In the period from **15.02.2026** to **15.08.2026** (inclusive):

* Item one with *emphasis*
* Item two with **bold**
- Third item`

      const result = extractSnippet(input, 150)
      expect(result).toContain('Important Notice')
      expect(result).toContain('Organization: City of Sofia')
      expect(result).toContain('15.02.2026')
      expect(result).not.toContain('###')
      expect(result).not.toContain('**')
      expect(result).not.toContain('*')
    })

    it('handles empty string', () => {
      const result = extractSnippet('')
      expect(result).toBe('')
    })

    it('handles text with only whitespace', () => {
      const result = extractSnippet('   \n\n   \t  ')
      expect(result).toBe('')
    })

    it('preserves alphanumeric and special characters', () => {
      const input = 'Text with numbers 123 and symbols: !@#$%'
      const result = extractSnippet(input)
      expect(result).toBe('Text with numbers 123 and symbols: !@#$%')
    })

    it('handles multiple header levels', () => {
      const input = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6\nContent'
      const result = extractSnippet(input)
      expect(result).toBe('H1 H2 H3 H4 H5 H6 Content')
    })

    it('handles nested bold and italic', () => {
      const input = '**Bold with *nested italic* text**'
      const result = extractSnippet(input)
      expect(result).toBe('Bold with nested italic text')
    })

    it('truncates at word boundary when possible', () => {
      const input = 'This is a sentence that should be truncated properly'
      const result = extractSnippet(input, 25)
      expect(result.endsWith('...')).toBe(true)
      expect(result.length).toBeLessThanOrEqual(28)
    })
  })

  describe('formatCategoryLabel', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('returns translated label when translation exists', () => {
      const mockT = i18n.t as unknown as jest.Mock
      mockT.mockReturnValue('Превозни Средства')

      const result = formatCategoryLabel('transport')

      expect(mockT).toHaveBeenCalledWith('categories.transport')
      expect(result).toBe('Превозни Средства')
    })

    it('formats kebab-case category when no translation exists', () => {
      const mockT = i18n.t as unknown as jest.Mock
      mockT.mockReturnValue('categories.some-category')

      const result = formatCategoryLabel('some-category')

      expect(result).toBe('Some Category')
    })

    it('handles single-word category', () => {
      const mockT = i18n.t as unknown as jest.Mock
      mockT.mockReturnValue('categories.test')

      const result = formatCategoryLabel('test')

      expect(result).toBe('Test')
    })

    it('capitalizes each word in multi-word category', () => {
      const mockT = i18n.t as unknown as jest.Mock
      mockT.mockReturnValue('categories.street-closure-events')

      const result = formatCategoryLabel('street-closure-events')

      expect(result).toBe('Street Closure Events')
    })
  })
})
