import {StyleSheet} from 'react-native'
import {colors, fonts, fontSizes, radius, spacing} from '@/styles/tokens'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.body,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.caption,
    fontFamily: fonts.regular,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.medium,
  },
  chipTextSelected: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
  taskCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
  },
  taskToggleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  taskToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  taskToggleSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  taskToggleText: {
    color: colors.textSecondary,
    fontSize: fontSizes.caption,
    fontFamily: fonts.medium,
  },
  taskToggleTextSelected: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
  addTaskButton: {
    marginTop: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTaskText: {
    color: colors.primary,
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.semiBold,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
  },
  removeTaskButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  removeTaskButtonText: {
    color: colors.error,
    fontSize: fontSizes.caption,
    fontFamily: fonts.semiBold,
  },
})
