import {z} from 'zod'
import type {WasteContainer} from '../../types/wasteContainer'

export const wasteContainerFormSchema = z.object({
  publicNumber: z.string().min(1, 'newCityObject.publicNumberRequired'),
  wasteType: z.enum(['general', 'recyclables', 'organic', 'glass', 'paper', 'plastic', 'metal']),
  capacityVolume: z.number().min(0.1, 'newCityObject.capacityRequired'),
  capacitySize: z.enum(['tiny', 'small', 'standard', 'big', 'industrial']),
  binCount: z.number().min(1).optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
  notes: z.string().optional(),
})

export type WasteContainerFormData = z.infer<typeof wasteContainerFormSchema>

export interface WasteContainerFormProps {
  container?: WasteContainer
  onSubmit: (data: WasteContainerFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  isEditing?: boolean
  canEdit?: boolean
}
