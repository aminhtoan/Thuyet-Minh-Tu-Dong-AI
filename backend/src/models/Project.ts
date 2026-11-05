import { model, Schema, type InferSchemaType } from 'mongoose';
import { PROJECT_STATUSES } from '../constants/project.constants.js';
import { SOURCE_LANGUAGE_MODES, SOURCE_LANGUAGE_STATUSES } from '../services/source-language-contract.js';

const projectSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    // No mode default: old records remain MANUAL without a migration.
    sourceLanguageMode: { type: String, enum: SOURCE_LANGUAGE_MODES },
    sourceLanguage: { type: String, trim: true, lowercase: true,
      required: function (this: { get: (field: string) => unknown }) { return this.get('sourceLanguageMode') !== 'AUTO' || this.get('sourceLanguageStatus') === 'CONFIRMED'; } },
    detectedSourceLanguage: { type: String, enum: ['vi', 'en', 'ja', 'ko', 'zh', null] },
    sourceLanguageStatus: { type: String, enum: SOURCE_LANGUAGE_STATUSES },
    status: { type: String, enum: PROJECT_STATUSES, required: true, default: 'DRAFT', index: true },
    progress: { type: Number, required: true, default: 0, min: 0, max: 100 },
  },
  { timestamps: true },
);

projectSchema.pre('validate', function () {
  const mode = this.sourceLanguageMode ?? 'MANUAL';
  if ((!this.sourceLanguage && mode !== 'AUTO') || ['auto', 'unknown'].includes(this.sourceLanguage ?? '')) {
    this.invalidate('sourceLanguage', 'A real source language is required for MANUAL mode.');
  }
  if (this.sourceLanguageStatus === 'CONFIRMED' && !this.sourceLanguage) this.invalidate('sourceLanguageStatus', 'Confirmed source language is required.');
  if (mode === 'AUTO' && !this.sourceLanguageStatus) this.invalidate('sourceLanguageStatus', 'AUTO requires an explicit source status.');
  if (mode === 'AUTO' && this.sourceLanguageStatus !== 'CONFIRMED' && this.sourceLanguage) this.invalidate('sourceLanguage', 'Unconfirmed AUTO source must remain unset.');
});

projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ userId: 1, status: 1, createdAt: -1 });

export type ProjectDocument = InferSchemaType<typeof projectSchema>;
export const Project = model<ProjectDocument>('Project', projectSchema);
