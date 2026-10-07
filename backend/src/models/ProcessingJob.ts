import { model, Schema, type InferSchemaType } from 'mongoose';
import { PROCESSING_JOB_STATUSES, PROCESSING_JOB_TYPES } from '../constants/processing-job.constants.js';

const processingJobSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    type: { type: String, enum: PROCESSING_JOB_TYPES, required: true },
    targetLanguage: { type: String, trim: true, lowercase: true },
    voiceId: { type: Schema.Types.ObjectId, ref: 'Voice' },
    narrationId: { type: Schema.Types.ObjectId, ref: 'Narration' },
    status: { type: String, enum: PROCESSING_JOB_STATUSES, required: true, default: 'QUEUED', index: true },
    progress: { type: Number, required: true, default: 0, min: 0, max: 100 },
    errorMessage: { type: String, trim: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

processingJobSchema.index({ projectId: 1, createdAt: -1 });
processingJobSchema.index({ status: 1, type: 1, createdAt: -1 });
processingJobSchema.index(
  { projectId: 1, type: 1, targetLanguage: 1, status: 1 },
  { unique: true, partialFilterExpression: { type: 'TRANSLATION', status: 'PROCESSING' } },
);
processingJobSchema.index(
  { projectId: 1, type: 1, narrationId: 1, status: 1 },
  { unique: true, partialFilterExpression: { type: 'VIDEO_PROCESSING', status: 'PROCESSING' } },
);
processingJobSchema.index(
  { projectId: 1, type: 1, targetLanguage: 1, voiceId: 1, status: 1 },
  { unique: true, partialFilterExpression: { type: 'TTS', status: 'PROCESSING' } },
);

export type ProcessingJobDocument = InferSchemaType<typeof processingJobSchema>;
export const ProcessingJob = model<ProcessingJobDocument>('ProcessingJob', processingJobSchema);
