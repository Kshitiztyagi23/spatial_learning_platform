import { apiClient } from './client'
import type { SessionCreate, SessionOut, NextStageOut, StageCompleteIn, StageOut } from './types'

export async function createSession(data: SessionCreate): Promise<SessionOut> {
  const res = await apiClient.post<SessionOut>('/sessions', data)
  return res.data
}

export async function getSession(sessionId: string): Promise<SessionOut> {
  const res = await apiClient.get<SessionOut>(`/sessions/${sessionId}`)
  return res.data
}

export async function getNextStage(sessionId: string): Promise<NextStageOut> {
  const res = await apiClient.get<NextStageOut>(`/sessions/${sessionId}/next-stage`)
  return res.data
}

export async function completeStage(sessionId: string, data: StageCompleteIn): Promise<StageOut> {
  const res = await apiClient.post<StageOut>(`/sessions/${sessionId}/stages/${data.stage_name}/complete`, data)
  return res.data
}
