import i18n from '../../i18n'
import {extractSnippet, formatCategoryLabel} from '../../lib/stringUtils'

describe('formatCategoryLabel', () => {
  afterAll(async () => {
    await i18n.changeLanguage('bg')
  })

  it('uses the English translation when one exists', async () => {
    await i18n.changeLanguage('en')

    expect(formatCategoryLabel('construction-and-repairs')).toBe('Construction and Repairs')
    expect(formatCategoryLabel('air-quality')).toBe('Air Quality')
  })

  it('uses the Bulgarian translation when one exists', async () => {
    await i18n.changeLanguage('bg')

    expect(formatCategoryLabel('water')).toBe('Вода')
    expect(formatCategoryLabel('public-transport')).toBe('Градски транспорт')
  })

  it('title-cases an unknown slug word by word', async () => {
    await i18n.changeLanguage('en')

    expect(formatCategoryLabel('snow-removal-and-gritting')).toBe('Snow Removal And Gritting')
  })

  it('capitalises a single unknown word', async () => {
    await i18n.changeLanguage('en')

    expect(formatCategoryLabel('fireworks')).toBe('Fireworks')
  })
})

describe('extractSnippet', () => {
  it('returns short plain text unchanged', () => {
    expect(extractSnippet('Water outage on Vitosha Blvd.')).toBe('Water outage on Vitosha Blvd.')
  })

  it('strips markdown headings, list markers, bold and italics', () => {
    const markdown = ['## Planned outage', '- **Where:** Lozenets', '* *When:* 10:00-14:00'].join(
      '\n'
    )

    expect(extractSnippet(markdown)).toBe('Planned outage Where: Lozenets When: 10:00-14:00')
  })

  it('collapses whitespace and newlines into single spaces', () => {
    expect(extractSnippet('  one\n\n two\t\tthree  ')).toBe('one two three')
  })

  it('truncates long text to the limit and adds an ellipsis', () => {
    const text = 'a'.repeat(150)

    expect(extractSnippet(text)).toBe(`${'a'.repeat(100)}...`)
  })

  it('respects a custom limit', () => {
    expect(extractSnippet('Repairs on Tsarigradsko shose', 10)).toBe('Repairs on...')
  })

  it('trims trailing whitespace before the ellipsis', () => {
    expect(extractSnippet('Repairs   on the road', 8)).toBe('Repairs...')
  })

  it('does not add an ellipsis when the text is exactly the limit', () => {
    expect(extractSnippet('12345', 5)).toBe('12345')
  })

  it('measures the limit after markdown is removed', () => {
    expect(extractSnippet('**12345**', 5)).toBe('12345')
  })

  it('keeps hashes that are not headings', () => {
    expect(extractSnippet('Bus #94 is delayed')).toBe('Bus #94 is delayed')
  })
})
