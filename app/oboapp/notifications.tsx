import {useState} from 'react'
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {Bell, LogIn, LogOut, UserPlus} from 'lucide-react-native'
import {useTranslation} from 'react-i18next'
import {useOboAppAuth} from '@/contexts/OboAppAuthContext'
import {useNotifications} from '@/hooks/useNotifications'

export default function OboAppNotificationsScreen() {
  const {t} = useTranslation()
  const {user, signIn, register, signOut, isAuthenticated} = useOboAppAuth()
  const {
    isSubscribed,
    isRegistering,
    subscribeToOboApp,
    unsubscribeFromOboApp,
    refreshSubscriptionStatus,
  } = useNotifications()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.loginFailed'))
      return
    }

    try {
      setIsSubmitting(true)
      if (isRegisterMode) {
        await register(email, password)
      } else {
        await signIn(email, password)
      }
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('auth.loginFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const subscriptionLabel =
    isSubscribed === null
      ? t('oboappNotifications.statusUnknown')
      : isSubscribed
        ? t('oboappNotifications.statusSubscribed')
        : t('oboappNotifications.statusNotSubscribed')

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Bell size={48} color="#1E40AF" />
          <Text style={styles.title}>{t('oboappNotifications.title')}</Text>
          <Text style={styles.subtitle}>{t('oboappNotifications.subtitle')}</Text>
        </View>

        {!isAuthenticated ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {isRegisterMode
                ? t('oboappNotifications.registerTitle')
                : t('oboappNotifications.loginTitle')}
            </Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={isSubmitting}
            >
              {isRegisterMode ? (
                <UserPlus size={18} color="#ffffff" />
              ) : (
                <LogIn size={18} color="#ffffff" />
              )}
              <Text style={styles.primaryButtonText}>
                {isRegisterMode ? t('auth.register') : t('auth.login')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setIsRegisterMode((prev) => !prev)}
              disabled={isSubmitting}
            >
              <Text style={styles.linkText}>
                {isRegisterMode
                  ? t('oboappNotifications.haveAccount')
                  : t('oboappNotifications.needAccount')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('oboappNotifications.statusTitle')}</Text>
            <Text style={styles.statusText}>{subscriptionLabel}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.primaryButton, isRegistering && styles.buttonDisabled]}
                onPress={subscribeToOboApp}
                disabled={isRegistering}
              >
                <Bell size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>
                  {t('oboappNotifications.enableNotifications')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={unsubscribeFromOboApp}>
                <Text style={styles.secondaryButtonText}>
                  {t('oboappNotifications.disableNotifications')}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.linkButton} onPress={refreshSubscriptionStatus}>
              <Text style={styles.linkText}>{t('oboappNotifications.refreshStatus')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
              <LogOut size={18} color="#DC2626" />
              <Text style={styles.logoutButtonText}>{t('oboappNotifications.signOut')}</Text>
            </TouchableOpacity>
            {user?.email ? <Text style={styles.userText}>{user.email}</Text> : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    padding: 24,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#64748b',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E40AF',
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5f5',
  },
  secondaryButtonText: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  buttonRow: {
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  userText: {
    textAlign: 'center',
    color: '#64748b',
  },
})
