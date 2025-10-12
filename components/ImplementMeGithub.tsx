import React, {useState} from 'react'
import {TouchableOpacity, Modal, View, Text, StyleSheet, Linking, Pressable} from 'react-native'
import {GitHubIcon} from './GitHubIcon'
import {useTranslation} from 'react-i18next'
import {X} from 'lucide-react-native'

/**
 * ImplementMeGithub Component
 *
 * A clickable GitHub icon that displays a modal explaining that the feature
 * is a demo/placeholder and links to a GitHub issue for implementation.
 *
 * @example
 * ```tsx
 * import {ImplementMeGithub} from '@/components/ImplementMeGithub'
 *
 * // In your component:
 * <ImplementMeGithub issueUrl="https://github.com/sofia-municipality/your-sofia/issues/123" />
 * ```
 */

interface ImplementMeGithubProps {
  issueUrl: string
}

export function ImplementMeGithub({issueUrl}: ImplementMeGithubProps) {
  const {t} = useTranslation()
  const [showCallout, setShowCallout] = useState(false)

  const handlePress = () => {
    setShowCallout(true)
  }

  const handleClose = () => {
    setShowCallout(false)
  }

  const handleLinkPress = () => {
    Linking.openURL(issueUrl)
    setShowCallout(false)
  }

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={styles.iconButton}>
        <GitHubIcon size={18} color="#6B7280" />
      </TouchableOpacity>

      <Modal visible={showCallout} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.callout} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.content}>
              <GitHubIcon size={18} color="#6B7280" />
              <Text style={styles.message}>{t('common.implementMeMessage')}</Text>
              <TouchableOpacity style={styles.linkButton} onPress={handleLinkPress}>
                <Text style={styles.linkText}>{issueUrl}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  callout: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  message: {
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 24,
  },
  linkButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  linkText: {
    fontSize: 14,
    color: '#1E40AF',
    textDecorationLine: 'underline',
  },
})
