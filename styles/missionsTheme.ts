/**
 * Missions ("Мисии") sub-theme — neon blue / dark "game quest" aesthetic.
 *
 * This is a DELIBERATE exception to the civic-editorial system in
 * `styles/tokens.ts` / `DESIGN.md`, scoped only to the Missions tab, per
 * explicit product request: the dashboard should feel like a video game
 * quest log so power users (teens/gamers) pull the rest of the city in.
 */

export const missionColors = {
  // Backgrounds
  bg: '#0A0E27',
  surface: '#131A3A',
  surfaceElevated: '#1C2452',
  border: '#2A3570',

  // Neon accents
  neonPrimary: '#00E5FF', // cyan — default active/available accent
  neonSecondary: '#7C4DFF', // magenta/purple — level 3 "guardian" accent
  neonGold: '#FFD84D', // XP / dar points
  neonSuccess: '#39FF88', // completed / approved
  neonDanger: '#FF3366', // rejected / returned for improvement

  // Text
  textPrimary: '#E6F1FF',
  textMuted: '#7A88B8',
  textOnNeon: '#031018',
} as const

export const missionLevelColors = {
  'good-first-mission': missionColors.neonSuccess,
  'verified-contributor': missionColors.neonPrimary,
  'verified-guardian': missionColors.neonSecondary,
} as const

export const missionStatusColors: Record<string, string> = {
  draft: missionColors.textMuted,
  open: missionColors.neonPrimary,
  in_progress: missionColors.neonGold,
  ready_for_review: missionColors.neonSecondary,
  returned_for_improvement: missionColors.neonDanger,
  completed: missionColors.neonSuccess,
  cancelled: missionColors.textMuted,
}

export const missionRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  full: 9999,
} as const

export const missionSpacing = {
  '2xs': 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const
