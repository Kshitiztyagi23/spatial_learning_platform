import { apiClient } from './client';

export interface PtsotConfig {
  selected_questions: number[];
  time_limit_seconds: number;
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

export interface ProtocolData {
  id: string;
  name: string;
  active: boolean;
  ai_feedback_percentage: number;
  enabled_stages: string[];
  ptsot_config: PtsotConfig;
  perspective_config: PerspectiveConfig;
  lego_config: LegoConfig;
  updated_at: string;
}

export interface CatalogsData {
  ptsot_questions: { number: number; label: string; standing: string }[];
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
  condition: 'experimental' | 'control';
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

export async function listSessions(): Promise<SessionsResponse> {
  const res = await apiClient.get<SessionsResponse>('/admin/sessions');
  return res.data;
}

export function getExportUrl(exportType: string): string {
  return `/api/v1/admin/exports/${exportType}`;
}
