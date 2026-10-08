export type Condition = 'experimental' | 'control' | 'natural_control' | 'unassigned'

export interface ParticipantCreate {
  name: string
  age: number
  gender: string
  grade: string
  section: string
  roll_no: string
  consent: boolean
}

export interface ParticipantOut {
  id: string
  external_id: string
  participant_code: string | null
  condition: Condition
  created_at: string
}

export interface ParticipantLookupOut {
  participant_id: string
  first_name: string
  status: 'ready' | 'waiting' | 'not_today' | 'complete'
  active_round: number | null
  next_round: number | null
  total_rounds: number
  study_complete: boolean
}

export interface SessionCreate {
  participant_id: string
}

export interface SessionOut {
  id: string
  participant_id: string
  condition: Condition
  current_stage: string
  status: string
  started_at: string
  round_number: number
  total_rounds: number | null
  round_type: 'pre' | 'training' | 'post' | null
  participant_code: string | null
  stages: string[]
  feedback_stages: string[]
  more_rounds: boolean
}

export interface NextStageOut {
  stage_name: string
  config: Record<string, unknown>
}

export interface StageCompleteIn {
  stage_name: string
  payload?: Record<string, unknown>
}

export interface StageOut {
  id: string
  session_id: string
  stage_name: string
  status: string
  completed_at: string | null
}
