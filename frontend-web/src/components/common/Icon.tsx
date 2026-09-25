import type { SVGProps } from 'react'

export type IconName = 'dashboard' | 'projects' | 'plus' | 'history' | 'settings' | 'menu' | 'sparkles' | 'eye' | 'eyeOff'

type IconProps = SVGProps<SVGSVGElement> & { name: IconName }

const paths: Record<IconName, string> = {
  dashboard: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
  projects: 'M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-10Z',
  plus: 'M12 5v14M5 12h14',
  history: 'M4.93 4.93A10 10 0 1 1 2 12m0 0V6m0 6h6m4-5v5l3 2',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3a7.8 7.8 0 0 0-.12-1.35l2-1.56-2-3.46-2.48 1A8 8 0 0 0 15.1 5.3L14.72 2h-4l-.38 3.3a8 8 0 0 0-2.3 1.33l-2.48-1-2 3.46 2 1.56A7.8 7.8 0 0 0 5.44 12c0 .46.04.91.12 1.35l-2 1.56 2 3.46 2.48-1a8 8 0 0 0 2.3 1.33l.38 3.3h4l.38-3.3a8 8 0 0 0 2.3-1.33l2.48 1 2-3.46-2-1.56c.08-.44.12-.89.12-1.35Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  sparkles: 'm12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Zm6 10 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13ZM5 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z',
  eye: 'M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff: 'm3 3 18 18M10.6 6.7A9.7 9.7 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a17 17 0 0 1-2.2 2.7M6.2 6.2C3.8 7.7 2.5 12 2.5 12S6 17.5 12 17.5c1.5 0 2.8-.3 4-.8M9.9 9.9a3 3 0 0 0 4.2 4.2',
}

export function Icon({ name, ...props }: IconProps) {
  const isStroke = name === 'plus' || name === 'history' || name === 'menu' || name === 'eyeOff'
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill={isStroke ? 'none' : 'currentColor'} stroke={isStroke ? 'currentColor' : 'none'} strokeWidth={isStroke ? 2 : undefined} strokeLinecap="round" strokeLinejoin="round" {...props}><path d={paths[name]} /></svg>
}
