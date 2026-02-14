import {StyleSheet} from 'react-native'

export const uiTokens = {
  colors: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceMuted: '#F3F4F6',
    border: '#E5E7EB',
    textPrimary: '#1F2937',
    textSecondary: '#4B5563',
    textMuted: '#6B7280',
    primary: '#1E40AF',
    primarySoft: '#EFF6FF',
    danger: '#DC2626',
    dangerSoft: '#FEE2E2',
    warning: '#D97706',
    warningSoft: '#FEF3C7',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },
  shadow: {
    card: {
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
  },
}

export const commonStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: uiTokens.spacing.xl,
    paddingTop: uiTokens.spacing.lg,
    paddingBottom: uiTokens.spacing.lg,
    backgroundColor: uiTokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: uiTokens.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: uiTokens.colors.textPrimary,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: uiTokens.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screen: {
    flex: 1,
    backgroundColor: uiTokens.colors.background,
  },
  screenContent: {
    paddingHorizontal: uiTokens.spacing.xl,
    paddingVertical: uiTokens.spacing.lg,
  },
  section: {
    marginTop: uiTokens.spacing.lg,
  },
  card: {
    backgroundColor: uiTokens.colors.surface,
    borderRadius: uiTokens.radius.md,
    borderWidth: 1,
    borderColor: uiTokens.colors.border,
    ...uiTokens.shadow.card,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: uiTokens.spacing.md,
    paddingVertical: uiTokens.spacing.sm,
    borderRadius: uiTokens.radius.pill,
    backgroundColor: uiTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: uiTokens.colors.border,
  },
})
