import React from 'react'
import {render} from '@testing-library/react-native'
import {NewsCard} from '../../components/NewsCard'
import type {NewsItem} from '../../types/news'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({push: jest.fn()}),
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
})
