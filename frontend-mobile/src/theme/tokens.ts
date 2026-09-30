export const colors = {
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  primaryLight: '#EFF6FF',
  background: '#F6F8FC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  textPrimary: '#172033',
  textSecondary: '#526079',
  textMuted: '#7B879D',
  border: '#DFE5EF',
  success: '#15803D',
  successLight: '#F0FDF4',
  warning: '#B45309',
  warningLight: '#FFFBEB',
  error: '#C62828',
  errorLight: '#FEF2F2',
  info: '#0369A1',
  infoLight: '#F0F9FF',
  white: '#FFFFFF',
  sidebar: '#111C32',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 6, md: 8, lg: 8, xl: 12, full: 999 } as const;
export const typography = {
  size: { sm: 14, md: 16, lg: 18, xl: 24, xxl: 32 },
  weight: { medium: '500', semibold: '600', bold: '700' },
  lineHeight: { tight: 1.25, normal: 1.5 },
} as const;
export const shadows = {
  sm: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 },
} as const;
