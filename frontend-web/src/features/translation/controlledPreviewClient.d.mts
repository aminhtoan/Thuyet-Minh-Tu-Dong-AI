import type { GroupDraft } from './groupTypes';
export const controlledPreviewTarget: Readonly<{ model: string; thinking: string }>;
export type ControlledPreviewBinding = { projectId: string; revision: number; digest: string };
export type ControlledPreviewStatus = { state: 'READY' | 'BLOCKED' | 'REQUEST_CONSUMED'; generationEnabled: false; serverReported: boolean; message: string; scope?: ControlledPreviewBinding };
export type ControlledPreviewDraft = GroupDraft & { transcriptRevision: number };
export type ExecutionReadiness = { state: 'LOCKED' | 'READY' | 'EXPIRED' | 'CONSUMED' | 'MISMATCHED' | 'BLOCKED'; executionAllowed: boolean; authorizationId?: string; expiresAt?: number; scope?: ControlledPreviewBinding; source?: { segmentCount: number; groupCount: number; coverage: number } };
export function parseExecutionReadiness(value: unknown, projectId: string): ExecutionReadiness;
export function parseControlledStatus(value: unknown, projectId: string): ControlledPreviewStatus;
export function parseControlledDraft(value: unknown, id: string, binding: ControlledPreviewBinding, now?: number): ControlledPreviewDraft;
export function createControlledPreviewClient(options: { enabled: boolean; executionEnabled?: boolean; origin: string | undefined; projectId: string; getToken: () => string | undefined; fetcher?: typeof fetch }): {
  readiness(signal?: AbortSignal): Promise<ExecutionReadiness>;
  execute(readiness: ExecutionReadiness, confirmed: boolean, signal?: AbortSignal): Promise<ControlledPreviewDraft>;
  status(signal?: AbortSignal): Promise<ControlledPreviewStatus>;
  draft(draftId: string, status: ControlledPreviewStatus, signal?: AbortSignal): Promise<ControlledPreviewDraft>;
};
