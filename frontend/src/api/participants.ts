import { apiClient } from './client'
import type { ParticipantCreate, ParticipantLookupOut, ParticipantOut, SessionOut } from './types'

/** The details form in one request: participant + session 1 + consent and
 *  details recorded. Returns the session already moved past them. */
export async function intake(
  data: ParticipantCreate & { demographics: Record<string, unknown> }
): Promise<{ participant: ParticipantOut; session: SessionOut }> {
  const res = await apiClient.post('/participants/intake', data)
  return res.data
}

/** A returning student's code -> who they are and which round is next. */
export async function lookupParticipant(code: string): Promise<ParticipantLookupOut> {
  const res = await apiClient.post<ParticipantLookupOut>('/participants/lookup', { code })
  return res.data
}
