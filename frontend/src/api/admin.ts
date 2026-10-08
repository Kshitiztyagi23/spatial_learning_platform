import { apiClient } from './client';
import type { Condition } from './types';

export interface PtsotConfig {
  selected_questions: number[];
  time_limit_seconds: number;
  shuffle: boolean;
}

export interface WindowConfig {
  selected_questions: string[];
  time_limit_seconds: number;   // 0 = untimed
  shuffle: boolean;
}

export interface PerspectiveConfig {
  selected_scenarios: number[];
}

export interface LegoConfig {
  selected_puzzles: string[];
  time_limit_seconds: number;
  ai_hints_enabled: boolean;
}

export interface ConditionSplit {
  experimental: number;
  control: number;
  natural_control: number;
}

export interface RoundPlan {
  stages: string[];
  feedback: string[];
}

export interface RoundSchedule {
  /** Every student, before groups exist (no hints) */
  session_1: RoundPlan;
  /** group -> one plan per session 2..N */
  groups: Record<keyof ConditionSplit, RoundPlan[]>;
}

export interface AssignmentStatus {
  /** Finished session 1, not in a group yet */
  waiting: number;
  group_counts: Record<string, number>;
  split: ConditionSplit;
}

export interface AiStatus {
  enabled: boolean;
  provider: string;
  model: string | null;
}

export interface ProtocolData {
  id: string;
  name: string;
  active: boolean;
  ai_feedback_percentage: number;
  condition_split: ConditionSplit;
  total_rounds: number;
  /** Session being run today; null = students continue at their own pace */
  active_round: number | null;
  /** Label stamped on sessions started while set, e.g. "Session 2 - 15 Oct" */
  run_label: string | null;
  round_schedule: RoundSchedule;
  ai_status?: AiStatus;
  enabled_stages: string[];
  ptsot_config: PtsotConfig;
  window_config: WindowConfig;
  perspective_config: PerspectiveConfig;
  lego_config: LegoConfig;
  updated_at: string;
}

export interface CatalogsData {
  ptsot_questions: { number: number; label: string; standing: string }[];
  window_questions: { id: string; set: 'easy' | 'hard'; number: number; has_answer: boolean }[];
  perspective_scenarios: { id: number; label: string; name: string }[];
  lego_puzzles: { id: string; name: string; tier: string }[];
}

export interface SessionMonitorItem {
  session_id: string;
  participant_id: string;
  external_id: string;
  name: string;
  grade: string;
  section: string;
  roll_no: string;
  condition: Condition;
  participant_code: string | null;
  round_number: number;
  session_label: string | null;
  current_stage: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface SessionsSummary {
  total_participants: number;
  completed: number;
  in_progress: number;
  experimental_count: number;
  control_count: number;
  natural_control_count: number;
  unassigned_count: number;
}

export interface SessionsResponse {
  summary: SessionsSummary;
  sessions: SessionMonitorItem[];
}

export async function verifyPasscode(passcode: string): Promise<{ valid: boolean; token?: string; message?: string }> {
  const res = await apiClient.post('/admin/verify-passcode', { passcode });
  return res.data;
}

export async function getCatalogs(): Promise<CatalogsData> {
  const res = await apiClient.get<CatalogsData>('/admin/catalogs');
  return res.data;
}

export async function getProtocol(): Promise<ProtocolData> {
  const res = await apiClient.get<ProtocolData>('/admin/protocol');
  return res.data;
}

export async function updateProtocol(data: Partial<ProtocolData>): Promise<ProtocolData> {
  const res = await apiClient.put<ProtocolData>('/admin/protocol', data);
  return res.data;
}

export async function getRecommendedSchedule(totalRounds: number): Promise<RoundSchedule> {
  const res = await apiClient.get<RoundSchedule>('/admin/protocol/recommended-schedule', { params: { total_rounds: totalRounds } });
  return res.data;
}

export async function getAssignmentStatus(): Promise<AssignmentStatus> {
  const res = await apiClient.get<AssignmentStatus>('/admin/assignment');
  return res.data;
}

export async function assignGroups(): Promise<{ assigned: Record<string, number>; total: number }> {
  const res = await apiClient.post('/admin/assign-groups');
  return res.data;
}

export async function listSessions(): Promise<SessionsResponse> {
  const res = await apiClient.get<SessionsResponse>('/admin/sessions');
  return res.data;
}

export async function downloadExport(exportType: string): Promise<void> {
  const res = await apiClient.get<Blob>(`/admin/exports/${exportType}`, { responseType: 'blob' });
  const match = /filename=([^;]+)/.exec(res.headers['content-disposition'] ?? '');
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = match?.[1] ?? `${exportType}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
