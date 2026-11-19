import React from 'react'
import {Linking} from 'react-native'
import {fireEvent, render, screen} from '@testing-library/react-native'
import NewsDetail from '../../../../app/(tabs)/home/[id]'
import {useUpdateById} from '../../../../hooks/useUpdateById'
import type {NewsItem} from '../../../../types/news'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

let mockParams: {id?: string} = {id: 'n-1'}

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
}))

jest.mock('../../../../hooks/useUpdateById', () => ({
  useUpdateById: jest.fn(),
}))

jest.mock('react-native-markdown-display', () => {
  const {Text} = require('react-native')
  return {
    __esModule: true,
    default: (props: {children: string; onLinkPress: (url: string) => boolean}) => (
      <Text testID="markdown" {...props}>
        {props.children}
      </Text>
    ),
  }
})

const mockUseUpdateById = useUpdateById as jest.Mock

const title = 'Water outage in Lozenets'

const item: NewsItem = {
  id: 'n-1',
  title,
  description: 'Planned maintenance',
  snippet: 'No water until 18:00',
  date: '16 Nov 2026',
  topic: 'water',
  image: 'https://cdn.test/outage.jpg',
  rawText: 'Plain body text',
  sourceUrl: 'https://sofiyskavoda.bg/outage',
}

function withState(state: {newsItem?: NewsItem | null; loading?: boolean; error?: string | null}) {
  mockUseUpdateById.mockReturnValue({newsItem: null, loading: false, error: null, ...state})
}

const images = () => screen.container.queryAll((node) => node.type === 'Image')

let openURL: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  mockParams = {id: 'n-1'}
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
})

describe('NewsDetail', () => {
  it('loads the news item from the route id', async () => {
    withState({newsItem: item})
    mockParams = {id: 'n-42'}

    await render(<NewsDetail />)

    expect(mockUseUpdateById).toHaveBeenCalledWith('n-42')
  })

  it('shows a spinner while loading', async () => {
    withState({loading: true})

    await render(<NewsDetail />)

    expect(screen.container.queryAll((node) => node.type === 'ActivityIndicator')).toHaveLength(1)
    expect(screen.queryByText(title)).toBeNull()
  })

  it('shows the error message', async () => {
    withState({error: 'Not found'})

    await render(<NewsDetail />)

    expect(screen.getByText('Not found')).toBeVisible()
  })

  it('falls back to a generic error when the item is missing', async () => {
    withState({})

    await render(<NewsDetail />)

    expect(screen.getByText('common.error')).toBeVisible()
  })

  it('shows the error even if an old item is still around', async () => {
    withState({newsItem: item, error: 'Offline'})

    await render(<NewsDetail />)

    expect(screen.getByText('Offline')).toBeVisible()
    expect(screen.queryByText(title)).toBeNull()
  })

  it('shows the image, title, date and snippet', async () => {
    withState({newsItem: item})

    await render(<NewsDetail />)

    expect(images()[0].props.source).toEqual({uri: item.image})
    expect(screen.getByText(title)).toBeVisible()
    expect(screen.getByText(item.date)).toBeVisible()
    expect(screen.getByText(item.snippet!)).toBeVisible()
  })

  it('leaves out the parts the item does not have', async () => {
    withState({newsItem: {...item, image: undefined, title: '', snippet: undefined}})

    await render(<NewsDetail />)

    expect(images()).toHaveLength(0)
    expect(screen.queryByText(item.snippet!)).toBeNull()
    expect(screen.getByText(item.date)).toBeVisible()
  })

  it('shows the plain text when there is no markdown', async () => {
    withState({newsItem: item})

    await render(<NewsDetail />)

    expect(screen.getByText('Plain body text')).toBeVisible()
    expect(screen.queryByTestId('markdown')).toBeNull()
  })

  it('renders an empty body when the item has no text at all', async () => {
    withState({newsItem: {...item, rawText: undefined, sourceUrl: undefined}})

    await render(<NewsDetail />)

    expect(screen.getByText(item.date)).toBeVisible()
  })

  it('prefers the markdown body', async () => {
    withState({newsItem: {...item, markdownText: '**Important**'}})

    await render(<NewsDetail />)

    expect(screen.getByTestId('markdown')).toHaveTextContent('**Important**')
    expect(screen.queryByText('Plain body text')).toBeNull()
  })

  it('opens markdown links in the browser instead of inside the renderer', async () => {
    withState({newsItem: {...item, markdownText: '[map](https://maps.test)'}})

    await render(<NewsDetail />)
    const handled = screen.getByTestId('markdown').props.onLinkPress('https://maps.test')

    expect(handled).toBe(false)
    expect(openURL).toHaveBeenCalledWith('https://maps.test')
  })

  it('opens the source link', async () => {
    withState({newsItem: item})

    await render(<NewsDetail />)
    await fireEvent.press(screen.getByText(item.sourceUrl!))

    expect(openURL).toHaveBeenCalledWith(item.sourceUrl)
  })

  it('hides the source link when there is none', async () => {
    withState({newsItem: {...item, sourceUrl: undefined}})

    await render(<NewsDetail />)

    expect(screen.queryByText(item.sourceUrl!)).toBeNull()
  })
})
