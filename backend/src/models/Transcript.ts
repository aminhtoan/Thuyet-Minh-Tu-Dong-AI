import { model, Schema, type InferSchemaType } from 'mongoose';
import { CONTENT_STATUSES } from '../constants/project.constants.js';

const transcriptSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true, index: true },
    languageCode: { type: String, required: true, trim: true, lowercase: true },
    fullText: { type: String, required: true, default: '' },
    status: { type: String, enum: CONTENT_STATUSES, required: true, default: 'READY' },
  },
  { timestamps: true },
);

export type TranscriptDocument = InferSchemaType<typeof transcriptSchema>;
export const Transcript = model<TranscriptDocument>('Transcript', transcriptSchema);
