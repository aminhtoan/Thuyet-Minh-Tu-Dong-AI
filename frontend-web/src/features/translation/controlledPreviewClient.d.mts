import type { GroupDraft } from './groupTypes';
export const controlledPreviewTarget: Readonly<{ projectId: string; revision: number; digest: string; model: string; thinking: string }>;
export type ControlledPreviewStatus = { state: 'READY' | 'BLOCKED' | 'REQUEST_CONSUMED'; generationEnabled: false; serverReported: boolean; message: string };
export type ControlledPreviewDraft = GroupDraft & { transcriptRevision: number };
export function parseControlledStatus(value: unknown): ControlledPreviewStatus;
export function parseControlledDraft(value: unknown, id: string, now?: number): ControlledPreviewDraft;
export function createControlledPreviewClient(options: { enabled: boolean; origin: string | undefined; projectId: string; getToken: () => string | undefined; fetcher?: typeof fetch }): {
  status(signal?: AbortSignal): Promise<ControlledPreviewStatus>;
  draft(draftId: string, status: ControlledPreviewStatus, signal?: AbortSignal): Promise<ControlledPreviewDraft>;
};
