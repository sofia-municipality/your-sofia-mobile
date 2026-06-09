import {useCallback} from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import {useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {Newspaper} from 'lucide-react-native'
import {markWhatsNewSeen, getCurrentAppVersion} from '@/lib/whatsNew'
import {useWhatsNew} from '@/hooks/useWhatsNew'
import {colors, fonts, fontSizes, radius, spacing} from '@/styles/tokens'

export default function WhatsNewScreen() {
  const {t} = useTranslation()
  const router = useRouter()
  const version = getCurrentAppVersion()
  const {items, loading} = useWhatsNew()

  const handleContinue = useCallback(async () => {
    await markWhatsNewSeen()
    router.replace('/(tabs)/home')
  }, [router])

  return (
    <View style={styles.overlay}>
      {/* Backdrop — tap to dismiss */}
      <TouchableOpacity style={styles.backdrop} onPress={handleContinue} activeOpacity={1} />

      {/* Bottom sheet — ~2/3 of screen */}
      <View style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.handle} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Logo + wordmark */}
          <View style={styles.header}>
            <Image
              source={require('../assets/images/sofia-gerb.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Твоята София"
            />
            <Text style={styles.wordmark}>Твоята София</Text>
            <Text style={styles.versionTag}>
              {t('whatsNew.version')} {version}
            </Text>
          </View>

          {/* Heading */}
          <Text style={styles.title}>{t('whatsNew.title')}</Text>

          {/* News items from API */}
          {loading ? (
            <ActivityIndicator color="#2F54C5" style={styles.loader} />
          ) : (
            <View style={styles.features}>
              {items.map((item) => (
                <View key={item.id} style={styles.featureRow}>
                  <Newspaper size={20} color="#2F54C5" style={styles.featureIcon} />
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.featureDescription}>{item.description}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* CTA — outside ScrollView so it sticks to bottom of sheet */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('whatsNew.continue')}
          >
            <Text style={styles.continueText}>{t('whatsNew.continue')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    height: '67%',
    paddingTop: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 56,
    height: 56,
    marginBottom: spacing.xs,
  },
  wordmark: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  versionTag: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.caption,
    color: colors.textMuted,
    marginTop: spacing['2xs'],
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  features: {
    gap: spacing.md,
  },
  loader: {
    marginTop: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    marginBottom: spacing['2xs'],
  },
  featureDescription: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.bodySm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  continueText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.body,
    color: colors.surface,
    letterSpacing: 0.1,
  },
})
