import {missionFormSchema, type MissionFormData} from '../../../forms/mission/schema'

const task = {
  title: 'Collect litter',
  instructions: 'Pick up all visible litter',
  acceptanceCriteria: 'No litter visible',
  requiresBeforePhoto: true,
  requiresAfterPhoto: true,
}

const valid: MissionFormData = {
  title: 'Clean the playground',
  description: 'Sandbox area',
  level: 'good-first-mission',
  status: 'draft',
  pointsReward: 10,
  generalInstructions: 'Wear gloves',
  tasks: [task],
}

function issuesFor(data: unknown) {
  const result = missionFormSchema.safeParse(data)
  return result.success
    ? []
    : result.error.issues.map((i) => ({path: i.path.join('.'), message: i.message}))
}

describe('missionFormSchema', () => {
  it('accepts a complete mission', () => {
    expect(missionFormSchema.parse(valid)).toEqual(valid)
  })

  it('treats the description as optional', () => {
    const {description, ...rest} = valid

    expect(issuesFor(rest)).toEqual([])
  })

  it.each([
    ['title', 'missions.form.titleRequired'],
    ['generalInstructions', 'missions.form.generalInstructionsRequired'],
  ])('requires %s', (field, message) => {
    expect(issuesFor({...valid, [field]: ''})).toEqual([{path: field, message}])
  })

  it.each(['good-first-mission', 'verified-contributor', 'verified-guardian'])(
    'accepts level "%s"',
    (level) => {
      expect(issuesFor({...valid, level})).toEqual([])
    }
  )

  it('rejects an unknown level', () => {
    expect(issuesFor({...valid, level: 'legendary'})[0].path).toBe('level')
  })

  it('only allows creating draft or open missions', () => {
    expect(issuesFor({...valid, status: 'open'})).toEqual([])
    expect(issuesFor({...valid, status: 'completed'})[0].path).toBe('status')
  })

  it('accepts a zero reward and rejects a negative one', () => {
    expect(issuesFor({...valid, pointsReward: 0})).toEqual([])
    expect(issuesFor({...valid, pointsReward: -1})).toEqual([
      {path: 'pointsReward', message: 'missions.form.pointsRewardMin'},
    ])
  })

  it('requires the reward to be a number', () => {
    expect(issuesFor({...valid, pointsReward: '10'})[0].path).toBe('pointsReward')
  })

  it('requires at least one task', () => {
    expect(issuesFor({...valid, tasks: []})).toEqual([
      {path: 'tasks', message: 'missions.form.tasksRequired'},
    ])
  })

  it.each([
    ['title', 'missions.form.taskTitleRequired'],
    ['instructions', 'missions.form.taskInstructionsRequired'],
    ['acceptanceCriteria', 'missions.form.taskAcceptanceCriteriaRequired'],
  ])('requires task %s', (field, message) => {
    expect(issuesFor({...valid, tasks: [task, {...task, [field]: ''}]})).toEqual([
      {path: `tasks.1.${field}`, message},
    ])
  })

  it('requires both photo flags on every task', () => {
    const {requiresAfterPhoto, ...partialTask} = task

    expect(issuesFor({...valid, tasks: [partialTask]})[0].path).toBe('tasks.0.requiresAfterPhoto')
  })
})
