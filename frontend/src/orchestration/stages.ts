export const STAGES = [
  'intake_consent',
  'demographics',
  'spatial_experience',
  'ptsot',
  'spatial_perspective_taking',
  'lego',
  'done',
] as const

export type Stage = typeof STAGES[number]

export const STAGE_ROUTES: Record<Stage, string> = {
  intake_consent: '/',
  demographics: '/demographics',
  spatial_experience: '/experience',
  ptsot: '/ptsot',
  spatial_perspective_taking: '/perspective',
  lego: '/lego',
  done: '/done',
}
