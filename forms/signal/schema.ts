import {z} from 'zod'
import type {Signal} from '../../types/signal'

export const signalFormSchema = z.object({
  title: z.string().min(1, 'signals.validation.titleRequired'),
  description: z.string().optional(),
  containerState: z.array(z.string()).optional(),
})

export type SignalFormData = z.infer<typeof signalFormSchema>

export interface SignalFormProps {
  signal: Signal
  onSubmit: (data: SignalFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  isEditing?: boolean
  canEdit?: boolean
}
