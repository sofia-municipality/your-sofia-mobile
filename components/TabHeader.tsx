import {View, Text, TouchableOpacity, StyleSheet} from 'react-native'
import {LucideIcon} from 'lucide-react-native'
import {useBellAction} from '../contexts/BellActionContext'
import {uiTokens} from '../styles/common'

interface TabHeaderProps {
  title: string
  showActionIcon?: boolean
  ActionIcon?: LucideIcon
  onActionPress?: () => void
}

export function TabHeader({
  title,
  showActionIcon = false,
  ActionIcon,
  onActionPress,
}: TabHeaderProps) {
  const {triggerBellAction} = useBellAction()

  const handleActionPress = () => {
    if (onActionPress) {
      onActionPress()
    } else {
      triggerBellAction()
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {showActionIcon && ActionIcon && (
        <TouchableOpacity style={styles.actionButton} onPress={handleActionPress}>
          <ActionIcon size={24} color="#6B7280" />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingLeft: uiTokens.spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: uiTokens.colors.textPrimary,
    fontFamily: 'Inter-Bold',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: uiTokens.radius.pill,
    backgroundColor: uiTokens.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: uiTokens.spacing.lg,
    borderWidth: 1,
    borderColor: uiTokens.colors.border,
  },
})
