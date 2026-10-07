import { model, Schema, type InferSchemaType } from 'mongoose';
import { PROJECT_STATUSES } from '../constants/project.constants.js';

const projectSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    sourceLanguage: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: PROJECT_STATUSES, required: true, default: 'DRAFT', index: true },
    progress: { type: Number, required: true, default: 0, min: 0, max: 100 },
  },
  { timestamps: true },
);

projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ userId: 1, status: 1, createdAt: -1 });

export type ProjectDocument = InferSchemaType<typeof projectSchema>;
export const Project = model<ProjectDocument>('Project', projectSchema);
