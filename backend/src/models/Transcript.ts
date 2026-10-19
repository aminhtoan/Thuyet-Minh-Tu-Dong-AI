import { model, Schema, type InferSchemaType } from 'mongoose';
import { CONTENT_STATUSES } from '../constants/project.constants.js';

const transcriptSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true, index: true },
    languageCode: { type: String, required: true, trim: true, lowercase: true },
    fullText: { type: String, required: true, default: '' },
    status: { type: String, enum: CONTENT_STATUSES, required: true, default: 'READY' },
    // Optional for backward compatibility. New content writes initialize this to 1;
    // later text edits must use it as an atomic compare-and-set precondition.
    revision: { type: Number, min: 1, validate: Number.isInteger },
  },
  { timestamps: true },
);

export type TranscriptDocument = InferSchemaType<typeof transcriptSchema>;
export const Transcript = model<TranscriptDocument>('Transcript', transcriptSchema);
