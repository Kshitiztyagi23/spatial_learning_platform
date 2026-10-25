import { apiClient } from './client';

export interface FeedbackRequest {
  task_type: 'lego' | 'spatial_perspective_taking';
  /** LEGO puzzle id or park stimulus id (hint limits are per item) */
  item_id: string;
  context?: Record<string, unknown>;
}

/** State of the "Need a hint?" button, as decided by the server. */
export interface HintStatus {
  enabled: boolean;
  unlocked: boolean;
  failed_tries: number;
  unlock_after: number;
  hints_used: number;
  hints_left: number;
}

export interface FeedbackResponse extends HintStatus {
  shown: boolean;
  feedback_id?: string;
  feedback_type?: string;
  message?: string;
  /** Why no hint: not_allowed | locked | limit | cooldown | nothing_to_fix */
  reason?: string;
}

/** The student pressed "Need a hint?". The server checks every rule. */
export async function requestFeedback(sessionId: string, req: FeedbackRequest): Promise<FeedbackResponse> {
  const res = await apiClient.post<FeedbackResponse>(`/sessions/${sessionId}/feedback`, req);
  return res.data;
}

/** Record whether the participant fixed the error after the hint. */
export async function acknowledgeFeedback(sessionId: string, feedbackId: string, corrected: boolean): Promise<void> {
  await apiClient.post(`/sessions/${sessionId}/feedback/${feedbackId}/acknowledge`, { corrected });
}
