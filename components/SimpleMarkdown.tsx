import React from 'react'
import {View, Text, StyleSheet} from 'react-native'
import type {TextStyle} from 'react-native'

interface SimpleMarkdownProps {
  text: string
  style?: TextStyle
}

export function SimpleMarkdown({text, style}: SimpleMarkdownProps) {
  const paragraphs = text.split(/\n\n+/)

  return (
    <View style={styles.container}>
      {paragraphs.map((paragraph, pIndex) => {
        const trimmed = paragraph.trim()
        if (!trimmed) return null

        // Check if it's a bullet list block
        const lines = trimmed.split('\n')
        const isBulletList = lines.every((line) => /^[-*]\s/.test(line.trim()))

        if (isBulletList) {
          return (
            <View key={pIndex} style={styles.list}>
              {lines.map((line, lIndex) => (
                <View key={lIndex} style={styles.listItem}>
                  <Text style={[styles.bullet, style]}>{'  \u2022  '}</Text>
                  <Text style={[styles.text, style, styles.listItemText]}>
                    {renderInline(line.replace(/^[-*]\s+/, ''))}
                  </Text>
                </View>
              ))}
            </View>
          )
        }

        return (
          <Text key={pIndex} style={[styles.text, styles.paragraph, style]}>
            {renderInline(trimmed)}
          </Text>
        )
      })}
    </View>
  )
}

function renderInline(text: string): (string | React.JSX.Element)[] {
  const parts: (string | React.JSX.Element)[] = []
  const boldRegex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <Text key={match.index} style={inlineStyles.bold}>
        {match[1]}
      </Text>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  text: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  paragraph: {},
  list: {
    gap: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  listItemText: {
    flex: 1,
  },
})

const inlineStyles = StyleSheet.create({
  bold: {
    fontWeight: '700',
  },
})
