export type WasteType =
  | 'general'
  | 'recyclables'
  | 'organic'
  | 'glass'
  | 'paper'
  | 'plastic'
  | 'metal'

export type CapacitySize = 'tiny' | 'small' | 'standard' | 'big' | 'industrial'

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
      return '#DC2626' // Red
    case 'dirty':
      return '#92400E' // Brown
    case 'damaged':
      return '#1F2937' // Black/Dark Gray
    case 'leaves':
      return '#10B981' // Green
    case 'bagged':
      return '#1F2937' // Black
    case 'maintenance':
      return '#F97316' // Orange
    case 'fallen':
      return '#7C3AED' // Purple
    case 'bulkyWaste':
      return '#059669' // Emerald Green
    default:
      return '#1E40AF' // Default Blue
  }
}

export interface WasteContainer {
  id: string
  publicNumber: string
  image?: {
    url: string
    alt?: string
  }
  location: {
    latitude: number
    longitude: number
    address?: string
  }
  capacityVolume: number
  capacitySize: CapacitySize
  binCount?: number
  serviceInterval?: string
  servicedBy?: string
  wasteType: WasteType
  status: 'active' | 'full' | 'maintenance' | 'inactive'
  state?: ContainerState[]
  notes?: string
  lastCleaned?: string
  lastCleanedPhoto?: {
    url: string
    alt?: string
  }
  createdAt: string
  updatedAt: string
}
