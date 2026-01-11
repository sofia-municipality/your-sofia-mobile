import type {ContainerState} from './containerState'

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
  capacitySize: 'tiny' | 'small' | 'standard' | 'big' | 'industrial'
  serviceInterval?: string
  servicedBy?: string
  wasteType: 'general' | 'recyclables' | 'organic' | 'glass' | 'paper' | 'plastic' | 'metal'
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
