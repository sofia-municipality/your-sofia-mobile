import {z} from 'zod'

export const drinkingFountainFormSchema = z.object({
  address: z.string().min(1, 'newCityObject.addressRequired'),
  isActive: z.boolean(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  // Payload row ids of the optional lookup relationships
  district: z.union([z.number(), z.string()]).optional(),
  source: z.number().optional(),
  status: z.number().optional(),
})

export type DrinkingFountainFormData = z.infer<typeof drinkingFountainFormSchema>

export interface DrinkingFountainFormProps {
  /** Prefills the location fields (e.g. from GPS) until the user edits them. */
  initialLocation?: {latitude: number; longitude: number} | null
  onSubmit: (data: DrinkingFountainFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}
