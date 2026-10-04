import { apiClient } from './client'
import type { ParticipantCreate, ParticipantOut } from './types'

export async function createParticipant(data: ParticipantCreate): Promise<ParticipantOut> {
  const res = await apiClient.post<ParticipantOut>('/participants', data)
  return res.data
}
