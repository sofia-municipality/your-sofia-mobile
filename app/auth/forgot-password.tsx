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
import {useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {MailWarning} from 'lucide-react-native'
import {environmentManager} from '../../lib/environment'
import {colors, fonts, fontSizes} from '@/styles/tokens'

export default function ForgotPasswordScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert(t('common.error'), t('auth.enterEmailToResetPassword'))
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${environmentManager.getApiUrl()}/api/users/forgot-password`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const message = body?.message || t('auth.forgotPasswordFailed')
        throw new Error(message)
      }

      setSuccess(true)
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('auth.forgotPasswordFailed')
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <MailWarning size={48} color={colors.primary} />
          <Text style={styles.title}>{t('auth.forgotPassword')}</Text>
          <Text style={styles.subtitle}>{t('auth.forgotPasswordSubtitle')}</Text>
        </View>

        <View style={styles.form}>
          {success ? (
            <View style={styles.successPanel}>
              <Text style={styles.successTitle}>{t('auth.forgotPassword')}</Text>
              <Text style={styles.successMessage}>{t('auth.forgotPasswordSuccess')}</Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.push('/auth/login')}
                accessibilityRole="button"
              >
                <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.email')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="username"
                  importantForAutofill="yes"
                  editable={!isLoading}
                  accessibilityLabel={t('auth.email')}
                />
              </View>

              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel={t('auth.forgotPassword')}
                accessibilityState={{disabled: isLoading}}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.loginButtonText}>{t('auth.forgotPasswordButton')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerLink}
                onPress={() => router.push('/auth/login')}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel={t('auth.login')}
              >
                <Text style={styles.registerLinkText}>
                  {t('auth.alreadyHaveAccount')}{' '}
                  <Text style={styles.registerLinkHighlight}>{t('auth.login')}</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
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
  successPanel: {
    padding: 24,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
})
