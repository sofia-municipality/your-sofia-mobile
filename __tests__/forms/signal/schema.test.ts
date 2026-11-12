import {signalFormSchema, type SignalFormData} from '../../../forms/signal/schema'

const valid: SignalFormData = {
  title: 'Overflowing container',
  description: 'Bags on the pavement',
  containerState: ['full', 'dirty'],
  photos: [
    {id: 12, uri: 'https://cdn.test/1.jpg', isNew: false},
    {uri: 'file:///new.jpg', isNew: true},
  ],
}

function issuesFor(data: unknown) {
  const result = signalFormSchema.safeParse(data)
  return result.success
    ? []
    : result.error.issues.map((i) => ({path: i.path.join('.'), message: i.message}))
}

describe('signalFormSchema', () => {
  it('accepts a complete signal', () => {
    expect(signalFormSchema.parse(valid)).toEqual(valid)
  })

  it('only requires a title', () => {
    expect(issuesFor({title: 'Broken bench'})).toEqual([])
  })

  it('rejects an empty title', () => {
    expect(issuesFor({...valid, title: ''})).toEqual([
      {path: 'title', message: 'signals.validation.titleRequired'},
    ])
  })

  it('requires a URI for every photo', () => {
    expect(issuesFor({...valid, photos: [{id: 1, isNew: false}]})[0].path).toBe('photos.0.uri')
  })

  it('requires container states to be strings', () => {
    expect(issuesFor({...valid, containerState: [1]})[0].path).toBe('containerState.0')
  })
})
