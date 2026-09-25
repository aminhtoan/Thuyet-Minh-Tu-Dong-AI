import type { Project } from '../projects/types';
import type { Transcript } from '../transcript/types';
import type { Translation } from '../translation/types';
import type { NarrationConfig, Voice } from '../voice/types';

export type ProcessingStatus = 'WAITING' | 'STARTING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type StageStatus = 'WAITING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type StageId = 'upload' | 'transcript' | 'translation' | 'voice' | 'narration' | 'media';
export type FailureStage = 'start' | 'narration' | 'media';
export type ProcessingStage = {
  id: StageId;
  title: string;
  status: StageStatus;
  progress?: number;
  description?: string;
};
export type ProcessingSnapshot = {
  projectId: string;
  runId: string | null;
  status: ProcessingStatus;
  stages: ProcessingStage[];
  progress: number;
  currentStage: 'narration' | 'media' | null;
  message: string;
  error: { stage: FailureStage; message: string } | null;
  startedAt: string | null;
  completedAt: string | null;
};
export type GenerationContext = {
  project: Project;
  transcript: Transcript;
  translation: Translation;
  config: NarrationConfig;
  voice: Voice;
};
export type RunOptions = { failAt?: FailureStage | null };
export type ProcessingSession = {
  getStatus: () => ProcessingSnapshot;
  start: (options?: RunOptions) => Promise<void>;
  retry: (options?: RunOptions) => Promise<void>;
  cancel: () => void;
  dispose: () => void;
};
