import {z} from 'zod'

const missionTaskSchema = z.object({
  title: z.string().min(1, 'missions.form.taskTitleRequired'),
  instructions: z.string().min(1, 'missions.form.taskInstructionsRequired'),
  acceptanceCriteria: z.string().min(1, 'missions.form.taskAcceptanceCriteriaRequired'),
  requiresBeforePhoto: z.boolean(),
  requiresAfterPhoto: z.boolean(),
})

export const missionFormSchema = z.object({
  title: z.string().min(1, 'missions.form.titleRequired'),
  description: z.string().optional(),
  level: z.enum(['good-first-mission', 'verified-contributor', 'verified-guardian']),
  status: z.enum(['draft', 'open']),
  pointsReward: z.number().min(0, 'missions.form.pointsRewardMin'),
  generalInstructions: z.string().min(1, 'missions.form.generalInstructionsRequired'),
  tasks: z.array(missionTaskSchema).min(1, 'missions.form.tasksRequired'),
})

export type MissionFormData = z.infer<typeof missionFormSchema>

export interface MissionFormProps {
  onSubmit: (data: MissionFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}
