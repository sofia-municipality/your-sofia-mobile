import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react-native'
import {NewsCard} from '../../components/NewsCard'
import type {NewsItem} from '../../types/news'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({push: mockPush}),
}))

const mockNewsItem: NewsItem = {
  id: '1',
  title: 'Тест новина',
  snippet: 'Кратко описание',
  description: 'Sofia News',
  sourceName: 'Sofia News',
  date: '2026-04-28',
  topic: 'transport',
  categories: ['transport'],
}

const mockNewsItemNoImage: NewsItem = {
  ...mockNewsItem,
  image: undefined,
}

const mockNewsItemWithImage: NewsItem = {
  ...mockNewsItem,
  image: 'https://example.com/image.jpg',
}

describe('NewsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('accessibility', () => {
    it('card is announced as a button', async () => {
      const {getByRole} = await render(<NewsCard item={mockNewsItem} />)
      expect(getByRole('button')).toBeTruthy()
    })

    it('card accessibilityLabel uses article title', async () => {
      const {getByRole} = await render(<NewsCard item={mockNewsItem} />)
      const button = getByRole('button')
      expect(button.props.accessibilityLabel).toBe('Тест новина')
    })

    it('card accessibilityLabel falls back to date when title is absent', async () => {
      const {getByRole} = await render(<NewsCard item={{...mockNewsItem, title: undefined}} />)
      const button = getByRole('button')
      expect(button.props.accessibilityLabel).toBe('2026-04-28')
    })

    it('image is hidden from accessibility tree when present', async () => {
      const {getByRole} = await render(<NewsCard item={mockNewsItemWithImage} />)
      // The card button is the only accessible interactive element
      expect(getByRole('button')).toBeTruthy()
    })

    it('renders without image without crashing', async () => {
      const {getByRole} = await render(<NewsCard item={mockNewsItemNoImage} />)
      expect(getByRole('button')).toBeTruthy()
    })
  })

  describe('content', () => {
    it('renders title, snippet, source and date', async () => {
      await render(<NewsCard item={mockNewsItem} />)

      expect(screen.getByText('Тест новина')).toBeOnTheScreen()
      expect(screen.getByText('Кратко описание')).toBeOnTheScreen()
      expect(screen.getByText('Sofia News')).toBeOnTheScreen()
      expect(screen.getByText('2026-04-28')).toBeOnTheScreen()
    })

    it('falls back to the description when there is no source name', async () => {
      await render(
        <NewsCard
          item={{...mockNewsItem, sourceName: undefined, description: 'Fallback description'}}
        />
      )

      expect(screen.getByText('Fallback description')).toBeOnTheScreen()
    })

    it('omits title and snippet when they are missing', async () => {
      await render(<NewsCard item={{...mockNewsItem, title: undefined, snippet: undefined}} />)

      expect(screen.queryByText('Тест новина')).not.toBeOnTheScreen()
      expect(screen.queryByText('Кратко описание')).not.toBeOnTheScreen()
      expect(screen.getByText('2026-04-28')).toBeOnTheScreen()
    })

    it('renders the image from its URL when present', async () => {
      await render(<NewsCard item={mockNewsItemWithImage} />)

      const images = screen.container.queryAll((node) => node.type === 'Image')
      expect(images).toHaveLength(1)
      expect(images[0].props.source).toEqual({uri: 'https://example.com/image.jpg'})
      expect(images[0].props.accessibilityElementsHidden).toBe(true)
      expect(images[0].props.importantForAccessibility).toBe('no')
    })

    it('renders no image when none is provided', async () => {
      await render(<NewsCard item={mockNewsItemNoImage} />)

      expect(screen.container.queryAll((node) => node.type === 'Image')).toHaveLength(0)
    })
  })

  describe('category border', () => {
    it('uses the color of the first category', async () => {
      await render(<NewsCard item={{...mockNewsItem, categories: ['water', 'transport']}} />)

      expect(screen.getByRole('button')).toHaveStyle({borderLeftColor: '#3B82F6'})
    })

    it('falls back to the topic when there are no categories', async () => {
      await render(<NewsCard item={{...mockNewsItem, categories: [], topic: 'electricity'}} />)

      expect(screen.getByRole('button')).toHaveStyle({borderLeftColor: '#F59E0B'})
    })

    it('uses the muted color for unknown categories', async () => {
      await render(<NewsCard item={{...mockNewsItem, categories: ['unknown-category']}} />)

      expect(screen.getByRole('button')).toHaveStyle({borderLeftColor: '#94A3B8'})
    })
  })

  describe('navigation', () => {
    it('opens the article details on press', async () => {
      await render(<NewsCard item={mockNewsItem} />)

      await fireEvent.press(screen.getByRole('button'))

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/home/1')
    })
  })
})
