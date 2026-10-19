import type { ProjectWorkflow } from '../projects/types';

export const TRANSCRIPT_SEGMENT_MAX_LENGTH: 4000;
export function validateTranscriptSegmentText(value: unknown, originalValue?: string): { valid: boolean; changed: boolean; text: string; error: string | null };
export function transcriptEditAccess(featureEnabled: boolean, workflow: ProjectWorkflow | undefined, revision: number | null, hasBackendSegmentId: boolean): { allowed: boolean; reason: string | null };
export function hasConfirmedDownstreamArtifact(workflow: ProjectWorkflow | undefined): boolean;
