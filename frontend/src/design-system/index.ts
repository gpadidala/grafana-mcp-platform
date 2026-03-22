// Design system tokens as JS constants for programmatic use (e.g. charts, D3, Canvas)

// ── Colors ────────────────────────────────────────────────────────────────────

export const COLORS = {
  // Backgrounds
  bgCanvas:    '#0b0c0e',
  bgPrimary:   '#111217',
  bgSecondary: '#181b1f',
  bgElevated:  '#1f2229',
  bgOverlay:   '#22262e',

  // Borders
  borderWeak:   '#1e2028',
  borderMedium: '#2c303a',
  borderStrong: '#3d4251',

  // Brand Orange
  primary:      '#f46800',
  primaryHover: '#ff7d20',
  primaryMuted: 'rgba(244,104,0,0.15)',
  primaryGlow:  'rgba(244,104,0,0.35)',

  // AI Electric Blue
  ai:        '#3d9df3',
  aiHover:   '#5eb3ff',
  aiMuted:   'rgba(61,157,243,0.12)',
  aiGlow:    'rgba(61,157,243,0.4)',
  aiPulse:   'rgba(61,157,243,0.6)',

  // Neural Purple
  neural:      '#9d6fd4',
  neuralHover: '#b589f0',
  neuralMuted: 'rgba(157,111,212,0.12)',
  neuralGlow:  'rgba(157,111,212,0.35)',

  // Status
  success: '#73bf69',
  warning: '#f9cb44',
  error:   '#f2495c',
  info:    '#5794f2',

  // Text
  textPrimary:   '#d9dbe2',
  textSecondary: '#9fa7b3',
  textDisabled:  '#5a6070',
  textLink:      '#6e9fff',
  textAI:        '#7bc8ff',
} as const

// ── Spacing ───────────────────────────────────────────────────────────────────

export const SPACING = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const

// ── Shadows ───────────────────────────────────────────────────────────────────

export const SHADOWS = {
  card:        '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
  elevated:    '0 4px 16px rgba(0,0,0,0.5)',
  aiGlow:      '0 0 20px rgba(61,157,243,0.25), 0 0 40px rgba(61,157,243,0.1)',
  neuralGlow:  '0 0 20px rgba(157,111,212,0.25), 0 0 40px rgba(157,111,212,0.1)',
  orangeGlow:  '0 0 16px rgba(244,104,0,0.3)',
} as const

// ── Animations ─────────────────────────────────────────────────────────────────

export const ANIMATIONS = {
  durationFast:   120,   // ms
  durationNormal: 200,   // ms
  durationSlow:   350,   // ms
  easeSpring:     'cubic-bezier(0.34, 1.56, 0.64, 1)',
  easeOut:        'cubic-bezier(0.16, 1, 0.3, 1)',
} as const

// ── Radius ────────────────────────────────────────────────────────────────────

export const RADIUS = {
  sm:   4,
  md:   6,
  lg:   10,
  xl:   16,
  full: 9999,
} as const

// ── Gradients ─────────────────────────────────────────────────────────────────

export const GRADIENTS = {
  ai:      'linear-gradient(135deg, rgba(61,157,243,0.15) 0%, rgba(157,111,212,0.1) 100%)',
  primary: 'linear-gradient(135deg, rgba(244,104,0,0.2) 0%, rgba(244,104,0,0.05) 100%)',
  hero:    'radial-gradient(ellipse at 50% 0%, rgba(61,157,243,0.18) 0%, rgba(157,111,212,0.08) 40%, transparent 70%)',
} as const

// ── Datasource Brand Colors ────────────────────────────────────────────────────

export const DATASOURCE_COLORS = {
  prometheus: '#e6522c',
  loki:       '#FACC15',
  tempo:      '#22D3EE',
  pyroscope:  '#FB923C',
  faro:       '#F472B6',
  k8s:        '#326CE5',
  grafana:    '#f46800',
  mimir:      '#C084FC',
  sql:        '#73bf69',
  mysql:      '#00758f',
  postgres:   '#336791',
  elasticsearch: '#00bfb3',
} as const

// ── Type Exports ──────────────────────────────────────────────────────────────

export type DesignTokens = {
  COLORS: typeof COLORS
  SPACING: typeof SPACING
  SHADOWS: typeof SHADOWS
  ANIMATIONS: typeof ANIMATIONS
  RADIUS: typeof RADIUS
  GRADIENTS: typeof GRADIENTS
  DATASOURCE_COLORS: typeof DATASOURCE_COLORS
}

// Legacy lowercase aliases (backwards compat with existing imports)
export const colors          = COLORS
export const shadows         = SHADOWS
export const gradients       = GRADIENTS
export const durations       = {
  fast:   ANIMATIONS.durationFast,
  normal: ANIMATIONS.durationNormal,
  slow:   ANIMATIONS.durationSlow,
} as const
export const datasourceColors = DATASOURCE_COLORS
