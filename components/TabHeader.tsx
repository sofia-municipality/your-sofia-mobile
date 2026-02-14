import {View, Text, TouchableOpacity, StyleSheet} from 'react-native'
import {Bell, LucideIcon} from 'lucide-react-native'
import {useBellAction} from '../contexts/BellActionContext'
import {useNotifications} from '../hooks/useNotifications'
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
  const {unreadCount, clearUnreadCount} = useNotifications()

  const handleActionPress = () => {
    if (onActionPress) {
      onActionPress()
    } else if (ActionIcon === Bell) {
      // Bell-specific behavior: clear notifications and trigger action
      clearUnreadCount()
      triggerBellAction()
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
          {ActionIcon === Bell && unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
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
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: uiTokens.colors.danger,
    borderRadius: uiTokens.radius.pill,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: uiTokens.colors.surface,
  },
  notificationBadgeText: {
    color: uiTokens.colors.surface,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
})
