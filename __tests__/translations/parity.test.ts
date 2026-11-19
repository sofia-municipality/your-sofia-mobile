import en from '../../translations/en'
import bg from '../../translations/bg'
import servicesEn from '../../translations/services.en'
import servicesBg from '../../translations/services.bg'

type Tree = {[key: string]: unknown}

function flatten(tree: Tree, prefix = '', out: Record<string, unknown> = {}) {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object') flatten(value as Tree, path, out)
    else out[path] = value
  }
  return out
}

function placeholders(value: unknown) {
  return (String(value).match(/{{\s*[\w.]+\s*}}/g) ?? []).map((p) => p.replace(/\s/g, '')).sort()
}

/**
 * Keys that are allowed to exist in one language only. Each needs a reason; the tests below
 * fail as soon as a new unexplained gap appears.
 */
const KNOWN_ONE_LANGUAGE_KEYS = new Set([
  // Not referenced anywhere in the app (only a style of the same name exists).
  'wasteContainers.signalsCount',
  // Only referenced from commented-out tabs in app/(tabs)/maps/_layout.tsx.
  'map.filters.bgsmetView',
  'map.filters.transportBpilot',
])

/** Keys whose placeholders differ between languages; each has an `it.failing` test below. */
const KNOWN_PLACEHOLDER_MISMATCHES = new Set(['wasteContainers.signalsActive'])

describe.each([
  ['app', en, bg],
  ['services', servicesEn, servicesBg],
])('%s translations', (_name, enTree, bgTree) => {
  const enKeys = flatten(enTree)
  const bgKeys = flatten(bgTree)

  it('has every English key in Bulgarian', () => {
    const missing = Object.keys(enKeys).filter(
      (key) => !(key in bgKeys) && !KNOWN_ONE_LANGUAGE_KEYS.has(key)
    )

    expect(missing).toEqual([])
  })

  it('has every Bulgarian key in English', () => {
    const missing = Object.keys(bgKeys).filter(
      (key) => !(key in enKeys) && !KNOWN_ONE_LANGUAGE_KEYS.has(key)
    )

    expect(missing).toEqual([])
  })

  it.each([
    ['English', enKeys],
    ['Bulgarian', bgKeys],
  ])('has only non-empty strings in %s', (_lang, keys) => {
    const bad = Object.entries(keys)
      .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
      .map(([key]) => key)

    expect(bad).toEqual([])
  })

  it('uses the same placeholders in both languages', () => {
    const mismatched = Object.keys(enKeys).filter(
      (key) =>
        key in bgKeys &&
        !KNOWN_PLACEHOLDER_MISMATCHES.has(key) &&
        placeholders(enKeys[key]).join() !== placeholders(bgKeys[key]).join()
    )

    expect(mismatched).toEqual([])
  })

  it('has no unbalanced placeholder braces', () => {
    const broken = Object.entries({...enKeys, ...bgKeys})
      .filter(([, value]) => {
        const text = String(value).replace(/{{\s*[\w.]+\s*}}/g, '')
        return text.includes('{{') || text.includes('}}')
      })
      .map(([key]) => key)

    expect(broken).toEqual([])
  })
})

describe('known gaps', () => {
  it('still has every listed one-language key in exactly one language', () => {
    const enKeys = flatten(en)
    const bgKeys = flatten(bg)

    for (const key of KNOWN_ONE_LANGUAGE_KEYS) {
      expect([key, key in enKeys !== key in bgKeys]).toEqual([key, true])
    }
  })

  // BUG: the waste container and drinking fountain cards pass {active, count}. Bulgarian shows
  // "Активни сигнали: 2/5", but English only shows "2 active" and drops the total.
  it.failing('shows the total signal count in English too', () => {
    const enKeys = flatten(en)
    const bgKeys = flatten(bg)

    expect(placeholders(enKeys['wasteContainers.signalsActive'])).toEqual(
      placeholders(bgKeys['wasteContainers.signalsActive'])
    )
  })
})
