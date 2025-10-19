export interface Signal {
  id: string
  title: string
  description: string
  category:
    | 'waste-container'
    | 'street-damage'
    | 'lighting'
    | 'green-spaces'
    | 'parking'
    | 'public-transport'
    | 'other'
  cityObject?: {
    type?: 'waste-container' | 'street' | 'park' | 'building' | 'other'
    referenceId?: string
    name?: string
  }
  containerState?: Array<'full' | 'dirty' | 'damaged'>
  location?: {
    latitude?: number
    longitude?: number
    address?: string
  }
  images?: Array<{
    id: string
    url: string
    alt?: string
  }>
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected'
  adminNotes?: string
  reporterUniqueId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateSignalInput {
  title: string
  description?: string
  category: Signal['category']
  cityObject?: Signal['cityObject']
  containerState?: Array<'full' | 'dirty' | 'damaged'>
  location?: Signal['location']
  reporterUniqueId?: string
}
