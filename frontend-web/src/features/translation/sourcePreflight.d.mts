export const sourceLimitMessage: string;
export type SourcePreflightView = { message: string; blocked: boolean; canGenerate: false; bytes?: number | null; segments?: number | null; atLeast?: number | null; cap?: number; segmentLimit?: number; notice?: string };
export function sourcePreflightView(value?: unknown, errorCode?: string): SourcePreflightView;
