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
import {useAuth} from '../../contexts/AuthContext'
import {useTranslation} from 'react-i18next'
import {UserPlus} from 'lucide-react-native'
import {colors, fonts, fontSizes} from '@/styles/tokens'

export default function RegisterScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const {register} = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'))
      return
    }

    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordsDoNotMatch'))
      return
    }

    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.passwordTooShort'))
      return
    }

    setIsLoading(true)
    try {
      await register(name, email, password)
      Alert.alert(t('auth.verifyEmailTitle'), t('auth.verifyEmailMessage'), [
        {
          text: t('auth.login'),
          onPress: () => router.replace('/auth/login'),
        },
      ])
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('auth.registerFailed')
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View style={styles.header}>
            <UserPlus size={48} color={colors.primary} />
            <Text style={styles.title}>{t('auth.register')}</Text>
            <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.name')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.namePlaceholder')}
                value={name}
                onChangeText={setName}
                autoComplete="name"
                textContentType="name"
                autoCorrect={false}
                editable={!isLoading}
                accessibilityLabel={t('auth.name')}
              />
            </View>

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
                textContentType="emailAddress"
                autoCorrect={false}
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
                autoComplete="off"
                textContentType="none"
                autoCorrect={false}
                spellCheck={false}
                importantForAutofill="no"
                editable={!isLoading}
                accessibilityLabel={t('auth.password')}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="off"
                textContentType="none"
                autoCorrect={false}
                spellCheck={false}
                importantForAutofill="no"
                editable={!isLoading}
                accessibilityLabel={t('auth.confirmPassword')}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel={t('auth.register')}
          accessibilityState={{disabled: isLoading}}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.registerButtonText}>{t('auth.register')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.back()}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel={t('auth.login')}
        >
          <Text style={styles.loginLinkText}>
            {t('auth.alreadyHaveAccount')}{' '}
            <Text style={styles.loginLinkHighlight}>{t('auth.login')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 16,
  },
  footer: {
    padding: 24,
    paddingTop: 8,
    backgroundColor: colors.surface,
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
  registerButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: colors.surface,
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
  },
  loginLinkHighlight: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
})
