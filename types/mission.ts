export type MissionLevel = 'good-first-mission' | 'verified-contributor' | 'verified-guardian'

export type MissionStatus =
  | 'draft'
  | 'open'
  | 'in_progress'
  | 'ready_for_review'
  | 'returned_for_improvement'
  | 'completed'
  | 'cancelled'

export interface MissionMediaRef {
  id?: number
  url?: string
  alt?: string
}

export interface MissionTask {
  id: string
  title: string
  instructions: string
  acceptanceCriteria: string
  requiresBeforePhoto?: boolean
  requiresAfterPhoto?: boolean
  beforePhoto?: MissionMediaRef | number | null
  afterPhoto?: MissionMediaRef | number | null
  completedByCitizenAt?: string | null
}

export interface Mission {
  id: string
  signal: string | number
  title: string
  description?: string
  level: MissionLevel
  status: MissionStatus
  pointsReward: number
  pointsAwarded?: number | null
  generalInstructions: string
  tasks: MissionTask[]
  missionBeforePhotos?: MissionMediaRef[]
  missionAfterPhotos?: MissionMediaRef[]
  inspector?: {id: number; name?: string} | number
  citizen?: {id: number; name?: string} | number | null
  claimedAt?: string | null
  submittedForReviewAt?: string | null
  reviewedAt?: string | null
  completedAt?: string | null
  inspectorReviewNotes?: string
  communityConsensus?: 'none' | 'trusted_verified' | 'peer_verified' | 'disputed'
  // Server-computed, only present on `/api/missions/feed` responses.
  locked?: boolean
  unlockRequirement?: string
  createdAt: string
  updatedAt: string
}

export interface MissionsFeedResponse {
  missions: Mission[]
  completedMissionsCount: number
  contributorLevel: 'beginner' | 'contributor' | 'guardian'
}

export interface MissionVerification {
  id: string
  mission: string | number
  verifier: {id: number; name?: string} | number
  decision: 'approve' | 'reject'
  comment?: string
  createdAt: string
}
