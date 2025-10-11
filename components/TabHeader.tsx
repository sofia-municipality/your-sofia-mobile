import {View, Text, TouchableOpacity, StyleSheet} from 'react-native'
import {Bell, LucideIcon} from 'lucide-react-native'
import {useNotifications} from '../hooks/useNotifications'
import {useBellAction} from '../contexts/BellActionContext'

interface TabHeaderProps {
  title: string
  showActionIcon?: boolean
  ActionIcon?: LucideIcon
  onActionPress?: () => void
}

export function TabHeader({
  title,
  showActionIcon = false,
  ActionIcon = Bell,
  onActionPress,
}: TabHeaderProps) {
  const {unreadCount, clearUnreadCount} = useNotifications()
  const {triggerBellAction} = useBellAction()

  const handleActionPress = () => {
    if (onActionPress) {
      onActionPress()
    } else if (ActionIcon === Bell) {
      // Default bell behavior
      clearUnreadCount()
      triggerBellAction()
    }
  }

  const Icon = ActionIcon

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {showActionIcon && (
        <TouchableOpacity style={styles.actionButton} onPress={handleActionPress}>
          <Icon size={24} color="#6B7280" />
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
    paddingLeft: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'Inter-Bold',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 16,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
})
