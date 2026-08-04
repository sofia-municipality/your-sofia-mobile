import type {ContainerState} from './wasteContainer'

export type FountainState = 'notWorking' | 'damaged' | 'dirty' | 'leaking' | 'other'

export interface Signal {
  id: string
  title: string
  description: string
  category:
    | 'waste-container'
    | 'drinking-fountain'
    | 'street-damage'
    | 'lighting'
    | 'green-spaces'
    | 'parking'
    | 'public-transport'
    | 'other'
  cityObject?: {
    type?: 'waste-container' | 'drinking-fountain' | 'street' | 'park' | 'building' | 'other'
    referenceId?: string
    name?: string
  }
  containerState?: ContainerState[]
  fountainState?: FountainState[]
  location?: {
    latitude?: number
    longitude?: number
    address?: string
  }
  images?: {
    id?: number
    url: string
    alt?: string
  }[]
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected'
  adminNotes?: string
  reporterUniqueId?: string
  reporter?: {id: number; email?: string; name?: string} | number
  createdAt: string
  updatedAt: string
}

export interface CreateSignalInput {
  title: string
  description?: string
  category: Signal['category']
  cityObject?: Signal['cityObject']
  containerState?: ContainerState[]
  fountainState?: FountainState[]
  location?: Signal['location']
  reporterUniqueId?: string
}
