import type { GroupDraft } from './groupTypes';
export const controlledPreviewTarget: Readonly<{ model: string; thinking: string }>;
export type ControlledPreviewBinding = { projectId: string; revision: number; digest: string };
export type ControlledPreviewStatus = { state: 'READY' | 'BLOCKED' | 'REQUEST_CONSUMED'; generationEnabled: false; serverReported: boolean; message: string; scope?: ControlledPreviewBinding };
export type ControlledPreviewDraft = GroupDraft & { transcriptRevision: number };
export function parseControlledStatus(value: unknown, projectId: string): ControlledPreviewStatus;
export function parseControlledDraft(value: unknown, id: string, binding: ControlledPreviewBinding, now?: number): ControlledPreviewDraft;
export function createControlledPreviewClient(options: { enabled: boolean; origin: string | undefined; projectId: string; getToken: () => string | undefined; fetcher?: typeof fetch }): {
  status(signal?: AbortSignal): Promise<ControlledPreviewStatus>;
  draft(draftId: string, status: ControlledPreviewStatus, signal?: AbortSignal): Promise<ControlledPreviewDraft>;
};
