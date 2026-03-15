import {
  Bike,
  Bus,
  Car,
  CarFront,
  CircleHelp,
  CircleParking,
  CircleSlash,
  CloudRain,
  Construction,
  Drama,
  Droplets,
  Heater,
  Heart,
  Palette,
  Trash2,
  Trophy,
  Wind,
  Zap,
} from 'lucide-react-native'
import type {LucideIcon} from 'lucide-react-native'

export const CATEGORY_DISPLAY_ORDER = [
  'water',
  'electricity',
  'heating',
  'traffic',
  'construction-and-repairs',
  'road-block',
  'public-transport',
  'parking',
  'waste',
  'weather',
  'air-quality',
  'vehicles',
  'health',
  'culture',
  'art',
  'sports',
  'bicycles',
] as const

export const UNCATEGORIZED = 'uncategorized' as const

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  water: Droplets,
  electricity: Zap,
  heating: Heater,
  traffic: CarFront,
  'construction-and-repairs': Construction,
  'road-block': CircleSlash,
  'public-transport': Bus,
  parking: CircleParking,
  waste: Trash2,
  weather: CloudRain,
  'air-quality': Wind,
  vehicles: Car,
  health: Heart,
  culture: Drama,
  art: Palette,
  sports: Trophy,
  bicycles: Bike,
  uncategorized: CircleHelp,
}

const CATEGORY_COLORS: Record<string, string> = {
  water: '#3B82F6',
  electricity: '#F59E0B',
  heating: '#EF4444',
  traffic: '#8B5CF6',
  'construction-and-repairs': '#D97706',
  'road-block': '#DC2626',
  'public-transport': '#10B981',
  parking: '#6366F1',
  waste: '#84CC16',
  weather: '#06B6D4',
  'air-quality': '#14B8A6',
  vehicles: '#64748B',
  health: '#EC4899',
  culture: '#A855F7',
  art: '#F43F5E',
  sports: '#22C55E',
  bicycles: '#0EA5E9',
  uncategorized: '#9CA3AF',
}

export function getCategoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? CircleHelp
}

export function getCategoryColor(slug: string): string {
  return CATEGORY_COLORS[slug] ?? '#9CA3AF'
}
