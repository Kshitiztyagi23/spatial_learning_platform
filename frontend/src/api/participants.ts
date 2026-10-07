import { apiClient } from './client'
import type { ParticipantCreate, ParticipantLookupOut, ParticipantOut } from './types'

export async function createParticipant(data: ParticipantCreate): Promise<ParticipantOut> {
  const res = await apiClient.post<ParticipantOut>('/participants', data)
  return res.data
}

/** A returning student's code -> who they are and which round is next. */
export async function lookupParticipant(code: string): Promise<ParticipantLookupOut> {
  const res = await apiClient.post<ParticipantLookupOut>('/participants/lookup', { code })
  return res.data
}
