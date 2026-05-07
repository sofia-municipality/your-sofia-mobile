import {Tabs} from 'expo-router'
import {
  Home,
  FileText,
  CreditCard,
  User,
  Plus,
  Edit3,
  MapPin,
  AlertTriangle,
  Bell,
  ChartNoAxesCombined,
  MapPlus,
  ClipboardList,
} from 'lucide-react-native'
import {useTranslation} from 'react-i18next'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {BellActionProvider} from '../../contexts/BellActionContext'
import {TabHeader} from '../../components/TabHeader'
import {useAuth} from '../../contexts/AuthContext'
import {useNotifications} from '../../hooks/useNotifications'
import {colors, fonts, fontSizes} from '@/styles/tokens'

export default function TabLayout() {
  const {t} = useTranslation()

  return (
    <BellActionProvider>
      <TabLayoutContent t={t} />
    </BellActionProvider>
  )
}

function TabLayoutContent({t}: {t: (key: string) => string}) {
  const insets = useSafeAreaInsets()
  const {isContainerAdmin, isAuthenticated, user} = useAuth()
  const {closedSignalsCount} = useNotifications()
  const canAccessNewTab =
    isAuthenticated &&
    (user?.role === 'admin' || user?.role === 'containerAdmin' || user?.role === 'inspector')

  return (
    <Tabs
      initialRouteName="home"
      backBehavior="history"
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'left',
        lazy: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 64 + Math.max(insets.bottom, 8),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: fontSizes.caption,
          fontFamily: fonts.semiBold,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('common.home'),
          tabBarLabel: t('common.home'),
          tabBarIcon: ({color}) => <Home size={24} color={color} />,
          headerTitle: () => <TabHeader title={t('common.newsForYou')} showActionIcon={true} />,
        }}
      />
      <Tabs.Screen
        name="maps"
        options={{
          title: t('common.map'),
          tabBarLabel: t('common.map'),
          tabBarIcon: ({color}) => <MapPin size={24} color={color} />,
          headerTitle: () => <TabHeader title={t('common.map')} />,
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          href: canAccessNewTab ? '/new' : null,
          title: t('common.new'),
          tabBarLabel: t('common.new'),
          tabBarIcon: ({color}) => <MapPlus size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="signals"
        options={{
          title: t('common.signals'),
          tabBarLabel: t('common.signals'),
          tabBarIcon: ({color}) => <AlertTriangle size={24} color={color} />,
          tabBarBadge: closedSignalsCount > 0 ? closedSignalsCount : undefined,
          headerTitle: () => (
            <TabHeader title={t('signals.title')} showActionIcon={false} ActionIcon={Plus} />
          ),
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          href: isContainerAdmin && isAuthenticated ? '/assignments' : null, // Only show for authenticated containerAdmin
          title: t('assignments.title'),
          tabBarLabel: t('assignments.title'),
          tabBarIcon: ({color}) => <ClipboardList size={24} color={color} />,
          headerTitle: () => <TabHeader title={t('assignments.title')} />,
        }}
      />
      {/* HIDDEN - Services Tab */}
      <Tabs.Screen
        name="services"
        options={{
          href: null, // Hide from tab bar
          title: t('common.cityService'),
          tabBarIcon: ({color}) => <FileText size={24} color={color} />,
          headerTitle: () => <TabHeader title={t('common.cityService')} />,
        }}
      />
      {/* HIDDEN - Payments Tab */}
      <Tabs.Screen
        name="payments"
        options={{
          href: null, // Hide from tab bar
          title: t('common.quickServices'),
          tabBarIcon: ({color}) => <CreditCard size={24} color={color} />,
          headerTitle: () => (
            <TabHeader title={t('common.payments')} showActionIcon={true} ActionIcon={Plus} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Hide from tab bar
          title: t('common.profile'),
          tabBarIcon: ({color}) => <User size={24} color={color} />,
          headerTitle: () => (
            <TabHeader title={t('common.profile')} showActionIcon={true} ActionIcon={Edit3} />
          ),
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: t('metrics.title'),
          tabBarLabel: t('metrics.title'),
          tabBarIcon: ({color}) => <ChartNoAxesCombined size={24} color={color} />,
          headerTitle: () => <TabHeader title={t('metrics.title')} />,
        }}
      />
      {/* HIDDEN - Notifications / Subscription Settings */}
      <Tabs.Screen
        name="notifications"
        options={{
          href: null, // Hide from tab bar
          title: t('notifications.title'),
          tabBarIcon: ({color}) => <Bell size={24} color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  )
}
