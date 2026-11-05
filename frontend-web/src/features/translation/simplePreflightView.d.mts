export type SimplePreflightView = { status: 'READY' | 'BLOCKED' | 'UNKNOWN'; message: string; rows: string[][]; canGenerate: false };
export function simplePreflightView(value?: unknown, errorCode?: string, expectedTarget?: string): SimplePreflightView;
