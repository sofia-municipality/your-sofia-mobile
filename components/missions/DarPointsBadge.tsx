import {View, Text, StyleSheet} from 'react-native'
import {Gem} from 'lucide-react-native'
import {missionColors, missionRadius} from '@/styles/missionsTheme'
import {fonts, fontSizes} from '@/styles/tokens'
import {useTranslation} from 'react-i18next'

/**
 * Shows a darPoints amount with correct Bulgarian pluralization:
 * 1 дар / 2 дара / 3 дара / много дара (never "дарове" — that means gifts).
 */
export function DarPointsBadge({amount, prefix = '+'}: {amount: number; prefix?: string}) {
  const {t} = useTranslation()

  return (
    <View style={styles.badge}>
      <Gem size={14} color={missionColors.neonGold} />
      <Text style={styles.label}>
        {prefix}
        {t('missions.darPoints', {count: amount})}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: missionRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,216,77,0.12)',
    borderWidth: 1,
    borderColor: missionColors.neonGold,
  },
  label: {
    fontFamily: fonts.monoSemiBold,
    fontSize: fontSizes.caption,
    color: missionColors.neonGold,
  },
})
