export const STAGES = [
  'intake_consent',
  'demographics',
  'spatial_experience',
  'ptsot',
  'lego',
  'done',
] as const

export type Stage = typeof STAGES[number]

export const STAGE_ROUTES: Record<Stage, string> = {
  intake_consent: '/',
  demographics: '/demographics',
  spatial_experience: '/experience',
  ptsot: '/ptsot',
  lego: '/lego',
  done: '/done',
}
