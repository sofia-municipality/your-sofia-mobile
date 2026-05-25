import {colors} from '@/styles/tokens'

export type WasteType =
  | 'general'
  | 'recyclables'
  | 'organic'
  | 'glass'
  | 'paper'
  | 'plastic'
  | 'metal'
  | 'trashCan'

export type CapacitySize = 'tiny' | 'small' | 'standard' | 'big' | 'industrial'

export type ContainerStatus = 'active' | 'full' | 'maintenance' | 'inactive' | 'pending'

export interface CreateContainerInput {
  publicNumber: string
  wasteType: WasteType
  capacityVolume: number
  capacitySize: CapacitySize
  binCount?: number
  location: {
    latitude: number
    longitude: number
    address?: string
  }
  notes?: string
}

export type ContainerState =
  | 'full'
  | 'dirty'
  | 'damaged'
  | 'leaves'
  | 'maintenance'
  | 'bagged'
  | 'fallen'
  | 'bulkyWaste'

export const CONTAINER_STATES: ContainerState[] = [
  'full',
  'dirty',
  'damaged',
  'leaves',
  'maintenance',
  'bagged',
  'fallen',
  'bulkyWaste',
]

export function getStateColor(state: ContainerState | string): string {
  switch (state) {
    case 'full':
      return colors.error
    case 'dirty':
      return '#92400E' // Brown
    case 'damaged':
      return colors.textPrimary
    case 'leaves':
      return colors.success
    case 'bagged':
      return colors.textPrimary
    case 'maintenance':
      return '#F97316' // Orange
    case 'fallen':
      return '#7C3AED' // Purple
    case 'bulkyWaste':
      return colors.success
    default:
      return colors.primary
  }
}

export interface WasteContainer {
  id: string
  publicNumber: string
  image?: {
    url: string
    alt?: string
  }
  /** [longitude, latitude] tuple as returned by Payload CMS point field */
  location: [number, number]
  /** Derived from location[1] for convenience */
  latitude: number
  /** Derived from location[0] for convenience */
  longitude: number
  address?: string
  capacityVolume: number
  capacitySize: CapacitySize
  binCount?: number
  servicedBy?: string
  wasteType: WasteType
  status: ContainerStatus
  state?: ContainerState[]
  notes?: string
  lastCleaned?: string
  lastCleanedPhoto?: {
    url: string
    alt?: string
  }
  collectionDaysOfWeek?: string[]
  collectionTimesPerDay?: number
  scheduleSource?: string | null
  /** Total signal count — populated by the containers-with-signal-count endpoint */
  signalCount?: number
  /** Active (non-resolved/non-rejected) signal count — populated by containers-with-signal-count */
  activeSignalCount?: number
  createdAt: string
  updatedAt: string
}
