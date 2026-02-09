import {
  Droplets,
  Zap,
  Flame,
  TrafficCone,
  HardHat,
  Construction,
  Bus,
  ParkingSquare,
  Trash2,
  CloudSun,
  Wind,
  Car,
  Heart,
  Theater,
  Palette,
  Dumbbell,
  Bike,
  CircleDot,
} from 'lucide-react-native'
import type {LucideIcon} from 'lucide-react-native'

/** All OboApp category slugs in display order (matches oboapp/shared/src/schema/category.schema.ts) */
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

export type OboCategory = (typeof CATEGORY_DISPLAY_ORDER)[number]

export const UNCATEGORIZED = 'uncategorized' as const

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  water: Droplets,
  electricity: Zap,
  heating: Flame,
  traffic: TrafficCone,
  'construction-and-repairs': HardHat,
  'road-block': Construction,
  'public-transport': Bus,
  parking: ParkingSquare,
  waste: Trash2,
  weather: CloudSun,
  'air-quality': Wind,
  vehicles: Car,
  health: Heart,
  culture: Theater,
  art: Palette,
  sports: Dumbbell,
  bicycles: Bike,
  uncategorized: CircleDot,
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
  return CATEGORY_ICONS[slug] ?? CircleDot
}

export function getCategoryColor(slug: string): string {
  return CATEGORY_COLORS[slug] ?? '#9CA3AF'
}
