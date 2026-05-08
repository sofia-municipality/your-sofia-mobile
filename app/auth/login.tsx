import React, {useState} from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import {useRouter, useLocalSearchParams} from 'expo-router'
import {useAuth, AuthApiError} from '../../contexts/AuthContext'
import {useTranslation} from 'react-i18next'
import {LogIn, MailWarning} from 'lucide-react-native'
import {colors, fonts, fontSizes} from '@/styles/tokens'

export default function LoginScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const {returnTo} = useLocalSearchParams<{returnTo?: string}>()
  const {login, resendVerificationEmail} = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUnverified, setIsUnverified] = useState(false)
  const [isResending, setIsResending] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'))
      return
    }

    setIsLoading(true)
    setIsUnverified(false)
    try {
      await login(email, password)
      if (returnTo) {
        router.replace(returnTo as any)
      } else {
        router.back()
      }
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 403) {
        setIsUnverified(true)
      } else {
        Alert.alert(
          t('common.error'),
          error instanceof Error ? error.message : t('auth.loginFailed')
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      Alert.alert(t('common.error'), t('auth.enterEmailToResendVerification'))
      return
    }
    setIsResending(true)
    try {
      await resendVerificationEmail(email)
      Alert.alert(t('auth.verifyEmailTitle'), t('auth.resendVerificationSuccess'))
    } catch {
      Alert.alert(t('common.error'), t('auth.resendVerificationFailed'))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <LogIn size={48} color={colors.primary} />
          <Text style={styles.title}>{t('auth.login')}</Text>
          <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.email')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="username"
              textContentType="username"
              importantForAutofill="yes"
              editable={!isLoading}
              accessibilityLabel={t('auth.email')}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.password')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              importantForAutofill="yes"
              editable={!isLoading}
              accessibilityLabel={t('auth.password')}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={t('auth.login')}
            accessibilityState={{disabled: isLoading}}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
            )}
          </TouchableOpacity>

          {isUnverified && (
            <View style={styles.unverifiedPanel}>
              <MailWarning size={24} color={colors.warning} style={styles.unverifiedIcon} />
              <Text style={styles.unverifiedTitle}>{t('auth.unverifiedAccountTitle')}</Text>
              <Text style={styles.unverifiedMessage}>{t('auth.unverifiedAccountMessage')}</Text>
              <TouchableOpacity
                style={[styles.resendButton, isResending && styles.loginButtonDisabled]}
                onPress={handleResendVerification}
                disabled={isResending}
                accessibilityRole="button"
                accessibilityLabel={t('auth.resendVerificationEmail')}
              >
                {isResending ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.resendButtonText}>{t('auth.resendVerificationEmail')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/auth/register')}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={t('auth.register')}
          >
            <Text style={styles.registerLinkText}>
              {t('auth.dontHaveAccount')}{' '}
              <Text style={styles.registerLinkHighlight}>{t('auth.register')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginTop: 16,
  },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface2,
  },
  loginButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: colors.surface,
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
  },
  registerLinkHighlight: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
  unverifiedPanel: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.warningLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.warning,
    alignItems: 'center',
    gap: 8,
  },
  unverifiedIcon: {
    marginBottom: 4,
  },
  unverifiedTitle: {
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  unverifiedMessage: {
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  resendButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 200,
    alignItems: 'center',
  },
  resendButtonText: {
    color: colors.primary,
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.semiBold,
  },
})
