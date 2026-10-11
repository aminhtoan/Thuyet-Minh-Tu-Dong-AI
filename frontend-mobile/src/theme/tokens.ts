export const colors = {
  primary: '#5850EC',
  primaryPressed: '#3730A3',
  primaryLight: '#F0EEFF',
  accent: '#794CFF',
  accentLight: '#EEE9FF',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#15803D',
  successLight: '#F0FDF4',
  warning: '#B45309',
  warningLight: '#FFFBEB',
  error: '#C62828',
  errorLight: '#FEF2F2',
  info: '#0369A1',
  infoLight: '#F0F9FF',
  white: '#FFFFFF',
  sidebar: '#FAF9FF',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 6, md: 10, lg: 12, xl: 20, full: 999 } as const;
export const typography = {
  size: { sm: 14, md: 16, lg: 18, xl: 24, xxl: 32 },
  weight: { medium: '500', semibold: '600', bold: '700' },
  lineHeight: { tight: 20, normal: 24 },
} as const;
export const shadows = {
  sm: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 },
} as const;
