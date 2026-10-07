import { apiClient } from './client';

export interface FeedbackRequest {
  task_type: 'lego' | 'spatial_perspective_taking';
  attempt?: number;
  diagnoses?: { code: string; view?: string; area?: string }[];
  correct?: boolean;
  context?: Record<string, unknown>;
}

export interface FeedbackResponse {
  shown: boolean;
  feedback_id?: string;
  feedback_type?: string;
  message?: string;
}

/** Ask the server for a hint. It decides by condition, rule and cooldown,
 *  so callers just show `message` when `shown` is true. */
export async function requestFeedback(sessionId: string, req: FeedbackRequest): Promise<FeedbackResponse> {
  const res = await apiClient.post<FeedbackResponse>(`/sessions/${sessionId}/feedback`, req);
  return res.data;
}

/** Record whether the participant fixed the error after the hint. */
export async function acknowledgeFeedback(sessionId: string, feedbackId: string, corrected: boolean): Promise<void> {
  await apiClient.post(`/sessions/${sessionId}/feedback/${feedbackId}/acknowledge`, { corrected });
}
