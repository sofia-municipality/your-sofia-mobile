import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react-native'
import {NewsMap} from '../../components/NewsMap'
import type {NewsItem} from '../../types/news'

jest.mock('react-native-maps', () => {
  const {View} = require('react-native')
  return {
    __esModule: true,
    default: (props: object) => <View testID="map-view" {...props} />,
    Marker: (props: object) => <View testID="news-marker" {...props} />,
  }
})

const baseItem: NewsItem = {
  id: '1',
  title: 'Water outage',
  description: 'Planned maintenance',
  date: '2026-04-28',
  topic: 'water',
  categories: ['water'],
  location: {latitude: 42.69, longitude: 23.32},
}

const news: NewsItem[] = [
  baseItem,
  {
    ...baseItem,
    id: '2',
    title: 'Power cut',
    categories: undefined,
    topic: 'electricity',
    location: {latitude: 42.7, longitude: 23.33},
  },
  {...baseItem, id: '3', title: 'City-wide notice', location: undefined},
]

function getMarkerBubble(marker: ReturnType<typeof screen.getByTestId>) {
  // Marker -> container -> [bubble, pointer]
  const container = marker.children[0] as typeof marker
  return {
    bubble: container.children[0] as typeof marker,
    pointer: container.children[1] as typeof marker,
  }
}

describe('NewsMap', () => {
  it('centers the map on Sofia', async () => {
    await render(<NewsMap news={[]} />)

    expect(screen.getByTestId('map-view').props.initialRegion).toEqual({
      latitude: 42.6977,
      longitude: 23.3219,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    })
  })

  it('renders a marker only for news items with a location', async () => {
    await render(<NewsMap news={news} />)

    const markers = screen.getAllByTestId('news-marker')
    expect(markers).toHaveLength(2)
    expect(markers.map((m) => m.props.title)).toEqual(['Water outage', 'Power cut'])
  })

  it('places markers at the item coordinates with title and description', async () => {
    await render(<NewsMap news={[baseItem]} />)

    const marker = screen.getByTestId('news-marker')
    expect(marker.props.coordinate).toEqual({latitude: 42.69, longitude: 23.32})
    expect(marker.props.title).toBe('Water outage')
    expect(marker.props.description).toBe('Planned maintenance')
  })

  it('colors the marker by its first category', async () => {
    await render(<NewsMap news={[baseItem]} />)

    const {bubble, pointer} = getMarkerBubble(screen.getByTestId('news-marker'))
    expect(bubble).toHaveStyle({backgroundColor: '#3B82F6'})
    expect(pointer).toHaveStyle({borderTopColor: '#3B82F6'})
  })

  it('falls back to the topic color when the item has no categories', async () => {
    await render(<NewsMap news={[news[1]]} />)

    const {bubble} = getMarkerBubble(screen.getByTestId('news-marker'))
    expect(bubble).toHaveStyle({backgroundColor: '#F59E0B'})
  })

  it('calls onMarkerPress with the pressed item', async () => {
    const onMarkerPress = jest.fn()
    await render(<NewsMap news={news} onMarkerPress={onMarkerPress} />)

    await fireEvent.press(screen.getAllByTestId('news-marker')[1])

    expect(onMarkerPress).toHaveBeenCalledWith(news[1])
  })

  it('tolerates marker presses without an onMarkerPress handler', async () => {
    await render(<NewsMap news={news} />)

    await expect(fireEvent.press(screen.getAllByTestId('news-marker')[0])).resolves.not.toThrow()
  })

  it('reports bounds and zoom when the region changes', async () => {
    const onBoundsChange = jest.fn()
    await render(<NewsMap news={news} onBoundsChange={onBoundsChange} />)

    await fireEvent(screen.getByTestId('map-view'), 'regionChangeComplete', {
      latitude: 42.7,
      longitude: 23.3,
      latitudeDelta: 0.1,
      longitudeDelta: 0.2,
    })

    expect(onBoundsChange).toHaveBeenCalledTimes(1)
    const [bounds, zoom] = onBoundsChange.mock.calls[0]
    expect(bounds.north).toBeCloseTo(42.75)
    expect(bounds.south).toBeCloseTo(42.65)
    expect(bounds.east).toBeCloseTo(23.4)
    expect(bounds.west).toBeCloseTo(23.2)
    expect(zoom).toBeCloseTo(Math.log2(360 / 0.2))
  })

  it('ignores region changes without an onBoundsChange handler', async () => {
    await render(<NewsMap news={news} />)

    await expect(
      fireEvent(screen.getByTestId('map-view'), 'regionChangeComplete', {
        latitude: 42.7,
        longitude: 23.3,
        latitudeDelta: 0.1,
        longitudeDelta: 0.2,
      })
    ).resolves.not.toThrow()
  })
})
