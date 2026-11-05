import { model, Schema, type InferSchemaType } from 'mongoose';
import { CONTENT_STATUSES } from '../constants/project.constants.js';
import { SOURCE_LANGUAGE_STATUSES } from '../services/source-language-contract.js';

const transcriptSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true, index: true },
    languageCode: { type: String, trim: true, lowercase: true,
      required: function (this: { get: (field: string) => unknown }) { return this.get('sourceLanguageStatus') !== 'NEEDS_CONFIRMATION'; } },
    sourceLanguageStatus: { type: String, enum: SOURCE_LANGUAGE_STATUSES },
    fullText: { type: String, required: true, default: '' },
    status: { type: String, enum: CONTENT_STATUSES, required: true, default: 'READY' },
    // Optional for backward compatibility. New content writes initialize this to 1;
    // later text edits must use it as an atomic compare-and-set precondition.
    revision: { type: Number, min: 1, validate: Number.isInteger },
  },
  { timestamps: true },
);

transcriptSchema.pre('validate', function () {
  if ((!this.languageCode && this.sourceLanguageStatus !== 'NEEDS_CONFIRMATION') || ['auto', 'unknown'].includes(this.languageCode ?? '')) {
    this.invalidate('languageCode', 'A real language or explicit NEEDS_CONFIRMATION status is required.');
  }
});

export type TranscriptDocument = InferSchemaType<typeof transcriptSchema>;
export const Transcript = model<TranscriptDocument>('Transcript', transcriptSchema);
