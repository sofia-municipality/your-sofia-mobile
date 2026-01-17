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
  ImagePlus,
} from 'lucide-react-native'
import {useTranslation} from 'react-i18next'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {BellActionProvider} from '../../contexts/BellActionContext'
import {TabHeader} from '../../components/TabHeader'

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

  return (
    <Tabs
      initialRouteName="home"
      backBehavior="history"
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'left',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 64 + Math.max(insets.bottom, 8),
        },
        tabBarActiveTintColor: '#1E40AF',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('common.home'),
          tabBarLabel: t('common.home'),
          tabBarIcon: ({color}) => <Home size={24} color={color} />,
          headerTitle: () => <TabHeader title={t('common.goodMorning')} showActionIcon={true} />,
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
          title: t('common.new'),
          tabBarLabel: t('common.new'),
          tabBarIcon: ({color}) => <ImagePlus size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="signals"
        options={{
          title: t('common.signals'),
          tabBarLabel: t('common.signals'),
          tabBarIcon: ({color}) => <AlertTriangle size={24} color={color} />,
          headerTitle: () => (
            <TabHeader title={t('signals.title')} showActionIcon={false} ActionIcon={Plus} />
          ),
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
          title: t('common.profile'),
          tabBarIcon: ({color}) => <User size={24} color={color} />,
          headerTitle: () => (
            <TabHeader title={t('common.profile')} showActionIcon={true} ActionIcon={Edit3} />
          ),
        }}
      />
    </Tabs>
  )
}
