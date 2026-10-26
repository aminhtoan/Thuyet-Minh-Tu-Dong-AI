import type { SVGProps } from 'react';
const paths = {
  wave: 'M2 10v4m4-8v12m4-15v18m4-13v8m4-11v14m4-9v4',
  dashboard: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 1a4 4 0 0 1 0 7m5 10v-2a4 4 0 0 0-3-3.87',
  projects: 'M3 7V5h7l2 2h9v13H3V7Z',
  jobs: 'M3 12h4l3-8 4 16 3-8h4',
  languages: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2c-6 5-6 15 0 20 6-5 6-15 0-20Z',
  voices: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-4 6v1a7 7 0 0 0 14 0v-1m-7 8v3m-4 0h8',
  logs: 'M8 4H4v18h16V4h-4M8 2h8v4H8V2Zm0 9h8m-8 5h8',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 2h6l1 3 3 1 3 5v2l-3 5-3 1-1 3H9l-1-3-3-1-3-5v-2l3-5 3-1 1-3Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  alert: 'M12 8v5m0 4h.01M3 21h18L12 3 3 21Z',
  check: 'm5 12 4 4L19 6',
  search: 'm21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  lock: 'M6 10V7a6 6 0 0 1 12 0v3M5 10h14v11H5V10Z',
  userPlus: 'M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm11 5v6m-3-3h6',
  qr: 'M3 3h6v6H3V3Zm12 0h6v6h-6V3ZM3 15h6v6H3v-6Zm14 0v3m0 3h3m-3-3h3m-6-3v6m3-6h.01M6 6h.01M18 6h.01M6 18h.01',
  refresh: 'M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8m0 0V3m0 5h5m-5 4a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16m0 0v5m0-5h-5',
} as const;
export type IconName = keyof typeof paths;
// Same lightweight inline-SVG approach as Customer; no runtime cross-app import.
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
