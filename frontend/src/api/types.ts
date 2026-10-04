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
  condition: 'experimental' | 'control'
  created_at: string
}

export interface SessionCreate {
  participant_id: string
}

export interface SessionOut {
  id: string
  participant_id: string
  condition: 'experimental' | 'control'
  current_stage: string
  status: string
  started_at: string
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
