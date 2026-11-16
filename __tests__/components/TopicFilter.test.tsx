import React from 'react'
import {View} from 'react-native'
import {fireEvent, render, screen, within} from '@testing-library/react-native'
import {TopicFilter} from '../../components/TopicFilter'
import type {NewsFilterChip} from '../../types/news'

const TopicIcon = (props: {size?: number; color?: string}) => (
  <View testID="topic-icon" {...props} />
)

const topics: NewsFilterChip[] = [
  {id: 'all', label: 'All', icon: TopicIcon},
  {id: 'water', label: 'Water', icon: TopicIcon},
  {id: 'electricity', label: 'Electricity'},
]

async function renderFilter(selected: string[], onTopicsChange = jest.fn()) {
  await render(
    <TopicFilter
      topics={topics}
      selectedTopics={new Set(selected)}
      onTopicsChange={onTopicsChange}
    />
  )
  return onTopicsChange
}

function lastSelection(onTopicsChange: jest.Mock): string[] {
  const [set] = onTopicsChange.mock.calls[onTopicsChange.mock.calls.length - 1]
  return [...set].sort()
}

describe('TopicFilter', () => {
  describe('rendering', () => {
    it('renders a button for every topic', async () => {
      await renderFilter(['all'])

      expect(screen.getByRole('button', {name: 'All'})).toBeOnTheScreen()
      expect(screen.getByRole('button', {name: 'Water'})).toBeOnTheScreen()
      expect(screen.getByRole('button', {name: 'Electricity'})).toBeOnTheScreen()
    })

    it('marks only the "all" chip as selected when "all" is active', async () => {
      await renderFilter(['all'])

      expect(screen.getByRole('button', {name: 'All'})).toBeSelected()
      expect(screen.getByRole('button', {name: 'Water'})).not.toBeSelected()
      expect(screen.getByRole('button', {name: 'Electricity'})).not.toBeSelected()
    })

    it('marks the individually selected topics', async () => {
      await renderFilter(['water', 'electricity'])

      expect(screen.getByRole('button', {name: 'All'})).not.toBeSelected()
      expect(screen.getByRole('button', {name: 'Water'})).toBeSelected()
      expect(screen.getByRole('button', {name: 'Electricity'})).toBeSelected()
    })

    it('fills a selected chip with its category color', async () => {
      await renderFilter(['water'])

      expect(screen.getByRole('button', {name: 'Water'})).toHaveStyle({
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
      })
    })

    it('fills the selected "all" chip with the primary color', async () => {
      await renderFilter(['all'])

      expect(screen.getByRole('button', {name: 'All'})).toHaveStyle({
        backgroundColor: '#2F54C5',
      })
    })

    it('renders icons only for topics that define one', async () => {
      await renderFilter(['all'])

      expect(screen.getAllByTestId('topic-icon')).toHaveLength(2)
      expect(
        within(screen.getByRole('button', {name: 'Electricity'})).queryByTestId('topic-icon')
      ).not.toBeOnTheScreen()
    })

    it('draws the icon white when selected and in the category color otherwise', async () => {
      await renderFilter(['water'])

      const waterIcon = within(screen.getByRole('button', {name: 'Water'})).getByTestId(
        'topic-icon'
      )
      const allIcon = within(screen.getByRole('button', {name: 'All'})).getByTestId('topic-icon')
      expect(waterIcon.props.color).toBe('#FFFFFF')
      expect(allIcon.props.color).toBe('#2F54C5')
    })
  })

  describe('selection logic', () => {
    it('selects only "all" when "all" is pressed', async () => {
      const onTopicsChange = await renderFilter(['water', 'electricity'])

      await fireEvent.press(screen.getByRole('button', {name: 'All'}))

      expect(lastSelection(onTopicsChange)).toEqual(['all'])
    })

    it('replaces "all" with a topic when a topic is pressed', async () => {
      const onTopicsChange = await renderFilter(['all'])

      await fireEvent.press(screen.getByRole('button', {name: 'Water'}))

      expect(lastSelection(onTopicsChange)).toEqual(['water'])
    })

    it('adds a topic to an existing selection', async () => {
      const onTopicsChange = await renderFilter(['water'])

      await fireEvent.press(screen.getByRole('button', {name: 'Electricity'}))

      expect(lastSelection(onTopicsChange)).toEqual(['electricity', 'water'])
    })

    it('removes an already selected topic', async () => {
      const onTopicsChange = await renderFilter(['water', 'electricity'])

      await fireEvent.press(screen.getByRole('button', {name: 'Water'}))

      expect(lastSelection(onTopicsChange)).toEqual(['electricity'])
    })

    it('falls back to "all" when the last topic is deselected', async () => {
      const onTopicsChange = await renderFilter(['water'])

      await fireEvent.press(screen.getByRole('button', {name: 'Water'}))

      expect(lastSelection(onTopicsChange)).toEqual(['all'])
    })

    it('does not mutate the selection it was given', async () => {
      const selected = new Set(['water'])
      const onTopicsChange = jest.fn()
      await render(
        <TopicFilter topics={topics} selectedTopics={selected} onTopicsChange={onTopicsChange} />
      )

      await fireEvent.press(screen.getByRole('button', {name: 'Electricity'}))

      expect([...selected]).toEqual(['water'])
      expect(onTopicsChange.mock.calls[0][0]).not.toBe(selected)
    })
  })
})
