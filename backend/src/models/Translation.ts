import { model, Schema, type InferSchemaType } from 'mongoose';
import { CONTENT_STATUSES } from '../constants/project.constants.js';

const translationSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    transcriptId: { type: Schema.Types.ObjectId, ref: 'Transcript', required: true, index: true },
    sourceLanguage: { type: String, required: true, trim: true, lowercase: true },
    targetLanguage: { type: String, required: true, trim: true, lowercase: true },
    fullText: { type: String, required: true, trim: true },
    status: { type: String, enum: CONTENT_STATUSES, required: true, default: 'READY' },
  },
  { timestamps: true },
);

translationSchema.index({ transcriptId: 1, targetLanguage: 1 }, { unique: true });

export type TranslationDocument = InferSchemaType<typeof translationSchema>;
export const Translation = model<TranslationDocument>('Translation', translationSchema);
